const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav]");
const cinema = document.querySelector(".scroll-cinema");
const cinemaChapters = [...document.querySelectorAll(".cinema-chapter")];
const cinemaProgress = document.querySelector(".cinema-progress span");
const scrollFrame = document.getElementById("scroll-frame");
const scrollFrameGhost = document.getElementById("scroll-frame-ghost");
const frameBadge = document.getElementById("frame-badge");

const frameFilms = [
  { label: "Film 01", folder: "film-01", count: 96 },
  { label: "Film 02", folder: "film-02", count: 96 },
  { label: "Film 03", folder: "film-03", count: 96 },
  { label: "Film 04", folder: "film-04", count: 144 },
  { label: "Film 05", folder: "film-05", count: 120 }
];
const frameCache = new Set();
let currentFrameSrc = "";

requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
});

const heroBackgroundVideo = document.querySelector(".hero-nature-video");
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  heroBackgroundVideo?.pause();
}

function createLogoMarquee(label, cards, direction = "left") {
  const section = document.createElement("section");
  section.className = "logo-marquee-block";

  const viewport = document.createElement("div");
  viewport.className = `logo-marquee-viewport marquee-${direction}`;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", label);

  const track = document.createElement("div");
  track.className = "logo-marquee-track";

  const group = document.createElement("div");
  group.className = "logo-marquee-group";
  cards.forEach((card) => group.appendChild(card));

  const clone = group.cloneNode(true);
  clone.classList.add("is-clone");
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll("img").forEach((image) => image.setAttribute("alt", ""));

  track.append(group, clone);
  viewport.appendChild(track);
  section.appendChild(viewport);
  return section;
}

const contentBoard = document.querySelector("#content .content-board");
if (contentBoard) {
  const cards = [...contentBoard.querySelectorAll(":scope > .cat-card")];
  const channelCards = cards.slice(0, 16);
  const playerCards = cards.slice(16);

  if (channelCards.length && playerCards.length) {
    contentBoard.classList.add("is-marquee-board");
    contentBoard.setAttribute("aria-label", "Channels, streaming services, and supported IPTV players");
    contentBoard.replaceChildren();

    const channelsHeader = document.createElement("div");
    channelsHeader.className = "marquee-section-heading";
    channelsHeader.innerHTML = "<span>Channels &amp; services</span><p>Live sport, television, films, and on-demand libraries.</p>";

    const playersHeader = document.createElement("div");
    playersHeader.className = "marquee-section-heading players-heading";
    playersHeader.innerHTML = "<span>Supported players</span><p>Popular IPTV apps for televisions, sticks, boxes, phones, and computers.</p>";

    contentBoard.append(
      channelsHeader,
      createLogoMarquee("Channels and services, first row", channelCards.slice(0, 8), "left"),
      createLogoMarquee("Channels and services, second row", channelCards.slice(8), "right"),
      playersHeader,
      createLogoMarquee("Supported IPTV players", playerCards, "left")
    );
  }
}

const heroSection = document.querySelector(".hero");
const channelStats = document.getElementById("stat-band");
if (heroSection && channelStats) {
  heroSection.insertAdjacentElement("afterend", channelStats);
}

let ticking = false;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const padFrame = (frame) => String(frame).padStart(3, "0");
const frameSrc = (film, frame) => `assets/frames/${film.folder}/frame-${padFrame(frame)}.jpg`;

function preloadFrame(src) {
  if (frameCache.has(src)) return;
  frameCache.add(src);
  const image = new Image();
  image.src = src;
}

if (cinema && !cinema.hidden) {
  frameFilms.forEach((film) => {
    for (let frame = 1; frame <= Math.min(10, film.count); frame += 1) {
      preloadFrame(frameSrc(film, frame));
    }
  });
}

function setScrollFrame(filmIndex, frameNumber) {
  const film = frameFilms[filmIndex];
  const src = frameSrc(film, frameNumber);
  if (!scrollFrame || src === currentFrameSrc) return;

  if (scrollFrameGhost) {
    scrollFrameGhost.src = currentFrameSrc || src;
    scrollFrameGhost.style.opacity = currentFrameSrc ? "1" : "0";
    window.setTimeout(() => {
      scrollFrameGhost.style.opacity = "0";
    }, 120);
  }

  scrollFrame.src = src;
  currentFrameSrc = src;

  if (frameBadge) {
    frameBadge.textContent = `${film.label} / Frame ${padFrame(frameNumber)}`;
  }

  for (let offset = 1; offset <= 4; offset += 1) {
    preloadFrame(frameSrc(film, clamp(frameNumber + offset, 1, film.count)));
    preloadFrame(frameSrc(film, clamp(frameNumber - offset, 1, film.count)));
  }
}

function updateScrollCinema() {
  if (!cinema || !cinemaChapters.length) return;
  const viewport = window.innerHeight || 1;
  let activeIndex = 0;
  let activeProgress = 0;

  cinemaChapters.forEach((chapter, index) => {
    const rect = chapter.getBoundingClientRect();
    const progress = clamp((viewport - rect.top) / (viewport + rect.height), 0, 1);
    if (rect.top <= viewport * 0.62 && rect.bottom >= viewport * 0.28) {
      activeIndex = index;
      activeProgress = progress;
    }
  });

  const film = frameFilms[activeIndex];
  const frameNumber = clamp(Math.round(activeProgress * (film.count - 1)) + 1, 1, film.count);
  setScrollFrame(activeIndex, frameNumber);

  if (cinemaProgress) {
    cinemaProgress.style.width = `${Math.round(activeProgress * 100)}%`;
  }
}

window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateScrollCinema();
    ticking = false;
  });
}, { passive: true });

window.addEventListener("resize", updateScrollCinema);
updateScrollCinema();
window.addEventListener("mousemove", (event) => {
  if (!cinema) return;
  cinema.style.setProperty("--cursor-x", `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
  cinema.style.setProperty("--cursor-y", `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
}, { passive: true });

navToggle?.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    navLinks.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

const features = {
  sport: {
    label: "Live sport",
    badge: "LIVE SPORT",
    title: "Match-day shelf with backup categories, replay labels, and clear event grouping.",
    tags: ["⚽ Football", "🥊 UFC", "🏎️ Formula 1", "🏀 Basketball", "🥊 Boxing", "⛳ Golf", "🎾 Tennis"]
  },
  films: {
    label: "Films and box sets",
    badge: "CINEMA & VOD",
    title: "Original poster-style shelves for film nights, series, documentaries, and 4K cinema lists.",
    tags: ["🍿 4K Cinema", "🎬 New Releases", "📺 HBO & Netflix", "🎭 Drama Series", "💥 Action & Sci-Fi", "🏆 Award Winners"]
  },
  channels: {
    label: "Regional channels",
    badge: "GLOBAL CHANNELS",
    title: "Language packs and regional groups make local and international TV browsing feel effortless.",
    tags: ["🇮🇪 Irish Channels", "🇬🇧 UK Premier", "🇪🇺 European TV", "🇺🇸 USA Network", "🌐 Global Feeds", "📡 Local News"]
  },
  kids: {
    label: "Kids and family",
    badge: "FAMILY SAFE",
    title: "Family categories sit behind a parental PIN code with custom subtitle preferences.",
    tags: ["🧸 Cartoons", "🏰 Disney+", "🚀 Nickelodeon", "🦁 Family Movies", "🔒 PIN Lock", "💬 Subtitles"]
  },
  catchup: {
    label: "Guide and catch-up",
    badge: "EPG & REPLAY",
    title: "A clean interactive guide preview shows 7-day replay labels, date filters, and instant zapping.",
    tags: ["📅 7-Day Catchup", "📺 Live EPG Guide", "⏮️ Replay Matches", "⏱️ Time-Shift", "⚡ Fast Zapping", "🔍 Instant Search"]
  }
};

document.querySelectorAll(".feature-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    setFeature(button);
  });
});

