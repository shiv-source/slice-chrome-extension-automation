import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
puppeteer.use(StealthPlugin());

const baseUrl = `https://www.google.com/search?q=`;
const welcomePage = 'https://addslice.com/install';
const keywords = fs.readFileSync(path.join('Trending_Keywords.txt'), 'utf-8').split('\n');

const getRandomKeyword = () => {
    const randomIndex = Math.floor(Math.random() * keywords.length);
    return keywords[randomIndex];
};

const randomDelay = async (minTime = 5000, maxTime = 10000) => {
    const time = Math.random() * (maxTime - minTime) + minTime;
    await new Promise((resolve) => setTimeout(resolve, time));
};

const randomTime = async (minTime = 1000, maxTime = 3000) => {
    const time = Math.random() * (maxTime - minTime) + minTime;
    return time;
};

(async () => {
    const pathToExtension = process.env.SLICE_EXTENSION_PATH;
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: process.env.chrome,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-accelerated-video-decode',
            '--enable-features=PreloadMediaEngagementData,AutoplayIgnoreWebAudio,MediaEngagementBypassAutoplayPolicies',
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ],
    });

    let pages = await browser.pages();
    await Promise.all(
        pages.map((page) => {
            if (page.url().includes(welcomePage)) {
                // Customize this check based on the URL or page title
                return page.close(); // Close the unwanted page
            }
            return Promise.resolve();
        }),
    );

    const page = await browser.newPage();
    await page.setUserAgent(process.env.USER_AGENT);
    await page.setBypassCSP(true);
    await page.goto(baseUrl + getRandomKeyword(), { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1080, height: 1024 });
    await runInLoop(page, +process.env.TOTAL_DURATION);
    await browser.close();
})();

const runInLoop = async (page, durationInMinutes = 30) => {
    const durationInMilliseconds = durationInMinutes * 60 * 1000;
    const startTime = Date.now();
    const endTime = startTime + durationInMilliseconds;

    while (endTime > Date.now()) {
        const textareaSelector = await page.waitForSelector('textarea');
        await textareaSelector.click();
        await page.keyboard.down('Control');
        await textareaSelector.press('KeyA');
        await page.keyboard.up('Control');
        const textLength = await textareaSelector.evaluate((el) => el.value.length);
        if (textLength) {
            for (let i = 0; i < textLength; i++) {
                await textareaSelector.press('Backspace', { delay: 50 });
            }
        }
        await textareaSelector.type(getRandomKeyword(), { delay: 100 });
        await textareaSelector.press('Enter');
        await randomDelay(1000, 3000);
        await scrollDown(page);
        await randomDelay(10000, 15000);
        await page.reload();
    }
};

const scrollDown = async (page) => {
    const time = await randomTime(200, 500);
    await page.evaluate((time) => {
        return new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, time);
        });
    }, time);
};
