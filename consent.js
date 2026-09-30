(() => {
  const storageKey = 'loopmint_marketing_choice';
  const pixelId = document.querySelector('meta[name="loopmint-meta-pixel"]')?.content;
  const privacyUrl = new URL('privacy.html', document.currentScript.src).href;
  const embeddedTrial = document.documentElement.classList.contains('trial-popup-embed');
  let banner;
  let pixelStarted = false;

  const readChoice = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const writeChoice = (value) => {
    try { localStorage.setItem(storageKey, value); } catch { /* Keep the current page choice. */ }
  };

  function startPixel() {
    if (!pixelId || pixelStarted || embeddedTrial) return;
    pixelStarted = true;
    !function(f,b,e,v,n,t,s) {
      if (f.fbq) return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if (!f._fbq) f._fbq=n;
      n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=true;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',pixelId);
    fbq('track','PageView');
  }

  window.trackLoopMintWhatsAppContact = (destination) => {
    if (readChoice() !== 'accepted' || !pixelStarted || typeof fbq !== 'function') return;
    fbq('track','Contact',{content_name:'WhatsApp',contact_route:destination});
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (!link) return;
    const destination = link.href.includes('447907504571') ? 'support' : 'sales';
    window.trackLoopMintWhatsAppContact(destination);
  }, true);

  function closeBanner() {
    banner?.remove();
    banner = null;
  }

  function choose(value) {
    const previous = readChoice();
    writeChoice(value);
    closeBanner();
    if (value === 'accepted') startPixel();
    if (previous === 'accepted' && value === 'declined' && pixelStarted) location.reload();
  }

  function showBanner() {
    if (embeddedTrial || banner) return;
    banner = document.createElement('aside');
    banner.className = 'lm-consent-banner';
    banner.setAttribute('aria-label', 'Optional tracking choices');
    banner.innerHTML = `<div class="lm-consent-copy"><strong>Optional tracking</strong><p>We use Meta Pixel to measure visits and WhatsApp contact actions only if you agree. The website and free trial work without it. <a href="${privacyUrl}">Read our privacy notice</a>.</p></div><div class="lm-consent-actions"><button type="button" data-choice="declined">Reject optional tracking</button><button type="button" data-choice="accepted">Accept optional tracking</button></div>`;
    banner.addEventListener('click', (event) => {
      const choice = event.target.closest('button[data-choice]')?.dataset.choice;
      if (choice) choose(choice);
    });
    document.body.append(banner);
  }

  window.showLoopMintPrivacyChoices = showBanner;
  document.addEventListener('click', (event) => {
    if (!event.target.closest('a[href="#privacy-choices"], button[data-privacy-choices]')) return;
    event.preventDefault();
    showBanner();
  });

  if (embeddedTrial) return;
  if (readChoice() === 'accepted') startPixel();
  else if (readChoice() !== 'declined') showBanner();
})();
