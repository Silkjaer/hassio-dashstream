# Home Assistant Add-on: Dashstream

This add-on is made to exposes specific dashboards as RTSP streams, for the purpose of e.g. exposing them to Homekit via Scrypted.

## Experimental

This is only tested on a Raspberry Pi 5.

## Installation

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fsilkjaer%2Fhassio-dashstream)

OR

- Go to Settings > Add-ons > Add-on store
- Click the 3 dots in the upper right corner and click "Repositories"
- Copy/paste `https://github.com/silkjaer/hassio-dashstream` this and press "Add"

## Requirements

### User account

The add-on requires a user account. Create a user that is _not administrator_ and _enables local access only_. Default suggestion is `dashstream/dashstream`.

[![Open your Home Assistant instance and show your users.](https://my.home-assistant.io/badges/users.svg)](https://my.home-assistant.io/redirect/users/)

## Using the add-on

The add-on runs a [mediamtx](https://github.com/bluenviron/mediamtx) RTSP server and creates one or multiple streams, depending on your configuration. The default configuration will work for most, and create one stream of the energy dashboard.

The dashboards to stream are selected by changing the configuration for the add-on, which can be done in the configuration UI.

```
- dash_url: energy
  dash_stream: 1
- dash_url: dash/view1
  dash_stream: 2
- dash_url: dash/view2
  dash_stream: 2  
```

Every dashboard you include has to be assigned a dash_stream, which is an integer defining whether the dashboard has its own stream, or is rotated as a slideshow in one stream. Each stream is made available on `rtsp://localhost:8554/dashstream` followed by the number. So in this example there are two streams:

`rtsp://localhost:8554/dashstream1` is showing the energy dashboard and `rtsp://localhost:8554/dashstream2` is showing view1 and view2 of dash as a slideshow. 

Every 5 seconds a new screenshot is grabbed, and every 10 second it rotates if multiple dashboards are shown in the same stream. The rotation interval can be changed in the configuration.

## Tips

### Kiosk mode

By using Kiosk mode it is possible to remove the sidebar and header for specific users and specific dashboards.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?repository=kiosk-mode&owner=NemesisRE)

I use these settings for my dashboards:

```
kiosk_mode:
  kiosk: false
  user_settings:
    users:
      - dashstream
    kiosk: true
```

### Scrypted

I use [Scrypted](https://github.com/koush/scrypted/wiki/Installation:-Home-Assistant-OS) to expose my cameras to Homekit. 

After installing Scrypted you will have to install the RTSP plugin inside the Scrypted WebUI, add a RTSP camera and insert the link to the stream exposed by this add-on. You will have to create one camera per stream and then enable Homekit for the cameras individually.

### Dashboard theme

If you want to use themes for the dashboard, I recommend defining the theme for the dashboard in the view settings of the dashboard.