function setFeature(button) {
  const display = document.getElementById("feature-display");
  document.querySelectorAll(".feature-tabs button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  display.classList.add("is-swapping");

  window.setTimeout(() => {
    const feature = features[button.dataset.feature];
    display.innerHTML = `
      <div class="display-header">
        <span class="live-dot-pulse">●</span>
        <span class="display-kicker">${feature.badge || feature.label}</span>
      </div>
      <h3>${feature.title}</h3>
      <div class="mini-grid">${feature.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    `;
    display.classList.remove("is-swapping");
  }, 170);
}

let featureIndex = 0;
const featureButtons = [...document.querySelectorAll(".feature-tabs button")];
window.setInterval(() => {
  if (!featureButtons.length || document.hidden) return;
  featureIndex = (featureIndex + 1) % featureButtons.length;
  setFeature(featureButtons[featureIndex]);
}, 5200);

const deviceRoutes = {
  tv: "Smart TV route: install the recommended player, send the device ID, and we connect the guide from our side.",
  stick: "Fire Stick route: use the app store or Downloader path, send the device screen, then confirm playback.",
  phone: "Phone route: install the mobile player, scan or paste the setup details, and save your favourites."
};

document.querySelectorAll(".finder-buttons button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".finder-buttons button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById("device-result").textContent = deviceRoutes[button.dataset.device];
  });
});

document.getElementById("track-order")?.addEventListener("click", () => {
  const value = document.getElementById("order-code").value.trim() || "sample order";
  document.getElementById("timeline").innerHTML = `
    <span class="done">Order found: ${value}</span>
    <span class="done">Payment received</span>
    <span class="done">Activation queued</span>
    <span class="active">WhatsApp setup message ready</span>
  `;
});

/* SINGLE ACCORDION FAQ LOGIC */
const faqDetails = document.querySelectorAll(".faq-list details");
faqDetails.forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (detail.open) {
      faqDetails.forEach((otherDetail) => {
        if (otherDetail !== detail) {
          otherDetail.removeAttribute("open");
        }
      });
    }
  });
});

/* CHECKOUT MODAL LOGIC */
const checkoutModal = document.getElementById("checkout-modal");
const checkoutClose = document.getElementById("checkout-close");
const planOptCards = document.querySelectorAll(".plan-opt-card");
const paymentOptCards = document.querySelectorAll(".payment-opt-card");
const btnDeviceMinus = document.getElementById("btn-device-minus");
const btnDevicePlus = document.getElementById("btn-device-plus");
const deviceCountVal = document.getElementById("device-count-val");
const screenDiscountTag = document.getElementById("screen-discount-tag");
const sumPlanName = document.getElementById("sum-plan-name");
const sumPlanPrice = document.getElementById("sum-plan-price");
const sumExtraDevices = document.getElementById("sum-extra-devices");
const sumDiscountStatus = document.getElementById("sum-discount-status");
const sumTotalToday = document.getElementById("sum-total-today");
const btnSubmitWhatsapp = document.getElementById("btn-submit-whatsapp");
const btnInquireWhatsapp = document.getElementById("btn-inquire-whatsapp");
let selectedPaymentMethod = document.querySelector(".payment-opt-card.active")?.dataset.pm || "Link (Stripe)";
function navigateToWhatsApp(url) {
  if (typeof window.trackLoopMintWhatsAppContact === "function") {
    const destination = url.includes("447907504571") ? "support" : "sales";
    window.trackLoopMintWhatsAppContact(destination);
  }
  if (typeof window.__loopmintCaptureWhatsApp === "function") {
    window.__loopmintCaptureWhatsApp(url);
    return;
  }
  window.location.assign(url);
}

/* CURRENCY SWITCHER LOGIC */
let currentCurrency = "EUR"; // "EUR" or "USD"

const currencyConfig = {
  EUR: { symbol: "€", name: "EUR" },
  USD: { symbol: "$", name: "USD" }
};

const planDataMap = {
  "1 Month": { EUR: 17, USD: 19, original: { EUR: 20, USD: 22 }, period: { EUR: "/ month", USD: "/ month" } },
  "6 Months": { EUR: 45, USD: 50, original: { EUR: 65, USD: 75 }, period: { EUR: "/ 6 months", USD: "/ 6 mos" } },
  "1 Year": { EUR: 75, USD: 82, original: { EUR: 90, USD: 99 }, period: { EUR: "/ year", USD: "/ yr" } },
  "2 Years + 6 Months Free": { EUR: 130, USD: 143, original: { EUR: 180, USD: 199 }, period: { EUR: "/ 30 months", USD: "/ 30 mos" } },
  "2 Yrs + 6 Mos Free": { EUR: 130, USD: 143, original: { EUR: 180, USD: 199 }, period: { EUR: "/ 30 months", USD: "/ 30 mos" } }
};

