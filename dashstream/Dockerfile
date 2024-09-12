ARG BUILD_FROM

FROM bluenviron/mediamtx:latest AS mtx

FROM $BUILD_FROM

ADD package.json /

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser 

RUN apk add --no-cache --update-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/main nodejs npm
RUN apk add --no-cache ffmpeg
RUN apk add --no-cache chromium
RUN apk add --no-cache tzdata

COPY dashstream.js /

COPY --from=mtx /mediamtx /
COPY /mediamtx.yml /
RUN chmod a+x /mediamtx

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
