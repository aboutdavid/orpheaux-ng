FROM node:20

RUN apt update
RUN apt install -y xz-utils \ 
    tar \
    bash \
    libnss3-dev \ 
    ffmpeg \
    libgdk-pixbuf2.0-dev \ 
    libgtk-3-dev \ 
    libxss-dev \ 
    libasound2 \ 
    mediainfo

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/bin/yt-dlp
RUN useradd -m runner

ADD --chown=runner:runner https://github.com/ungoogled-software/ungoogled-chromium-portablelinux/releases/download/124.0.6367.91-1/ungoogled-chromium_124.0.6367.91-1_linux.tar.xz /chrome.tar.xz
RUN mkdir /chrome && mkdir /chrome/data && tar -xf /chrome.tar.xz -C /chrome --strip-components=1 && rm /chrome.tar.xz
RUN chown -R runner:runner /chrome
RUN chown -R runner:runner /chrome/data
RUN chown -R runner:runner /usr/bin/yt-dlp
RUN chmod a+rx /usr/bin/yt-dlp
RUN echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/userns.conf
ADD --chown=runner:runner ./ /app
USER runner
RUN chmod -R 777 /chrome
RUN chmod -R 777 /chrome/data
WORKDIR /app
RUN npm install
ENTRYPOINT [ "npm", "start" ]