let currentPlan = {
  name: "6 Months",
  price: 45,
  period: "6 mos"
};
let extraDevices = 0;
const economizerMatrixData = {
  EUR: {
    chips: [
      "€17.00 / month",
      "€7.50 / mo · Save 56%",
      "€6.25 / mo · Save 63% (€129/yr)",
      "€4.33 / mo · Save 75% (€380 Saved!)"
    ],
    upfront: ["€17", "€45", "€75", "<strong>€130</strong>"],
    monthly: [
      '<span class="rate-tag rate-base">€17.00 / mo</span>',
      '<span class="rate-tag rate-good">€7.50 / mo</span>',
      '<span class="rate-tag rate-great">€6.25 / mo</span>',
      '<span class="rate-tag rate-best">€4.33 / mo 🔥</span>'
    ],
    daily: ["€0.57 / day", "€0.25 / day", "€0.21 / day", "<strong>€0.14 / day</strong>"],
    total3Yr: [
      '€510 <span class="txt-red">(30 plan periods)</span>',
      '€225 <span class="txt-red">(5 plan periods)</span>',
      '€187.50 <span class="txt-amber">(monthly equivalent)</span>',
      '<strong>€130 <span class="txt-green">(Single Payment)</span></strong>'
    ],
    savings: [
      'Base Rate (€0)',
      '<span class="save-badge">Save €285 (56% OFF)</span>',
      '<span class="save-badge save-great">Save €322.50 (63% OFF)</span>',
      '<span class="save-badge save-best">KEEP €380 CASH (75% OFF) 🔥</span>'
    ],
    keep: [
      'Live & on-demand content</li><li>WhatsApp Activation</li><li>1 Active Connection',
      'Everything in 1 Month</li><li>Lower €7.50/mo rate</li><li>Setup Refresh Help',
      'Everything in 6 Months</li><li><strong>63% Discount Rate</strong></li><li>Priority Setup Queue</li><li>15% OFF Multi-Screen Perks',
      '<strong>6 MONTHS FREE</strong> (€45 Value)</li><li><strong>Lowest €4.33/mo Rate</strong></li><li>VIP Priority Setup Lane</li><li>Price Locked for 30 Months'
    ],
    lose: [
      'Lose <strong>€380 in savings</strong></li><li>Highest cost (€17.00/mo)</li><li>Must renew every month</li><li>No Priority Queue status',
      'Lose <strong>€95 in long-run savings</strong></li><li>Higher rate than 1 Year</li><li>Must renew twice per year</li><li>No VIP setup priority',
      'Lose <strong>€57.50 extra savings</strong> vs long-run plan</li><li>Requires yearly renewal',
      '<div class="zero-loss-badge">LONGEST PLAN • LOWEST MONTHLY RATE</div>'
    ]
  },
  USD: {
    chips: [
      "$19.00 / month",
      "$8.33 / mo · Save 56%",
      "$6.83 / mo · Save 64% ($146/yr)",
      "$4.77 / mo · Save 75% ($427 Saved!)"
    ],
    upfront: ["$19", "$50", "$82", "<strong>$143</strong>"],
    monthly: [
      '<span class="rate-tag rate-base">$19.00 / mo</span>',
      '<span class="rate-tag rate-good">$8.33 / mo</span>',
      '<span class="rate-tag rate-great">$6.83 / mo</span>',
      '<span class="rate-tag rate-best">$4.77 / mo 🔥</span>'
    ],
    daily: ["$0.63 / day", "$0.28 / day", "$0.22 / day", "<strong>$0.16 / day</strong>"],
    total3Yr: [
      '$570 <span class="txt-red">(30 plan periods)</span>',
      '$250 <span class="txt-red">(5 plan periods)</span>',
      '$205 <span class="txt-amber">(monthly equivalent)</span>',
      '<strong>$143 <span class="txt-green">(Single Payment)</span></strong>'
    ],
    savings: [
      'Base Rate ($0)',
      '<span class="save-badge">Save $320 (56% OFF)</span>',
      '<span class="save-badge save-great">Save $365 (64% OFF)</span>',
      '<span class="save-badge save-best">KEEP $427 CASH (75% OFF) 🔥</span>'
    ],
    keep: [
      'Live & on-demand content</li><li>WhatsApp Activation</li><li>1 Active Connection',
      'Everything in 1 Month</li><li>Lower $8.33/mo rate</li><li>Setup Refresh Help',
      'Everything in 6 Months</li><li><strong>64% Discount Rate</strong></li><li>Priority Setup Queue</li><li>15% OFF Multi-Screen Perks',
      '<strong>6 MONTHS FREE</strong> ($50 Value)</li><li><strong>Lowest $4.77/mo Rate</strong></li><li>VIP Priority Setup Lane</li><li>Price Locked for 30 Months'
    ],
    lose: [
      'Lose <strong>$427 in savings</strong></li><li>Highest cost ($19.00/mo)</li><li>Must renew every month</li><li>No Priority Queue status',
      'Lose <strong>$107 in long-run savings</strong></li><li>Higher rate than 1 Year</li><li>Must renew twice per year</li><li>No VIP setup priority',
      'Lose <strong>$62 extra savings</strong> vs long-run plan</li><li>Requires yearly renewal',
      '<div class="zero-loss-badge">LONGEST PLAN • LOWEST MONTHLY RATE</div>'
    ]
  }
};

function setCurrency(curr) {
  currentCurrency = curr;
  const sym = currencyConfig[curr].symbol;

  // Sync toggle buttons
  document.querySelectorAll(".currency-toggle-btn").forEach((btn) => {
    if (btn.dataset.curr === curr) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update Page Pricing Cards & Breakdown Chips
  const priceCards = document.querySelectorAll(".price-card");
  const pricesEUR = [17, 45, 75, 130];
  const pricesUSD = [19, 50, 82, 143];
  const originalPricesEUR = [20, 65, 90, 180];
  const originalPricesUSD = [22, 75, 99, 199];

  priceCards.forEach((card, index) => {
    const amountEl = card.querySelector(".current-price");
    const originalAmountEl = card.querySelector(".original-price");
    const buttonEl = card.querySelector("button");
    const chipEl = card.querySelector(".monthly-breakdown-chip");
    const val = curr === "USD" ? pricesUSD[index] : pricesEUR[index];
    const originalVal = curr === "USD" ? originalPricesUSD[index] : originalPricesEUR[index];
    if (amountEl) amountEl.textContent = `${sym}${val}`;
    if (originalAmountEl) originalAmountEl.textContent = `${sym}${originalVal}`;
    if (buttonEl) buttonEl.dataset.price = `${sym}${val}`;
    if (chipEl && economizerMatrixData[curr]) {
      chipEl.textContent = economizerMatrixData[curr].chips[index];
    }
  });

  // Update Economizer Table Matrix
  const matrix = economizerMatrixData[curr];
  if (matrix) {
    const updateRow = (rowId, dataArray, isList = false, listClass = "") => {
      const row = document.getElementById(rowId);
      if (!row) return;
      const cells = row.querySelectorAll("td");
      // cells[0] is header column
      for (let i = 0; i < 4; i++) {
        if (cells[i + 1]) {
          if (isList) {
            cells[i + 1].innerHTML = dataArray[i].includes("zero-loss-badge")
              ? dataArray[i]
              : `<ul class="eco-list ${listClass}"><li>${dataArray[i]}</li></ul>`;
          } else {
            cells[i + 1].innerHTML = dataArray[i];
          }
        }
      }
    };

    updateRow("eco-upfront-row", matrix.upfront);
    updateRow("eco-monthly-row", matrix.monthly);
    updateRow("eco-daily-row", matrix.daily);
    updateRow("eco-total3yr-row", matrix.total3Yr);
    updateRow("eco-savings-row", matrix.savings);
    updateRow("eco-keep-row", matrix.keep, true, "keep");
    updateRow("eco-lose-row", matrix.lose, true, "lose");
  }

  // Update Modal Plan Cards
  planOptCards.forEach((card) => {
    const planKey = card.dataset.plan;
    let data = planDataMap[planKey];
    if (!data && (planKey.toLowerCase().includes("2 year") || planKey.toLowerCase().includes("2 yr"))) {
      data = planDataMap["2 Years + 6 Months Free"];
    }
    const priceSpan = card.querySelector(".plan-opt-price");
    if (data && priceSpan) {
      const priceVal = data[curr];
      const originalPriceVal = data.original[curr];
      const pStr = data.period[curr];
      priceSpan.innerHTML = `<span class="plan-opt-original">${sym}${originalPriceVal}</span><span class="plan-opt-current">${sym}${priceVal} ${pStr}</span>`;
      card.dataset.price = priceVal;
    }
  });

  // Update current active plan price
  let activeData = planDataMap[currentPlan.name];
  if (!activeData && (currentPlan.name.toLowerCase().includes("2 year") || currentPlan.name.toLowerCase().includes("2 yr"))) {
    activeData = planDataMap["2 Years + 6 Months Free"];
  }
  if (activeData) {
    currentPlan.price = activeData[curr];
  }

  updateOrderSummary();
}

// Bind Currency Toggle Buttons
document.querySelectorAll(".currency-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setCurrency(btn.dataset.curr);
  });
});

