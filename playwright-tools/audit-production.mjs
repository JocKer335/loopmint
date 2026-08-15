import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:5500/";
const pages = ["index.html", "guides.html", "setup.html"];
const viewports = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];

for (const [viewportName, viewport] of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });

  for (const pathname of pages) {
    const page = await context.newPage();
    const browserErrors = [];
    const failedResponses = [];

    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_NETWORK_ACCESS_DENIED")) {
        browserErrors.push(message.text());
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().endsWith("favicon.ico")) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(new URL(pathname, baseUrl).href, { waitUntil: "load" });
    await page.waitForTimeout(500);

    const audit = await page.evaluate(() => {
      const all = [...document.querySelectorAll("*")];
      const ids = all.map((element) => element.id).filter(Boolean);
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const localLinks = [...document.querySelectorAll("a[href]")]
        .map((link) => link.getAttribute("href"))
        .filter((href) => href && !href.startsWith("#") && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("tel:"));
      const missingAnchors = [...document.querySelectorAll('a[href^="#"]')]
        .map((link) => link.getAttribute("href"))
        .filter((href) => href && href !== "#" && !document.querySelector(href));
      const brokenMedia = [...document.querySelectorAll("img, video")]
        .filter((element) => element.tagName === "IMG" ? !element.complete || element.naturalWidth === 0 : element.readyState === 0)
        .map((element) => element.currentSrc || element.getAttribute("src"));
      const unlabeledFields = [...document.querySelectorAll("input:not([type='hidden']), select, textarea")]
        .filter((field) => !field.labels?.length && !field.getAttribute("aria-label") && !field.getAttribute("aria-labelledby"))
        .map((field) => field.id || field.name || field.outerHTML.slice(0, 80));
      const unnamedButtons = [...document.querySelectorAll("button")]
        .filter((button) => !button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title"))
        .map((button) => button.id || button.className || button.outerHTML.slice(0, 80));
      const headingLevels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) => Number(heading.tagName[1]));
      const headingSkips = headingLevels.filter((level, index) => index > 0 && level > headingLevels[index - 1] + 1);
      const mojibake = document.body.innerText.match(/(?:Ã.|Â.|â€|â€“|â€”|ðŸ|ï¸)/g) || [];
      const overflowElements = all
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2);
        })
        .slice(0, 10)
        .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).replaceAll(" ", ".")}`);

      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        duplicateIds,
        localLinks: [...new Set(localLinks)],
        missingAnchors: [...new Set(missingAnchors)],
        brokenMedia,
        unlabeledFields,
        unnamedButtons,
        headingSkips: headingSkips.length,
        mojibake: [...new Set(mojibake)],
        overflowElements,
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    const issues = [];
    for (const href of audit.localLinks) {
      const target = new URL(href, page.url());
      const fragment = target.hash.slice(1);
      target.hash = "";
      const linkResponse = await context.request.get(target.href);
      if (!linkResponse.ok()) failedResponses.push(`${linkResponse.status()} ${target.href}`);
      if (linkResponse.ok() && fragment) {
        const html = await linkResponse.text();
        const escapedFragment = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`id=["']${escapedFragment}["']`).test(html)) {
          issues.push(`missing cross-page anchor: ${href}`);
        }
      }
    }

    if (!response?.ok()) issues.push(`page HTTP ${response?.status() ?? "unknown"}`);
    if (audit.h1Count !== 1) issues.push(`${audit.h1Count} H1 elements`);
    if (audit.duplicateIds.length) issues.push(`duplicate IDs: ${audit.duplicateIds.join(", ")}`);
    if (audit.missingAnchors.length) issues.push(`missing anchors: ${audit.missingAnchors.join(", ")}`);
    if (audit.brokenMedia.length) issues.push(`broken media: ${audit.brokenMedia.join(", ")}`);
    if (audit.unlabeledFields.length) issues.push(`unlabeled fields: ${audit.unlabeledFields.join(", ")}`);
    if (audit.unnamedButtons.length) issues.push(`unnamed buttons: ${audit.unnamedButtons.join(", ")}`);
    if (audit.headingSkips) issues.push(`${audit.headingSkips} heading-level skips`);
    if (audit.mojibake.length) issues.push(`corrupted text markers: ${audit.mojibake.join(", ")}`);
    if (audit.documentOverflow) issues.push(`document overflow: ${audit.overflowElements.join(", ")}`);
    if (failedResponses.length) issues.push(`failed resources: ${[...new Set(failedResponses)].join(", ")}`);
    if (browserErrors.length) issues.push(`browser errors: ${[...new Set(browserErrors)].join(", ")}`);

    if (pathname === "index.html") {
      for (const y of [1500, 5000, 9000]) {
        await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), y);
        await page.waitForTimeout(100);
        const header = await page.locator("#site-header").evaluate((element) => ({
          top: Math.round(element.getBoundingClientRect().top),
          fixed: getComputedStyle(element).position === "fixed",
          visible: element.getBoundingClientRect().height > 0
        }));
        if (!header.fixed || !header.visible || header.top !== 0) issues.push(`header failed at ${y}px`);
      }

      await page.evaluate(() => window.scrollTo(0, 0));

      if (viewportName === "mobile") {
        await page.locator(".nav-toggle").click();
        const mobileNav = await page.locator(".nav-toggle").evaluate((button) => ({
          expanded: button.getAttribute("aria-expanded"),
          menuOpen: document.querySelector("[data-nav]")?.classList.contains("open")
        }));
        if (mobileNav.expanded !== "true" || !mobileNav.menuOpen) issues.push("mobile navigation did not open");
        await page.locator('[data-nav] a[href="#content"]').click();
        if (await page.locator("[data-nav]").evaluate((menu) => menu.classList.contains("open"))) {
          issues.push("mobile navigation did not close after selection");
        }
      }

      await page.locator(".hero-primary-btn").click();
      if (!(await page.locator("#trial-modal").evaluate((modal) => modal.classList.contains("open") && modal.getAttribute("aria-hidden") === "false"))) {
        issues.push("trial modal did not open");
      }
      await page.keyboard.press("Escape");
      if (await page.locator("#trial-modal").evaluate((modal) => modal.classList.contains("open"))) {
        issues.push("trial modal did not close with Escape");
      }

      const eurPlans = [
        ["3 Months", "€40"],
        ["6 Months", "€65"],
        ["1 Year", "€90"],
        ["2 Years + 1 Year Free", "€180"]
      ];
      await page.locator('#page-currency-switch [data-curr="EUR"]').click();
      for (let index = 0; index < eurPlans.length; index++) {
        await page.locator(".price-card button").nth(index).click();
        const [expectedPlan, expectedTotal] = eurPlans[index];
        const checkoutState = await page.locator("#checkout-modal").evaluate((modal) => ({
          open: modal.classList.contains("open"),
          activePlan: modal.querySelector(".plan-opt-card.active")?.dataset.plan,
          total: modal.querySelector("#sum-total-today")?.textContent.trim()
        }));
        if (!checkoutState.open || checkoutState.activePlan !== expectedPlan || checkoutState.total !== expectedTotal) {
          issues.push(`checkout mismatch for ${expectedPlan}: ${JSON.stringify(checkoutState)}`);
        }
        await page.keyboard.press("Escape");
      }

      await page.locator(".price-card button").first().click();
      await page.locator('#modal-currency-switch [data-curr="USD"]').click();
      if ((await page.locator("#sum-total-today").textContent())?.trim() !== "$45") issues.push("USD plan total mismatch");
      await page.locator("#btn-device-plus").click();
      if ((await page.locator("#sum-total-today").textContent())?.trim() !== "$76.50") issues.push("multi-screen discount total mismatch");

      const countryOptionCount = await page.locator("#co-country-picker .country-item").count();
      if (countryOptionCount < 240) issues.push(`country picker is incomplete: ${countryOptionCount} entries`);
      await page.locator("#co-country-picker .country-trigger-btn").click();
      await page.locator("#co-country-picker .country-search-input").fill("Netherlands");
      await page.locator('#co-country-picker .country-item[data-code="NL"]').click();
      const selectedCountry = await page.locator("#co-country-picker").evaluate((picker) => ({
        name: picker.querySelector(".curr-name")?.textContent.trim(),
        dial: picker.querySelector("input[type='hidden']")?.value
      }));
      if (selectedCountry.name !== "Netherlands" || selectedCountry.dial !== "+31") {
        issues.push(`country selection mismatch: ${JSON.stringify(selectedCountry)}`);
      }

      await page.evaluate(() => {
        window.__loopmintOpenedUrl = "";
        window.__loopmintCaptureWhatsApp = (url) => {
          window.__loopmintOpenedUrl = String(url);
        };
      });
      await page.locator("#btn-submit-whatsapp").click();
      if (await page.evaluate(() => window.__loopmintOpenedUrl)) issues.push("incomplete checkout was submitted");
      if (!(await page.locator("#co-first-name").evaluate((field) => field.classList.contains("input-error"))) ||
          !(await page.locator("#co-device").evaluate((field) => field.classList.contains("input-error")))) {
        issues.push("checkout required-field validation failed");
      }
      await page.locator("#co-first-name").fill("Audit");
      await page.locator("#co-whatsapp").fill("612345678");
      await page.locator("#co-device").selectOption({ label: "Smart television" });
      await page.locator('.payment-opt-card[data-pm="Revolut"]').click();
      if (!(await page.locator('.payment-opt-card[data-pm="Revolut"]').evaluate((card) => card.classList.contains("active")))) {
        issues.push("Revolut payment selection failed");
      }
      await page.locator("#btn-submit-whatsapp").click();
      const openedUrl = await page.evaluate(() => window.__loopmintOpenedUrl);
      const decodedOrder = decodeURIComponent(openedUrl);
      const expectedOrderDetails = [
        "Country: Netherlands (+31)",
        "WhatsApp: +31612345678",
        "Device: Smart television",
        "Plan: 3 Months",
        "Screens: 2",
        "Total shown: $76.50",
        "Payment preference: Revolut"
      ];
      if (!openedUrl.startsWith("https://wa.me/447597648884?text=") || expectedOrderDetails.some((detail) => !decodedOrder.includes(detail))) {
        issues.push("checkout WhatsApp handoff failed");
      }
      await page.keyboard.press("Escape");
    }

    const label = `${pathname}/${viewportName}`;
    if (issues.length) failures.push(`${label}: ${issues.join(" | ")}`);
    console.log(`${label}: ${issues.length ? issues.join(" | ") : "passed"}`);
    await page.close();
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(`\nProduction audit found ${failures.length} failing page/viewport combinations.`);
  process.exitCode = 1;
}
