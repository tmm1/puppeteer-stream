// NOTICE: install ffmpeg first
// const { launch, getStream } = require("puppeteer-stream");
const { launch, getStream } = require("../dist/PuppeteerStream");
const fs = require("fs");
const { exec } = require("child_process");
const utils = require("../tests/_utils");

const viewport = {
	width: 1920,
	height: 1080,
};

async function test() {
	const browser = await launch({
		executablePath: utils.getExecutablePath(),
		defaultViewport: null, // no viewport emulation
		args: [
			"--disable-notifications",
			"--no-first-run",
			"--disable-infobars",
			"--hide-crash-restore-bubble",
			"--user-data-dir=./chromedata",
		],
		ignoreDefaultArgs: ["--enable-automation", "--disable-component-update"],
	});

	const page = await browser.newPage();
	//await page.goto("https://www.nbc.com/live?brand=nbc-news&callsign=nbcnews");
	await page.goto("https://www.nbc.com/live?brand=cnbc&callsign=cnbc");
	await page.waitForSelector("video");
	await page.waitForFunction(() => {
		let video = document.querySelector("video");
		return video.readyState === 4;
	});
	await page.evaluate(() => {
		let video = document.querySelector("video");
		//video.requestFullscreen();
		//document.querySelector("button[data-name=fullscreen]").click();
		video.style.position = "fixed";
		video.style.top = "0";
		video.style.left = "0";
		video.style.width = "100%";
		video.style.height = "100%";
		video.style.zIndex = "999000";
		video.style.background = "black";
		video.style.cursor = "none";
		video.play();
	});

	const session = await page.target().createCDPSession();
	const { windowId } = await session.send("Browser.getWindowForTarget");
	await session.send("Browser.setWindowBounds", {
		windowId,
		bounds: {
			height: viewport.height + 77,
			width: viewport.width,
		},
	});

	const stream = await getStream(page, {
		audio: true,
		video: true,
		frameSize: 1000,
		audioBitsPerSecond: 128000,
		videoBitsPerSecond: 5000000,
		videoConstraints: {
			mandatory: {
				minWidth: viewport.width,
				minHeight: viewport.height,
				minFrameRate: 60,
			},
		},
	});
	console.log("recording");
	// this will pipe the stream to ffmpeg and convert the webm to mkv format (which supports vp8/vp9)
	const ffmpeg = exec(`ffmpeg -y -i - -c copy output.mkv`);
	ffmpeg.stderr.on("data", (chunk) => {
		console.log(chunk.toString());
	});

	stream.pipe(ffmpeg.stdin);

	process.on("SIGINT", async () => {
		await stream.destroy();
		ffmpeg.kill("SIGINT");

		console.log("finished");
	});
}

test();