function openCheckoutModal(planName = "6 Months", planPrice = "45") {
  if (!checkoutModal) return;
  closeTrialModal();

  let targetName = String(planName).trim().toLowerCase();
  let matchedCard = null;

  // Strict match first
  planOptCards.forEach((card) => {
    let cardPlan = card.dataset.plan.trim().toLowerCase();
    if (cardPlan === targetName) {
      matchedCard = card;
    }
  });

  // Precise fallback matching if exact string differs slightly
  if (!matchedCard) {
    planOptCards.forEach((card) => {
      let cardPlan = card.dataset.plan.trim().toLowerCase();
      if (targetName.includes("1 year") && !targetName.includes("2 year") && !targetName.includes("free") && cardPlan.includes("1 year") && !cardPlan.includes("2 year") && !cardPlan.includes("free")) {
        matchedCard = card;
      } else if (targetName.includes("1 month") && cardPlan.includes("1 month")) {
        matchedCard = card;
      } else if (targetName.includes("6 month") && cardPlan.includes("6 month")) {
        matchedCard = card;
      } else if ((targetName.includes("2 year") || targetName.includes("free") || targetName.includes("long")) && (cardPlan.includes("2 year") || cardPlan.includes("free") || cardPlan.includes("30 mo"))) {
        matchedCard = card;
      }
    });
  }

  if (matchedCard) {
    selectPlanCard(matchedCard);
  }

  checkoutModal.classList.add("open");
  checkoutModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
  if (!checkoutModal) return;
  checkoutModal.classList.remove("open");
  checkoutModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function selectPlanCard(card) {
  planOptCards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");
  currentPlan.name = card.dataset.plan;
  if (planDataMap[currentPlan.name]) {
    currentPlan.price = planDataMap[currentPlan.name][currentCurrency];
  } else {
    currentPlan.price = parseInt(card.dataset.price);
  }
  currentPlan.period = card.dataset.period;
  updateOrderSummary();
}

function updateOrderSummary() {
  const sym = currencyConfig[currentCurrency].symbol;
  const formatAmount = (value) => Number.isInteger(value) ? String(value) : value.toFixed(2);
  const totalTVs = 1 + extraDevices; // main TV + extras
  const deviceAddOnPrice = extraDevices * currentPlan.price; // each extra TV = full plan price
  const subtotal = currentPlan.price + deviceAddOnPrice; // plan price × number of TVs
  const hasDiscount = extraDevices >= 1; // 2+ TVs triggers 15% OFF
  let discountVal = 0;
  let total = subtotal;

  if (hasDiscount) {
    discountVal = subtotal * 0.15;
    total = subtotal - discountVal;
    screenDiscountTag?.classList.remove("hidden");
    if (sumDiscountStatus) {
      sumDiscountStatus.textContent = `-${sym}${formatAmount(discountVal)} (15% OFF)`;
      sumDiscountStatus.classList.remove("disabled-status");
    }
  } else {
    screenDiscountTag?.classList.add("hidden");
    if (sumDiscountStatus) {
      sumDiscountStatus.textContent = "No extras";
      sumDiscountStatus.classList.add("disabled-status");
    }
  }

  if (sumPlanName) sumPlanName.textContent = currentPlan.name;
  if (sumPlanPrice) {
    const selectedPlanData = planDataMap[currentPlan.name];
    const originalPrice = selectedPlanData?.original?.[currentCurrency];
    sumPlanPrice.innerHTML = originalPrice
      ? `<span class="summary-original-price">${sym}${originalPrice}</span><span class="summary-current-price">${sym}${currentPlan.price}</span>`
      : `<span class="summary-current-price">${sym}${currentPlan.price}</span>`;
  }
  if (sumExtraDevices) {
    sumExtraDevices.textContent = extraDevices === 0
      ? "None added"
      : `+${extraDevices} TV${extraDevices > 1 ? 's' : ''} (+${sym}${formatAmount(deviceAddOnPrice)})`;
  }
  if (sumTotalToday) sumTotalToday.textContent = `${sym}${formatAmount(total)}`;

  // Update stepper limit label
  const stepperLimit = document.querySelector(".stepper-limit");
  if (stepperLimit) stepperLimit.textContent = `${extraDevices}/4`;
}

// Attach event listeners to all pricing section buttons
document.querySelectorAll(".price-card button").forEach((button) => {
  button.addEventListener("click", () => {
    const planName = button.dataset.plan || "1 Year";
    const planPrice = button.dataset.price || "75";
    const selectedPlanEl = document.getElementById("selected-plan");
    if (selectedPlanEl) {
      selectedPlanEl.textContent = `Selected plan: ${planName} at ${planPrice}`;
    }
    openCheckoutModal(planName, planPrice);
  });
});

// Plan option card click inside modal
planOptCards.forEach((card) => {
  card.addEventListener("click", () => selectPlanCard(card));
});

// Payment route card click
paymentOptCards.forEach((card) => {
  card.addEventListener("click", () => {
    paymentOptCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
    selectedPaymentMethod = card.dataset.pm;
  });
});

// Stepper controls for extra devices
btnDeviceMinus?.addEventListener("click", () => {
  if (extraDevices > 0) {
    extraDevices--;
    if (deviceCountVal) deviceCountVal.textContent = extraDevices;
    updateOrderSummary();
  }
});

btnDevicePlus?.addEventListener("click", () => {
  if (extraDevices < 4) {
    extraDevices++;
    if (deviceCountVal) deviceCountVal.textContent = extraDevices;
    updateOrderSummary();
  }
});

// Toggle Priority Setup Request
const priorityToggleBtn = document.getElementById("priority-toggle");
priorityToggleBtn?.addEventListener("click", () => {
  const isActive = priorityToggleBtn.classList.contains("active");
  if (isActive) {
    priorityToggleBtn.classList.remove("active");
    priorityToggleBtn.textContent = "Disabled";
  } else {
    priorityToggleBtn.classList.add("active");
    priorityToggleBtn.textContent = "Enabled (Free)";
  }
});

// Submit via WhatsApp
btnSubmitWhatsapp?.addEventListener("click", () => {
  const firstNameEl = document.getElementById("co-first-name");
  const whatsappEl = document.getElementById("co-whatsapp");
  const deviceEl = document.getElementById("co-device");
  const consentEl = document.getElementById("co-consent");
  const consentBox = document.getElementById("consent-row-box");

  const firstName = firstNameEl?.value.trim() || "";
  const lastName = document.getElementById("co-last-name")?.value.trim() || "";
  const countryCode = document.getElementById("co-country")?.value || "+353";
  const whatsappNum = whatsappEl?.value.trim() || "";
  const countryName = document.querySelector("#co-country-picker .curr-name")?.textContent.trim() || "Ireland";
  const fullWhatsAppNumber = normalizeInternationalNumber(countryCode, whatsappNum);
  const device = deviceEl?.value || "";

  let valid = true;

  // Validate Name
  if (!firstName) {
    firstNameEl?.focus();
    firstNameEl?.classList.add("input-error");
    valid = false;
  } else {
    firstNameEl?.classList.remove("input-error");
  }

  // Validate Phone
  if (!fullWhatsAppNumber) {
    if (valid) whatsappEl?.focus();
    whatsappEl?.classList.add("input-error");
    valid = false;
  } else {
    whatsappEl?.classList.remove("input-error");
  }

  if (!device) {
    if (valid) deviceEl?.focus();
    deviceEl?.classList.add("input-error");
    valid = false;
  } else {
    deviceEl?.classList.remove("input-error");
  }

  // Validate Obligatory Consent Checkbox
  if (!consentEl?.checked) {
    consentBox?.classList.add("shake-error");
    setTimeout(() => consentBox?.classList.remove("shake-error"), 800);
    valid = false;
  }

  if (!valid) return;

  const totalStr = sumTotalToday?.textContent || `€${currentPlan.price}`;
  const fullName = `${firstName} ${lastName}`.trim() || "Customer";
  const priorityRequested = priorityToggleBtn?.classList.contains("active") ? "Yes, when available" : "No";

  const message = `Hello LoopMint,\nI would like to place an order.\n\n` +
    `CUSTOMER DETAILS\n` +
    `Name: ${fullName}\n` +
    `Country: ${countryName} (${countryCode})\n` +
    `WhatsApp: ${fullWhatsAppNumber}\n` +
    `Device: ${device}\n\n` +
    `ORDER DETAILS\n` +
    `Plan: ${currentPlan.name}\n` +
    `Screens: ${1 + extraDevices}\n` +
    `Total shown: ${totalStr}\n` +
    `Payment preference: ${selectedPaymentMethod}\n` +
    `Priority setup requested: ${priorityRequested}\n\n` +
    `Please confirm availability and send the next steps on WhatsApp.`;

  const encodedMsg = encodeURIComponent(message);
  navigateToWhatsApp(`https://wa.me/447597648884?text=${encodedMsg}`);
});

// Inquire via WhatsApp (Pre-filled Auto Message with Selected Plan Details)
btnInquireWhatsapp?.addEventListener("click", () => {
  const planName = currentPlan ? currentPlan.name : "Subscription";
  const planPrice = currentPlan ? `${currencyConfig[currentCurrency].symbol}${currentPlan.price}` : "";
  const inquireMsg = `Hello LoopMint Sales & Setup! 🟢 I'm interested in the ${planName} plan (${planPrice}) and have a question before completing my order. Can you help me?`;
  navigateToWhatsApp(`https://wa.me/447597648884?text=${encodeURIComponent(inquireMsg)}`);
});

// Modal close handlers
checkoutClose?.addEventListener("click", closeCheckoutModal);

checkoutModal?.addEventListener("click", (e) => {
  if (e.target === checkoutModal) {
    closeCheckoutModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && checkoutModal?.classList.contains("open")) {
    closeCheckoutModal();
  }
});

const recommendations = {
  sport: ["Sport-first journey", "Lead with match nights, event grouping, backup categories, and fast setup."],
  films: ["Film-night journey", "Lead with original shelves, subtitle preferences, 4K labels, and favourites."],
  kids: ["Family-safe journey", "Lead with parental-code controls, simple device instructions, and support reassurance."],
  global: ["Global-pack journey", "Lead with regional packs, language groups, international news, and travel-friendly device support."]
};

document.querySelectorAll(".rec-chips button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".rec-chips button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const [title, body] = recommendations[button.dataset.rec];
    document.getElementById("rec-output").innerHTML = `<b>${title}</b><p>${body}</p>`;
  });
});

