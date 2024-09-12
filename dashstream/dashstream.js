const puppeteer = require("puppeteer");
const { PassThrough } = require("stream");
const { spawn } = require('child_process');
const { setTimeout } = require('timers/promises');
const { readFileSync } = require('fs');

const config = JSON.parse(readFileSync('/data/options.json'));

var streams = {};

(async () => {
	// Start the media server
	var server_cp = spawn('/mediamtx');
	
	// Output from the RTSP server
	/*server_cp.stdout.on("data", data => {
		console.log(`mediamtx: ${data}`);
	});*/

	server_cp.stderr.on("data", data => {
		console.log(`mediamtx stderr: ${data}`);
	});

	server_cp.on("error", error => {
		console.log(`mediamtx error: ${error.message}`);
	});
	
	// Create the browser
	var browser = await puppeteer.launch({
		headless: true,
		defaultViewport: {
			width:1920,
			height:1080
		},
		executablePath: '/usr/bin/chromium-browser',
		args: [
			'--no-sandbox',
			'--headless',
			'--disable-gpu',
			'--disable-dev-shm-usage',
			'--ignore-certificate-errors'
		]
	});
	
	async function authIfRequired(page) {
		if(page.url().includes('auth/authorize')) {
			console.log("Authorizing")
			await page.locator('input[name="username"]').fill(config.username);
			await page.locator('input[name="password"]').fill(config.password);
			await page.locator('mwc-button').click();
			await page.waitForNavigation({ timeout: 0, waitUntil: 'networkidle0' });
			console.log("Done authorizing, now at ",page.url());
		}
	}
	
	for(const dashboard of config.dashboards) {
		var dash_url = config.local_base_url.replace(/\/+$/, '') + "/" + dashboard.dash_url.replace(/\/+$/, '').replace(/^\/+/, '');
		if(streams.hasOwnProperty(dashboard.dash_stream)) {
			streams[dashboard.dash_stream].urls.push(dash_url);
		}
		else {
			var page = await browser.newPage();
			streams[dashboard.dash_stream] = {
				urls: [dash_url],
				current_url: 0,
				ms_since_urlrotation: 0,
				page: page
			}
			
			await streams[dashboard.dash_stream].page.emulateTimezone(config.timezone);
			await streams[dashboard.dash_stream].page.goto(dash_url, {timeout: 0, waitUntil: 'networkidle0'});
			await authIfRequired(streams[dashboard.dash_stream].page);
		}
	}
	
	async function setupStream(stream) {
		streams[stream].ffmpeg_cp = spawn('ffmpeg',[
			'-r', 1/5,
			'-f', 'image2pipe',
			'-i', 'async:pipe:0',
			'-video_size', '1920x1080',
			'-b:v', '300k',
			'-c:v', 'libx264',
			'-r', 12,
			'-pix_fmt', 'yuv420p',
			'-preset', 'ultrafast',
			'-f', 'rtsp',
			'rtsp://127.0.0.1:8554/dashstream' + stream
		]);
		
		streams[stream].ffmpeg_cp.stdout.on("data", data => {
			console.log(`stdout dashstream${stream}: ${data}`);
		});

		/*streams[stream].ffmpeg_cp.stderr.on("data", data => {
			console.log(`stderr dashstream${stream}: ${data}`);
		});*/
			
		streams[stream].ffmpeg_cp.on('close', (code) => { delete streams[stream].ffmpeg_cp });
		streams[stream].ffmpeg_cp.on('exit', (code) => { delete streams[stream].ffmpeg_cp });
	
		if(streams[stream].image_stream) {
			streams[stream].image_stream.end();
		}
		
		streams[stream].image_stream = new PassThrough();
		streams[stream].image_stream.pipe(streams[stream].ffmpeg_cp.stdin);
	}
	
	async function recorderLoop(stream) {
		if(!streams[stream].ffmpeg_cp) {
			await setupStream(stream);
		}
		
		await authIfRequired(streams[stream].page);
				
		// Rotate dash if needed, otherwise refresh
		if(streams[stream].ms_since_urlrotation >= (config.rotation_every * 1000)) {
			if(streams[stream].urls.length > 1) {	
				if(streams[stream].current_url == streams[stream].urls.length - 1) {
					streams[stream].current_url = 0;
				}
				else {
					streams[stream].current_url++;
				}
				await streams[stream].page.goto(streams[stream].urls[streams[stream].current_url], {timeout: 0, waitUntil: 'networkidle0'});
				streams[stream].ms_since_urlrotation = 0;
			}
			else {
				await streams[stream].page.reload({timeout: 0, waitUntil: 'networkidle0'});
			}
		}
		
		var screenshot_data = await streams[stream].page.screenshot({ quality: 100, type: 'jpeg', encoding: 'binary' });
		streams[stream].image_stream.write(screenshot_data);
		
		streams[stream].ms_since_urlrotation += 5000;
	}
	
	console.log("Starting capturing process");
	for(const [stream, value] of Object.entries(streams)) {
		recorderLoop(stream);
		setInterval(recorderLoop, 5000, stream); // Record a new snapshot every 5 seconds
	}
})();