const trialLinks = document.querySelectorAll('a[href="../index.html#trial"]');

if (trialLinks.length && typeof HTMLDialogElement !== "undefined") {
  const dialog = document.createElement("dialog");
  dialog.className = "blog-trial-dialog";
  dialog.setAttribute("aria-labelledby", "blog-trial-title");
  dialog.innerHTML = `
    <button class="blog-trial-close" type="button" aria-label="Close free trial form">×</button>
    <div class="blog-trial-heading">
      <span class="blog-trial-badge">No payment details needed</span>
      <h2 id="blog-trial-title">Request your free 24-hour trial</h2>
      <p>Enter your details and continue your request on WhatsApp.</p>
    </div>
    <form class="blog-trial-form">
      <label for="blog-trial-name">First name <span aria-hidden="true">*</span></label>
      <input id="blog-trial-name" name="name" type="text" autocomplete="given-name" required>
      <label for="blog-trial-country">Country <span aria-hidden="true">*</span></label>
      <input id="blog-trial-country" name="country" type="text" autocomplete="country-name" placeholder="Where will you watch?" required>
      <label for="blog-trial-phone">WhatsApp number with country code <span aria-hidden="true">*</span></label>
      <input id="blog-trial-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. +353 87 123 4567" required>
      <label for="blog-trial-device">What will you watch on? <span aria-hidden="true">*</span></label>
      <select id="blog-trial-device" name="device" required>
        <option value="" selected disabled>Select your device</option>
        <option>Fire TV device</option>
        <option>Android TV or box</option>
        <option>Smart television</option>
        <option>Apple TV, iPhone, or iPad</option>
        <option>Windows or Mac computer</option>
        <option>MAG or Formuler box</option>
        <option>I am not sure yet</option>
      </select>
      <button class="blog-trial-submit" type="submit">Continue on WhatsApp</button>
    </form>
    <p class="blog-trial-note">Trial availability and viewing options can vary by country and device.</p>
  `;
  document.body.append(dialog);

  let lastTrigger = null;
  const phone = dialog.querySelector("#blog-trial-phone");

  trialLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      lastTrigger = link;
      dialog.showModal();
      document.body.classList.add("blog-modal-open");
      dialog.querySelector("#blog-trial-name").focus();
    });
  });

  dialog.querySelector(".blog-trial-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("blog-modal-open");
    lastTrigger?.focus();
  });
  phone.addEventListener("input", () => phone.setCustomValidity(""));

  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const digits = phone.value.replace(/\D/g, "");
    if (!phone.value.trim().startsWith("+") || digits.length < 7 || digits.length > 15) {
      phone.setCustomValidity("Enter your WhatsApp number with + and the country code.");
      phone.reportValidity();
      return;
    }

    const name = dialog.querySelector("#blog-trial-name").value.trim();
    const country = dialog.querySelector("#blog-trial-country").value.trim();
    const device = dialog.querySelector("#blog-trial-device").value;
    const message = `Hello LoopMint,\nI would like to request a free 24-hour trial.\n\n` +
      `TRIAL DETAILS\nName: ${name}\nCountry: ${country}\nWhatsApp: +${digits}\nDevice: ${device}\n\n` +
      `Please send the matching setup steps and trial details.`;
    window.location.assign(`https://wa.me/447597648884?text=${encodeURIComponent(message)}`);
  });
}