const regions = {
  Europe: "Europe pack: English, French, Spanish, Portuguese, Italian, German, and Nordic category groups. Placeholder availability.",
  Africa: "Africa pack: North African, West African, East African, and French-language groups. Placeholder availability.",
  Americas: "Americas pack: US, Canadian, Latin American, Spanish-language, and Portuguese-language groups. Placeholder availability.",
  Asia: "Asia pack: South Asian, Middle Eastern, East Asian, and global news groups. Placeholder availability."
};

document.querySelectorAll(".dot").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".dot").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById("coverage-result").textContent = regions[button.dataset.region];
  });
});

const faqSearch = document.getElementById("faq-search");
const faqItems = [...document.querySelectorAll(".faq-list details")];

faqSearch?.addEventListener("input", () => {
  const query = faqSearch.value.trim().toLowerCase();
  faqItems.forEach((item) => {
    const match = !query || item.textContent.toLowerCase().includes(query);
    item.hidden = !match;
    if (query && match) item.open = true;
  });
});

// Day / Night Theme Toggle with Persistence
const themeToggleBtns = document.querySelectorAll(".theme-toggle");

const sunIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const moonIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function applyTheme(theme) {
  if (theme === "dim") {
    document.body.classList.add("theme-dim");
    document.body.classList.remove("theme-bright");
    themeToggleBtns.forEach(btn => {
      btn.innerHTML = sunIcon;
      btn.setAttribute("aria-label", "Switch to Bright Mode");
      btn.setAttribute("title", "Switch to Bright Mode");
    });
  } else {
    document.body.classList.add("theme-bright");
    document.body.classList.remove("theme-dim");
    themeToggleBtns.forEach(btn => {
      btn.innerHTML = moonIcon;
      btn.setAttribute("aria-label", "Switch to Night Mode");
      btn.setAttribute("title", "Switch to Night Mode");
    });
  }
}

const savedTheme = localStorage.getItem("loopmint_theme") || "dim";
applyTheme(savedTheme);

themeToggleBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const isDim = document.body.classList.contains("theme-dim");
    const newTheme = isDim ? "bright" : "dim";
    localStorage.setItem("loopmint_theme", newTheme);
    applyTheme(newTheme);
  });
});

const revealTargets = [
  ".narrow-center",
  ".section-title",
  ".content-board article",
  ".trust-grid article",
  ".setup-card",
  ".media-grid article",
  ".stat-band article",
  ".review-grid article",
  ".price-card",
  ".tool-layout > article",
  ".faq-layout > div",
  ".guide-row article",
  ".footer-grid > *"
].join(",");

document.querySelectorAll(revealTargets).forEach((element) => {
  element.classList.add("reveal");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const guideRow = document.querySelector(".guide-row");
let guideDirection = 1;

window.setInterval(() => {
  if (!guideRow || document.hidden || guideRow.matches(":hover")) return;
  const maxScroll = guideRow.scrollWidth - guideRow.clientWidth;
  if (maxScroll <= 0) return;
  if (guideRow.scrollLeft >= maxScroll - 8) guideDirection = -1;
  if (guideRow.scrollLeft <= 8) guideDirection = 1;
  guideRow.scrollBy({ left: guideDirection * 260, behavior: "smooth" });
}, 4200);

// Keep the primary navigation visible while the page scrolls.
const siteHeader = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > 40) {
    siteHeader?.classList.add("is-scrolled");
  } else {
    siteHeader?.classList.remove("is-scrolled");
  }

  siteHeader?.classList.remove("is-hidden");
}, { passive: true });

// Fast Stats Counter Animation - Re-triggers every time scrolled into view
const statBand = document.getElementById("stat-band");
const statNumbers = document.querySelectorAll(".stat-number");
let activeCounterAnimations = [];

function formatNumber(num) {
  return Math.floor(num).toLocaleString("en-US");
}

function startCounterAnimation() {
  activeCounterAnimations.forEach(cancelAnimationFrame);
  activeCounterAnimations = [];

  statNumbers.forEach((el) => {
    const target = parseInt(el.getAttribute("data-target"), 10);
    const start = parseInt(el.getAttribute("data-start"), 10) || 0;
    const duration = 1100; // Fast 1.1s count up
    const startTime = performance.now();

    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 2);
      const currentValue = start + (target - start) * easeOutProgress;

      el.textContent = formatNumber(currentValue);

      if (progress < 1) {
        const animId = requestAnimationFrame(updateCount);
        activeCounterAnimations.push(animId);
      } else {
        el.textContent = formatNumber(target);
      }
    }

    const animId = requestAnimationFrame(updateCount);
    activeCounterAnimations.push(animId);
  });
}

function resetCounters() {
  activeCounterAnimations.forEach(cancelAnimationFrame);
  activeCounterAnimations = [];
  statNumbers.forEach((el) => {
    const start = parseInt(el.getAttribute("data-start"), 10) || 0;
    el.textContent = formatNumber(start);
  });
}

