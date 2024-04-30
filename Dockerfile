FROM node:18

RUN apt update
RUN apt install -y xz-utils \ 
    tar \
    bash \
    libnss3-dev \ 
    libgdk-pixbuf2.0-dev \ 
    libgtk-3-dev \ 
    libxss-dev \ 
    libasound2 \ 
    yt-dlp \
    mediainfo

RUN useradd -m runner

ADD --chown=runner:runner https://github.com/ungoogled-software/ungoogled-chromium-portablelinux/releases/download/124.0.6367.91-1/ungoogled-chromium_124.0.6367.91-1_linux.tar.xz /chrome.tar.xz
RUN mkdir /chrome && tar -xf /chrome.tar.xz -C /chrome --strip-components=1 && rm /chrome.tar.xz
RUN chown runner:runner /chrome
RUN echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/userns.conf
ADD --chown=runner:runner ./ /app
USER runner
WORKDIR /app
RUN npm install
ENTRYPOINT [ "npm", "start" ]
