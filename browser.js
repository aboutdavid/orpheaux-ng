
(async () => {
  require('dotenv').config()

  const puppeteer = require("puppeteer-core").default
  const fs = require("fs")
  const express = require('express')
  const { execSync } = require("node:child_process")
  const { createClient } = require("redis");
  const utils = require("./utils.js")

  const client = await createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`

  })
    .on('error', err => console.log('Redis Client Error', err))
    .connect();
  const app = express()
  console.log("[browser] [Info] Launching Brower")
  var bopts = {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${__dirname}/.stream.wav`,
      '--allow-file-access',
    ],
    headless: false,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || "/chrome/chrome",
    ignoreDefaultArgs: ['--mute-audio'],
    userDataDir: process.env.CHROME_DATA_DIR || "./data"
  }

  if (process.env.CHROME_ON_SERVER) {
    console.log("Running on a server.")
    bopts.args.push("'--no-sandbox")
    bopts.args.push("--disable-setuid-sandbox")
    bopts.headless = true
  }
  if (process.env.CHROME_DATA_DIR) {
    if (fs.existsSync(`${process.env.CHROME_DATA_DIR}/SingletonLock`)) {
      console.log("SingletonLock exists. Deleting.")
      fs.rmSync(`${process.env.CHROME_DATA_DIR}/SingletonLock`)
    }
    bopts.userDataDir = process.env.CHROME_DATA_DIR || "./data"
  }
  await client.set('queue', "[]");
  if (await client.exists("currentChannel")) await client.del('currentChannel');
  await client.set('songEnd', 0);
  global.clearId = 0
  const browser = await puppeteer.launch(bopts);

  if (fs.existsSync(`${__dirname}/.stream.wav`)) fs.rmSync(`${__dirname}/.stream.wav`)
  console.log("[browser] [Info] Logging in.")
  const page = await browser.newPage();
  if (process.env.CHROME_DATA_DIR) {
    await Promise.all([
      page.waitForNavigation(),
      page.click("#signin_btn"),
      page.waitForNavigation(),
    ]);
    await page.goto(`https://${process.env.SLACK_ORG}.slack.com/sign_in_with_password`);
    await page.type('#email', process.env.SLACK_EMAIL);
    await page.type('#password', process.env.SLACK_PASSWORD);
    await Promise.all([
      page.waitForNavigation(),
      page.click("#signin_btn"),
      page.waitForNavigation(),
    ]);
  }
  const page2 = await browser.newPage()
  if (process.env.CHROME_DATA_DIR) await page.close()

  async function quitNow() {
    await client.del("currentChannel")
    try {
      clearTimeout(global.clearId)
    } catch (e) { }
    try {
      await page2.waitForSelector("#huddle_mini_player_leave_button", { visible: true, timeout: 2000 })
    } catch (e) { }
    try {
      await page2.click(`#huddle_mini_player_leave_button`)
    } catch (e) { }
  }
  async function loadSong(channel, cb) {
    const event = await utils.ongoingEvent(channel)
    const rightChannel = await utils.isCalendarChannel(channel)
    if (event && !rightChannel) return cb({ success: false, error: "Another channel has already booked Orpheaux." })
    console.log(await client.get("currentChannel"))
    if (!event && await client.exists("currentChannel") && await client.get("currentChannel") != channel) return cb({ success: false, error: "A channel is already using Orpheaux." })
    if (!event) await client.set("currentChannel", channel)
    if (page2.url() != `https://app.slack.com/client/${process.env.SLACK_ID}/${channel}`) await page2.goto(`https://app.slack.com/client/${process.env.SLACK_ID}/${channel}`)
    try {
      await page2.click(`#huddle_mini_player_leave_button`)
    } catch (e) {

    }
    await page2.waitForSelector('[data-qa="huddle_channel_header_button__start_button"]', { visible: true })
    console.log("[browser] [Info] Reloading song and joining huddle.")
    await page2.click(`[data-qa="huddle_channel_header_button__start_button"]`)
    cb({ success: true })
  }
  async function setQuit() {
    try {
      clearTimeout(global.clearId)
    } catch (e) {

    }
    var id = setTimeout(async function () {
      try {
        await page2.waitForSelector("#huddle_mini_player_leave_button", { visible: true, timeout: 2000 })
      } catch (e) { }
      try {
        await page2.click(`#huddle_mini_player_leave_button`)
      } catch (e) { }
    }, await client.get("songEnd"))
    global.clearId = id
  }


  app.post('/stop', async (req, res) => {
    await quitNow()
    res.json({ success: true })
  })
  app.post('/play', async (req, res) => {
    const { file, channel } = req.query
    console.log(`[stream] [info] Playing ${file}`)
    if (fs.existsSync(`${__dirname}/.stream.wav`)) fs.rmSync(`${__dirname}/.stream.wav`)
    fs.copyFileSync(`${file}`, `${__dirname}/.stream.wav`)
    await client.set("songEnd", parseInt(execSync(`mediainfo --Inform="Audio;%Duration%" .stream.wav`).toString().replaceAll("\n", "").trim()))
    await loadSong(channel, function (json) {
      res.json(json)
    })
    await setQuit()
  })
  app.listen(process.env.BROWSER_PORT, () => {
    console.log(`Orpheaux-ng listening on port ${process.env.BROWSER_PORT}`)
  })
  process.on("SIGINT", async () => {
    try {
      await page2.click(`#huddle_mini_player_leave_button`)
    } catch (e) { }
    process.exit();
  });
})();