if (statBand) {
  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCounterAnimation();
        } else {
          resetCounters();
        }
      });
    },
    { threshold: 0.25 }
  );

  statObserver.observe(statBand);
}

/* FREE TRIAL MODAL LOGIC */
const trialModal = document.getElementById("trial-modal");
const trialClose = document.getElementById("trial-close");

function openTrialModal() {
  if (!trialModal) return;
  closeCheckoutModal();
  trialModal.classList.add("open");
  trialModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeTrialModal() {
  if (!trialModal) return;
  trialModal.classList.remove("open");
  trialModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Bind all "Free Trial" buttons and links across the site to open the Free Trial Modal
document.querySelectorAll('a[href="#trial"], .dock-cta, .whatsapp-float, .header-trial-btn, .hero-primary-btn, .btn-open-trial-modal').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    openTrialModal();
  });
});

// Modal close button
trialClose?.addEventListener("click", closeTrialModal);

trialModal?.addEventListener("click", (e) => {
  if (e.target === trialModal) {
    closeTrialModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && trialModal?.classList.contains("open")) {
    closeTrialModal();
  }
});

// Form submit helper for WhatsApp trial request
function sendTrialWhatsApp(nameId, countryId, phoneId) {
  const name = document.getElementById(nameId)?.value.trim() || "Customer";
  const countryInput = document.getElementById(countryId);
  const country = countryInput?.value || "+353";
  const countryName = countryInput?.closest(".custom-country-picker")?.querySelector(".curr-name")?.textContent.trim() || "Ireland";
  const phoneInput = document.getElementById(phoneId);
  const phone = phoneInput?.value.trim() || "";
  const fullWhatsAppNumber = normalizeInternationalNumber(country, phone);
  const device = document.getElementById("trial-device")?.value || "Not selected";

  if (!fullWhatsAppNumber) {
    phoneInput?.setCustomValidity("Enter a valid WhatsApp number, including the country code when pasted.");
    phoneInput?.reportValidity();
    return false;
  }
  phoneInput?.setCustomValidity("");

  const message = `Hello LoopMint,\nI would like to request a free 24-hour trial.\n\n` +
    `TRIAL DETAILS\n` +
    `Name: ${name}\n` +
    `Country: ${countryName} (${country})\n` +
    `WhatsApp: ${fullWhatsAppNumber}\n` +
    `Device: ${device}\n\n` +
    `Please send the matching setup steps and trial details.`;

  navigateToWhatsApp(`https://wa.me/447597648884?text=${encodeURIComponent(message)}`);
  return true;
}

document.getElementById("trial-modal-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (sendTrialWhatsApp("trial-first-name", "trial-country", "trial-whatsapp")) closeTrialModal();
});

document.getElementById("trial-section-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  sendTrialWhatsApp("section-first-name", "section-country", "section-whatsapp");
});

document.querySelectorAll("#trial-whatsapp, #co-whatsapp").forEach((input) => {
  input.addEventListener("input", () => input.setCustomValidity(""));
});

document.getElementById("step-trial-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  sendTrialWhatsApp("step-first-name", "step-country", "step-whatsapp");
});

/* CUSTOM COUNTRY PICKER DROPDOWN LOGIC */
const countryDialOptions = [["AC","+247"],["AD","+376"],["AE","+971"],["AF","+93"],["AG","+1"],["AI","+1"],["AL","+355"],["AM","+374"],["AO","+244"],["AR","+54"],["AS","+1"],["AT","+43"],["AU","+61"],["AW","+297"],["AX","+358"],["AZ","+994"],["BA","+387"],["BB","+1"],["BD","+880"],["BE","+32"],["BF","+226"],["BG","+359"],["BH","+973"],["BI","+257"],["BJ","+229"],["BL","+590"],["BM","+1"],["BN","+673"],["BO","+591"],["BQ","+599"],["BR","+55"],["BS","+1"],["BT","+975"],["BW","+267"],["BY","+375"],["BZ","+501"],["CA","+1"],["CC","+61"],["CD","+243"],["CF","+236"],["CG","+242"],["CH","+41"],["CI","+225"],["CK","+682"],["CL","+56"],["CM","+237"],["CN","+86"],["CO","+57"],["CR","+506"],["CU","+53"],["CV","+238"],["CW","+599"],["CX","+61"],["CY","+357"],["CZ","+420"],["DE","+49"],["DJ","+253"],["DK","+45"],["DM","+1"],["DO","+1"],["DZ","+213"],["EC","+593"],["EE","+372"],["EG","+20"],["EH","+212"],["ER","+291"],["ES","+34"],["ET","+251"],["FI","+358"],["FJ","+679"],["FK","+500"],["FM","+691"],["FO","+298"],["FR","+33"],["GA","+241"],["GB","+44"],["GD","+1"],["GE","+995"],["GF","+594"],["GG","+44"],["GH","+233"],["GI","+350"],["GL","+299"],["GM","+220"],["GN","+224"],["GP","+590"],["GQ","+240"],["GR","+30"],["GT","+502"],["GU","+1"],["GW","+245"],["GY","+592"],["HK","+852"],["HN","+504"],["HR","+385"],["HT","+509"],["HU","+36"],["ID","+62"],["IE","+353"],["IL","+972"],["IM","+44"],["IN","+91"],["IO","+246"],["IQ","+964"],["IR","+98"],["IS","+354"],["IT","+39"],["JE","+44"],["JM","+1"],["JO","+962"],["JP","+81"],["KE","+254"],["KG","+996"],["KH","+855"],["KI","+686"],["KM","+269"],["KN","+1"],["KP","+850"],["KR","+82"],["KW","+965"],["KY","+1"],["KZ","+7"],["LA","+856"],["LB","+961"],["LC","+1"],["LI","+423"],["LK","+94"],["LR","+231"],["LS","+266"],["LT","+370"],["LU","+352"],["LV","+371"],["LY","+218"],["MA","+212"],["MC","+377"],["MD","+373"],["ME","+382"],["MF","+590"],["MG","+261"],["MH","+692"],["MK","+389"],["ML","+223"],["MM","+95"],["MN","+976"],["MO","+853"],["MP","+1"],["MQ","+596"],["MR","+222"],["MS","+1"],["MT","+356"],["MU","+230"],["MV","+960"],["MW","+265"],["MX","+52"],["MY","+60"],["MZ","+258"],["NA","+264"],["NC","+687"],["NE","+227"],["NF","+672"],["NG","+234"],["NI","+505"],["NL","+31"],["NO","+47"],["NP","+977"],["NR","+674"],["NU","+683"],["NZ","+64"],["OM","+968"],["PA","+507"],["PE","+51"],["PF","+689"],["PG","+675"],["PH","+63"],["PK","+92"],["PL","+48"],["PM","+508"],["PR","+1"],["PS","+970"],["PT","+351"],["PW","+680"],["PY","+595"],["QA","+974"],["RE","+262"],["RO","+40"],["RS","+381"],["RU","+7"],["RW","+250"],["SA","+966"],["SB","+677"],["SC","+248"],["SD","+249"],["SE","+46"],["SG","+65"],["SH","+290"],["SI","+386"],["SJ","+47"],["SK","+421"],["SL","+232"],["SM","+378"],["SN","+221"],["SO","+252"],["SR","+597"],["SS","+211"],["ST","+239"],["SV","+503"],["SX","+1"],["SY","+963"],["SZ","+268"],["TA","+290"],["TC","+1"],["TD","+235"],["TG","+228"],["TH","+66"],["TJ","+992"],["TK","+690"],["TL","+670"],["TM","+993"],["TN","+216"],["TO","+676"],["TR","+90"],["TT","+1"],["TV","+688"],["TW","+886"],["TZ","+255"],["UA","+380"],["UG","+256"],["US","+1"],["UY","+598"],["UZ","+998"],["VA","+39"],["VC","+1"],["VE","+58"],["VG","+1"],["VI","+1"],["VN","+84"],["VU","+678"],["WF","+681"],["WS","+685"],["XK","+383"],["YE","+967"],["YT","+262"],["ZA","+27"],["ZM","+260"],["ZW","+263"]];
const countryNameFormatter = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;
const preferredCountryCodes = ["IE", "GB", "NL", "FR", "DE", "ES", "PT", "MA", "US", "CA", "AU"];

