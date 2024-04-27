require('dotenv').config()
const { App } = require('@slack/bolt');
const fetch = require("node-fetch").default
const { execSync } = require("child_process")
const YTDlpWrap = require('yt-dlp-wrap').default;
const crypto = require("node:crypto");
const path = require("node:path")
const os = require("node:os")
const ytDlpWrap = new YTDlpWrap('/usr/bin/yt-dlp');
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});


app.command('/play', async ({ ack, command, respond, say, body }) => {


    await ack();
    if (!command.text) return await respond("Please provide a YouTube URL or Video ID.")
    const url = command.text.split(" ")[0].trim()

    var metadata
    try {
        metadata = await ytDlpWrap.getVideoInfo(
            url
        )
    } catch (e) {
        console.log(e)
        return await respond("Invalid video.")
    }

    const id = crypto.randomBytes(16).toString("hex");
    const tmpPath = path.resolve(os.tmpdir(), id)
    ytDlpWrap
        .exec([
            url,
            '-x',
            '--audio-format',
            'mp3',
            '-o',
            `${tmpPath}.mp3`,
        ]).on('close', async () => {
            execSync(`ffmpeg -i ${tmpPath}.mp3 -ar 44100 ${tmpPath}.wav`)

            try {
                var json = await (await fetch(`${process.env.API_BASE_URL}/play?${new URLSearchParams({ file: `${tmpPath}.wav`, channel: body.channel_id })}`, {
                    method: "POST"
                })).json()
                if (!json.success) return await respond(json.error)
            } catch (e) {
                await respond("Failed to query video. Please try again.")
            }
            await say({
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Now playing \`${metadata.title}\` by \`${metadata.channel}\`
Requested by: <@${command.user_id}>`
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "plain_text",
                                "text": `Video URL: ${metadata.original_url}`,
                                "emoji": true
                            }
                        ]
                    },
                ]
            })


        })
});

app.command('/stop', async ({ ack, respond, body }) => {
    await ack();
    var json = await (await fetch(`${process.env.API_BASE_URL}/stop`, {
        method: "POST"
    })).json()

    await say(json.success ? `Stopped playback.
Requested by <@${body.user_id}>` : json.error);
});


(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();