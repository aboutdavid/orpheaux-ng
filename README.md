# Orpheaux-ng

A bot which can play YouTube music over Slack Huddles.

Orpheaux is very much in alpha. Now works on all platforms which can run Google Chromium, including [Nest](https://hackclub.app).

## Requirements:
- [node.js](https://nodejs.org/en)
- [ffmpeg](https://ffmpeg.org/)
- [mediainfo](https://mediaarea.net/en/MediaInfo/Download)

## Get started
```bash
# Clone this repo
git clone https://github.com/aboutdavid/orpheaux-ng

# Copy the config
cp .env.example .env

# Edit the config
nano .env

# Build the container
docker build --pull --rm -f "Dockerfile" -t aboutdavid/orpheaux-ng:latest "."

# Start the stack
docker compose up -d
```

## Structure
- `index.js` - Slack bot which downloads and converts YouTube videos
- `browser.js` - Connect to slack and plays music.