function getCountryName(code) {
  try {
    return countryNameFormatter?.of(code) || code;
  } catch {
    return code;
  }
}

function normalizeInternationalNumber(dialCode, rawNumber) {
  const raw = String(rawNumber || "").trim();
  const pastedInternational = raw.startsWith("+");
  const numberDigits = raw.replace(/\D/g, "");
  const dialDigits = String(dialCode || "").replace(/\D/g, "");
  const localDigits = numberDigits.replace(/^0+/, "");
  const completeDigits = pastedInternational ? numberDigits : dialDigits + localDigits;
  return completeDigits.length >= 7 && completeDigits.length <= 15 ? "+" + completeDigits : "";
}

document.querySelectorAll(".custom-country-picker").forEach((picker) => {
  const btn = picker.querySelector(".country-trigger-btn");
  const hiddenInput = picker.querySelector("input[type='hidden']");
  const dropdown = picker.querySelector(".country-dropdown-menu");
  const menu = picker.querySelector(".country-menu-scroll");
  const currCode = picker.querySelector(".curr-code");
  const currName = picker.querySelector(".curr-name");
  const currDial = picker.querySelector(".curr-dial");

  if (!btn || !hiddenInput || !menu || !dropdown) return;

  const pickerId = picker.id || `country-picker-${Math.random().toString(36).slice(2)}`;
  const menuId = `${pickerId}-menu`;
  menu.id = menuId;
  menu.setAttribute("role", "listbox");
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-controls", menuId);
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Choose country calling code");

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "country-search-input";
  searchInput.placeholder = "Search country or code";
  searchInput.setAttribute("aria-label", "Search countries");
  dropdown.insertBefore(searchInput, menu);

  const countryEntries = countryDialOptions
    .map(([code, dial]) => ({ code, dial, name: getCountryName(code) }))
    .sort((a, b) => {
      const aPriority = preferredCountryCodes.indexOf(a.code);
      const bPriority = preferredCountryCodes.indexOf(b.code);
      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      }
      return a.name.localeCompare(b.name);
    });

  menu.replaceChildren(...countryEntries.map(({ code, dial, name }) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `country-item${code === "IE" ? " active" : ""}`;
    item.dataset.code = code;
    item.dataset.name = name;
    item.dataset.dial = dial;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", code === "IE" ? "true" : "false");
    item.innerHTML = `<span class="c-code">${code}</span><strong class="c-name">${name}</strong><span class="c-dial">${dial}</span>`;
    return item;
  }));

  const closePicker = () => {
    picker.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  const applyCountrySelection = (item) => {
    menu.querySelectorAll(".country-item").forEach((entry) => {
      const selected = entry === item;
      entry.classList.toggle("active", selected);
      entry.setAttribute("aria-selected", String(selected));
    });

    if (currCode) currCode.textContent = item.dataset.code;
    if (currName) currName.textContent = item.dataset.name;
    if (currDial) currDial.textContent = item.dataset.dial;
    hiddenInput.value = item.dataset.dial;
    closePicker();
  };
  picker._loopmintSelectCountry = applyCountrySelection;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".custom-country-picker").forEach((p) => {
      if (p !== picker) {
        p.classList.remove("open");
        p.querySelector(".country-trigger-btn")?.setAttribute("aria-expanded", "false");
      }
    });
    const open = picker.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      searchInput.value = "";
      menu.querySelectorAll(".country-item").forEach((item) => { item.hidden = false; });
      window.setTimeout(() => searchInput.focus(), 0);
    }
  });

  searchInput.addEventListener("click", (event) => event.stopPropagation());
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    menu.querySelectorAll(".country-item").forEach((item) => {
      item.hidden = !`${item.dataset.name} ${item.dataset.code} ${item.dataset.dial}`.toLowerCase().includes(query);
    });
  });

  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".country-item");
    if (!item) return;
    event.stopPropagation();
    applyCountrySelection(item);
    btn.focus();
  });

  picker.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePicker();
      btn.focus();
    }
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".custom-country-picker").forEach((picker) => {
    picker.classList.remove("open");
    picker.querySelector(".country-trigger-btn")?.setAttribute("aria-expanded", "false");
  });
});

[["co-whatsapp", "co-country-picker"], ["trial-whatsapp", "trial-country-picker"]].forEach(([phoneId, pickerId]) => {
  const phoneInput = document.getElementById(phoneId);
  const picker = document.getElementById(pickerId);
  phoneInput?.addEventListener("input", () => {
    const raw = phoneInput.value.trim();
    if (!raw.startsWith("+") || !picker?._loopmintSelectCountry) return;

    const numberDigits = raw.replace(/\D/g, "");
    const currentDial = picker.querySelector("input[type='hidden']")?.value.replace(/\D/g, "") || "";
    if (currentDial && numberDigits.startsWith(currentDial)) return;

    const matches = [...picker.querySelectorAll(".country-item")]
      .filter((item) => numberDigits.startsWith(item.dataset.dial.replace(/\D/g, "")))
      .sort((a, b) => {
        const dialLength = b.dataset.dial.length - a.dataset.dial.length;
        if (dialLength) return dialLength;
        const aPriority = preferredCountryCodes.indexOf(a.dataset.code);
        const bPriority = preferredCountryCodes.indexOf(b.dataset.code);
        if (aPriority === -1 && bPriority === -1) return 0;
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      });

    if (matches[0]) picker._loopmintSelectCountry(matches[0]);
  });
});

/* EXIT INTENT POPUP LOGIC (Disabled auto-popup on cursor leave) */
/*
let exitIntentTriggered = false;
document.addEventListener("mouseleave", (e) => {
  if (e.clientY <= 0 && !exitIntentTriggered) {
    const hasSeenExitModal = sessionStorage.getItem("loopmint_exit_seen");
    if (!hasSeenExitModal) {
      exitIntentTriggered = true;
      sessionStorage.setItem("loopmint_exit_seen", "true");
      openTrialModal();
    }
  }
});
*/


