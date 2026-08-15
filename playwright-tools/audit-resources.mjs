import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("test-results", "resource-audit");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const pages = [
  {
    name: "guides",
    url: "http://127.0.0.1:5500/guides.html",
    cardSelector: ".resource-card-grid > a",
    articleSelector: ".resource-article",
    expected: 6,
    jumpLink: 'a[href="#buffering"]',
    jumpTarget: "#buffering"
  },
  {
    name: "setup",
    url: "http://127.0.0.1:5500/setup.html",
    cardSelector: ".setup-device-grid > a",
    articleSelector: ".setup-guide",
    expected: 6,
    jumpLink: 'a[href="#smart-tv"]',
    jumpTarget: "#smart-tv"
  }
];

for (const [viewportName, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
]) {
  for (const config of pages) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_NETWORK_ACCESS_DENIED") && !message.text().includes("404")) {
        errors.push(message.text());
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().endsWith("/favicon.ico")) errors.push(`${res.status()} ${res.url()}`);
    });

    const response = await page.goto(config.url, { waitUntil: "load" });
    if (!response?.ok()) throw new Error(`${config.name}/${viewportName}: page did not load`);

    const audit = await page.evaluate(({ cardSelector, articleSelector }) => ({
      title: document.title,
      cards: document.querySelectorAll(cardSelector).length,
      articles: document.querySelectorAll(articleSelector).length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      h1Visible: document.querySelector("h1")?.getBoundingClientRect().height > 0,
      resellerText: document.body.innerText.toLowerCase().includes("reseller")
    }), config);

    if (audit.cards !== config.expected || audit.articles !== config.expected) {
      throw new Error(`${config.name}/${viewportName}: expected ${config.expected} cards and articles, got ${audit.cards}/${audit.articles}`);
    }
    if (audit.scrollWidth > audit.clientWidth) throw new Error(`${config.name}/${viewportName}: horizontal overflow`);
    if (!audit.h1Visible) throw new Error(`${config.name}/${viewportName}: heading is hidden`);
    if (audit.resellerText) throw new Error(`${config.name}/${viewportName}: reseller material is present`);
    if (errors.length) throw new Error(`${config.name}/${viewportName}: ${errors.join(" | ")}`);

    await page.locator(config.jumpLink).first().click();
    await page.waitForTimeout(900);
    const targetTop = await page.locator(config.jumpTarget).evaluate((element) => element.getBoundingClientRect().top);
    if (targetTop < 0 || targetTop > viewport.height) throw new Error(`${config.name}/${viewportName}: anchor did not reveal its target`);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(outputDir, `${config.name}-${viewportName}-full.png`),
      fullPage: true
    });
    console.log(`${config.name}/${viewportName}: ${JSON.stringify(audit)}`);
    await context.close();
  }
}

await browser.close();
