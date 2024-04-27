const { clearTimeout } = require('timers');

(async () => {
  require('dotenv').config()

  const puppeteer = require("puppeteer-core").default
  const fs = require("fs")
  const express = require('express')
  const { execSync } = require("node:child_process")
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
    executablePath: process.env.CHROME_EXECUTABLE_PATH,
    ignoreDefaultArgs: ['--mute-audio'],
  }
  if (process.env.CHROME_ON_SERVER) { 
    bopts.args.push("'--no-sandbox") 
    bopts.args.push("--disable-setuid-sandbox")
    bopts.headless = true
  }
  const browser = await puppeteer.launch(bopts);


  global.endMs = 0
  global.clearId = 0

  if (fs.existsSync(`${__dirname}/.stream.wav`)) fs.rmSync(`${__dirname}/.stream.wav`)
  console.log("[browser] [Info] Logging in.")

  const page = await browser.newPage();
  await page.goto(`https://${process.env.SLACK_ORG}.slack.com/sign_in_with_password`);
  await page.type('#email', process.env.SLACK_EMAIL);
  await page.type('#password', process.env.SLACK_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click("#signin_btn"),
    page.waitForNavigation(),
  ]);
  const page2 = await browser.newPage()
  await page.close()

  async function quitNow() {
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
    global.clearId = setTimeout(async function () {
      try {
        await page2.waitForSelector("#huddle_mini_player_leave_button", { visible: true, timeout: 2000 })
      } catch (e) { }
      try {
        await page2.click(`#huddle_mini_player_leave_button`)
      } catch (e) { }
    }, global.endMs)

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
    global.endMs = parseInt(execSync(`mediainfo --Inform="Audio;%Duration%" .stream.wav`).toString().replaceAll("\n", "").trim())
    await loadSong(channel, function (json) {
      res.json(json)
    })
    await setQuit()
  })
  app.listen(process.env.API_PORT, () => {
    console.log(`Orpheaux-ng listening on port ${process.env.API_PORT}`)
  })
  process.on("SIGINT", async () => {
    try {
      await page2.click(`#huddle_mini_player_leave_button`)
    } catch (e) { }
    process.exit();
  });
})();