// -------------------------------------------------------------
// INTERACTIVE SETUP GUIDES ENGINE
// -------------------------------------------------------------
const guidesData = [
  {
    tag: "SETUP GUIDE",
    title: "Smart TV Setup in 3 Minutes",
    sub: "Step-by-step instructions for LG WebOS, Samsung Tizen, and Sony Android / Google TVs.",
    steps: [
      { num: "01", title: "Download Recommended Player App", desc: "Open your Smart TV App Store (LG Content Store, Samsung Apps, or Google Play). Search for 'IBO Player Pro', 'IPTV Smarters Pro', or 'TiviMate' and install it." },
      { num: "02", title: "Select 'Login with Xtream Codes API'", desc: "Launch the app on your TV and select 'Login with Xtream Codes' or 'Add Playlist'." },
      { num: "03", title: "Enter Your WhatsApp Activation Credentials", desc: "Input your Server Portal URL, Username, and Password provided in your WhatsApp activation message." },
      { num: "04", title: "Load Channels & Enjoy 4K Viewing", desc: "Click 'Add User'. Channels, EPG guide, and VOD movies will sync automatically within 10 seconds." }
    ],
    tip: "💡 Pro Tip: For Samsung/LG TVs, IBO Player Pro or IPTV Smarters Pro offer the fastest zapping speeds."
  },
  {
    tag: "SPORT GUIDE",
    title: "Match Night & 4K 60fps Setup",
    sub: "Optimize your playback settings for 60fps live sports, PPV fight nights, and zero-buffering.",
    steps: [
      { num: "01", title: "Enable Hardware Acceleration (HW+)", desc: "Go to App Settings -> Playback -> Video Decoder. Switch from 'SW' (Software) to 'HW+' (Hardware Accelerated) for smooth 60fps playback." },
      { num: "02", title: "Set Buffer Size to 5 Seconds", desc: "In Stream Buffer settings, select 'Normal / 5 Seconds'. This absorbs minor Wi-Fi jitter during heavy match broadcasts." },
      { num: "03", title: "Save Main Sports Channels to Favorites", desc: "Long-press or press 'Yellow Button' on your remote over Premier League, UFC, and F1 channels to pin them to your Favorites list." },
      { num: "04", title: "Use Backup Feeds for Peak Fixtures", desc: "If an official broadcast encounters server load, tap the 'Backup Feed 2' stream for uninterrupted 1080p60 viewing." }
    ],
    tip: "⚡ Pro Tip: Using an Ethernet cable instead of Wi-Fi guarantees zero lag during high-demand derby matches!"
  },
  {
    tag: "FAMILY PROTECTION",
    title: "Kids Mode & Parental Controls",
    sub: "Protect adult categories and keep children's cartoons upfront with a 4-digit PIN.",
    steps: [
      { num: "01", title: "Open Parental Control Settings", desc: "Navigate to App Settings -> Parental Control / Security." },
      { num: "02", title: "Set a Master 4-Digit Security PIN", desc: "Enter a private 4-digit PIN code (e.g., 1234) and confirm it." },
      { num: "03", title: "Lock Specific Category Groups", desc: "Toggle 'Lock Adult', 'Lock Midnight', and any mature movie folders." },
      { num: "04", title: "Pin Kids & Animation to Top Home Shelf", desc: "Go to Channel Groups -> Kids -> Pin to Home Shelf so children can browse cartoons safely with one click." }
    ],
    tip: "🔒 Pro Tip: You can also lock settings changes behind the PIN so kids cannot modify app preferences."
  },
  {
    tag: "ACCOUNT PORTAL",
    title: "Plan Invoices & Renewal Portal Guide",
    sub: "Track active days, download PDF invoices, and manage extra screen add-ons with zero hidden fees.",
    steps: [
      { num: "01", title: "Access Customer Portal", desc: "Visit your member link at loopmint.tv/portal on any phone or laptop browser." },
      { num: "02", title: "Enter Registered WhatsApp Phone Number", desc: "Type your registered phone number to receive a 1-click WhatsApp security login code." },
      { num: "03", title: "View Active Days & Subscriptions", desc: "Check exact expiration dates, active device connections, and download official PDF tax invoices." },
      { num: "04", title: "Renew or Add Extra TV Screens with 15% OFF", desc: "Select 'Renew Plan' or 'Add Extra TV' anytime before expiration to automatically apply your 15% multi-screen discount." }
    ],
    tip: "💳 Pro Tip: All renewals are manual. We NEVER charge your card automatically."
  },
  {
    tag: "DEVICE COMPATIBILITY",
    title: "Selecting the Best App Player for Your Device",
    sub: "Recommended top-rated player apps for Fire Stick, Apple TV, Shield TV, Windows, and Android.",
    steps: [
      { num: "01", title: "Amazon Fire Stick / Fire TV", desc: "Recommended Apps: TiviMate Premium (Best EPG & zapping), XCIPTV, or Downloader App Method." },
      { num: "02", title: "Apple TV / iPhone / iPad", desc: "Recommended Apps: IPTVX, Smarters Pro Lite, or GSE Smart IPTV." },
      { num: "03", title: "Nvidia Shield / Android TV Box", desc: "Recommended Apps: TiviMate, OTT Navigator, or Sparkle TV Player." },
      { num: "04", title: "Windows PC & Apple Mac", desc: "Recommended Apps: IPTV Smarters Desktop or VLC Media Player." }
    ],
    tip: "📱 Pro Tip: The Sales & Setup team can send the correct installation route for your Fire Stick model."
  }
];

function openGuideModal(index) {
  const guide = guidesData[index] || guidesData[0];
  const modal = document.getElementById("guide-modal");
  if (!modal) return;

  document.getElementById("gm-tag").textContent = guide.tag;
  document.getElementById("gm-title").textContent = guide.title;
  document.getElementById("gm-sub").textContent = guide.sub;

  const stepsContainer = document.getElementById("gm-steps-container");
  if (stepsContainer) {
    stepsContainer.innerHTML = guide.steps.map((st) => `
      <div class="g-step-item">
        <span class="g-step-num">${st.num}</span>
        <div class="g-step-content">
          <h4>${st.title}</h4>
          <p>${st.desc}</p>
        </div>
      </div>
    `).join("");
  }

  const tipBox = document.getElementById("gm-tip-box");
  if (tipBox) {
    tipBox.textContent = guide.tip;
  }

  modal.style.display = "flex";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeGuideModal() {
  const modal = document.getElementById("guide-modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Bind Guide Cards Click
document.querySelectorAll(".guide-row .guide-card, .guides-grid .guide-card").forEach((card, idx) => {
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    openGuideModal(idx);
  });
});

document.getElementById("btn-close-guide-modal")?.addEventListener("click", closeGuideModal);
document.getElementById("guide-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "guide-modal") closeGuideModal();
});

// -------------------------------------------------------------
// GLOBAL ANCHOR & CTA BUTTON NAVIGATION HANDLER
// -------------------------------------------------------------
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  const targetId = link.getAttribute("href");
  if (!targetId || targetId === "#") return;

  // Open modal directly if trial CTA
  if (targetId === "#trial") {
    e.preventDefault();
    closeCheckoutModal();
    openTrialModal();
    return;
  }

  const targetEl = document.querySelector(targetId);
  if (targetEl) {
    e.preventDefault();
    const navHeight = 90;
    const elementPosition = targetEl.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
  }
});

// Dynamic Active Section Highlighting in Top Navbar
const navSections = document.querySelectorAll("section[id]");
const navLinksArr = document.querySelectorAll(".nav-links a[href^='#']");

function highlightNavOnScroll() {
  const scrollY = window.pageYOffset;
  navSections.forEach((section) => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 120;
    const sectionId = section.getAttribute("id");

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      navLinksArr.forEach((link) => {
        if (link.getAttribute("href") === "#" + sectionId) {
          link.classList.add("active-nav");
        } else {
          link.classList.remove("active-nav");
        }
      });
    }
  });
}
window.addEventListener("scroll", highlightNavOnScroll);
