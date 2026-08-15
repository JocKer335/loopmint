import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("test-results", "simplified-audit");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const targets = [
  ["hero", ".hero"],
  ["stats", "#stat-band"],
  ["content", "#content"],
  ["devices", ".split-showcase"],
  ["trial-options", "#trial-options"],
  ["supported-devices", "#devices"],
  ["setup", "#setup"],
  ["reviews", "#reviews"],
  ["pricing", "#pricing"],
  ["guides", "#guides"],
  ["faq", "#faq"]
];

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("ERR_NETWORK_ACCESS_DENIED")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://127.0.0.1:5500/", { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const audit = await page.evaluate(() => {
    const visible = (selector) => {
      const element = document.querySelector(selector);
      return Boolean(element && getComputedStyle(element).display !== "none" && element.getBoundingClientRect().height > 0);
    };
    const top = (selector) => Math.round(document.querySelector(selector)?.getBoundingClientRect().top + scrollY || -1);
    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      pageHeight: document.documentElement.scrollHeight,
      heroTop: top(".hero"),
      statsTop: top("#stat-band"),
      contentTop: top("#content"),
      trialOptionsTop: top("#trial-options"),
      supportedDevicesTop: top("#devices"),
      filmVisible: visible("#scroll-cinema"),
      securityVisible: visible(".security-section"),
      guidesVisible: visible("#guides"),
      supportedDeviceCards: document.querySelectorAll("#devices .supported-device-card").length,
      guideCards: document.querySelectorAll("#guides .guide-card").length,
      deviceSelectRequired: document.querySelector("#trial-device")?.required || false,
      visiblePriceCards: [...document.querySelectorAll(".price-card")].filter((el) => getComputedStyle(el).display !== "none").length,
      feedbackCards: document.querySelectorAll(".feedback-grid article").length,
      faqItems: document.querySelectorAll("#faq details").length,
      logoMarquees: [...document.querySelectorAll(".logo-marquee-block")].map((marquee) => ({
        label: marquee.querySelector(".logo-marquee-viewport")?.getAttribute("aria-label"),
        cards: marquee.querySelector(".logo-marquee-group:not([aria-hidden='true'])")?.children.length || 0
      }))
      ,heroPanel: (() => {
        const panel = document.querySelector(".hero-video");
        const style = panel ? getComputedStyle(panel) : null;
        const rect = panel?.getBoundingClientRect();
        return panel && style && rect ? { display: style.display, opacity: style.opacity, width: Math.round(rect.width), height: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y) } : null;
      })()
      ,heroVideo: (() => {
        const video = document.querySelector(".hero-nature-video");
        return video ? { src: video.currentSrc.split("/").pop(), paused: video.paused, readyState: video.readyState, currentTime: Number(video.currentTime.toFixed(2)) } : null;
      })()
    };
  });

  if (audit.scrollWidth > audit.clientWidth) throw new Error(`${name}: horizontal overflow ${audit.scrollWidth}/${audit.clientWidth}`);
  if (!(audit.heroTop < audit.statsTop && audit.statsTop < audit.contentTop)) throw new Error(`${name}: incorrect top section order`);
  if (audit.filmVisible || audit.securityVisible) throw new Error(`${name}: removed section is still visible`);
  if (!audit.guidesVisible || audit.supportedDeviceCards !== 6 || audit.guideCards !== 6 || !audit.deviceSelectRequired) {
    throw new Error(`${name}: trial, device, or guide journey is incomplete`);
  }
  if (audit.visiblePriceCards !== 4 || audit.feedbackCards !== 3 || audit.faqItems < 5) throw new Error(`${name}: required content is missing`);
  const expectedMarquees = [
    { label: "Channels and services, first row", cards: 8 },
    { label: "Channels and services, second row", cards: 8 },
    { label: "Supported IPTV players", cards: 31 }
  ];
  if (JSON.stringify(audit.logoMarquees) !== JSON.stringify(expectedMarquees)) {
    throw new Error(`${name}: channel and player rails are not separated correctly: ${JSON.stringify(audit.logoMarquees)}`);
  }
  if (!audit.heroVideo || audit.heroVideo.readyState < 2 || audit.heroVideo.paused || audit.heroVideo.currentTime <= 0) throw new Error(`${name}: hero video is not playing`);
  const expectedVideo = name === "mobile" ? "loopmint-irish-hero-mobile.mp4" : "loopmint-irish-hero-desktop.mp4";
  if (audit.heroVideo.src !== expectedVideo) throw new Error(`${name}: wrong responsive hero video ${audit.heroVideo.src}`);
  if (errors.length) throw new Error(`${name}: browser errors: ${errors.join(" | ")}`);

  for (const scrollTarget of [1800, 5200, audit.pageHeight - viewport.height]) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollTarget);
    await page.waitForTimeout(120);
    const headerState = await page.locator("#site-header").evaluate((header) => ({
      hidden: header.classList.contains("is-hidden"),
      top: Math.round(header.getBoundingClientRect().top),
      position: getComputedStyle(header).position
    }));
    if (headerState.hidden || headerState.top !== 0 || headerState.position !== "fixed") {
      throw new Error(`${name}: header does not stay visible at scroll ${scrollTarget}: ${JSON.stringify(headerState)}`);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.locator('[data-feature="films"]').click();
  await page.waitForTimeout(220);
  if (!(await page.locator("#feature-display").textContent()).includes("CINEMA")) throw new Error(`${name}: content tabs do not update`);

  await page.locator(".hero-primary-btn").click();
  if (!(await page.locator("#trial-modal").evaluate((el) => el.classList.contains("open")))) throw new Error(`${name}: trial form does not open`);
  await page.locator("#btn-submit-trial").click();
  if (!(await page.locator("#trial-modal").evaluate((el) => el.classList.contains("open")))) throw new Error(`${name}: incomplete trial form was submitted`);
  await page.locator("#trial-first-name").fill("Test Customer");
  await page.locator("#trial-whatsapp").fill("870000000");
  await page.locator("#trial-device").selectOption({ label: "Fire TV device" });
  await page.evaluate(() => {
    window.__trialRequestUrl = "";
    window.__loopmintCaptureWhatsApp = (url) => {
      window.__trialRequestUrl = String(url);
    };
  });
  await page.locator("#btn-submit-trial").click();
  const trialRequestUrl = decodeURIComponent(await page.evaluate(() => window.__trialRequestUrl));
  if (!trialRequestUrl.includes("Device: Fire TV device") || !trialRequestUrl.includes("WhatsApp: +353870000000")) {
    throw new Error(`${name}: trial request is missing the device or correct dialing code: ${trialRequestUrl}`);
  }

  await page.locator(".price-card button").first().click();
  if (!(await page.locator("#checkout-modal").evaluate((el) => el.classList.contains("open")))) throw new Error(`${name}: checkout does not open`);
  await page.keyboard.press("Escape");

  await page.screenshot({ path: path.join(outputDir, `${name}-full.png`), fullPage: true });
  for (const [sectionName, selector] of targets) {
    await page.locator(selector).first().screenshot({ path: path.join(outputDir, `${name}-${sectionName}.png`) });
  }

  console.log(`${name}: ${JSON.stringify(audit)}`);
  await context.close();
}

await browser.close();
