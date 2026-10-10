const trialLinks = document.querySelectorAll('a[href="../#trial"]');
let trialFrame = null;
let lastTrialTrigger = null;

function closeBlogTrial() {
  trialFrame?.remove();
  trialFrame = null;
  document.body.classList.remove("blog-modal-open");
  lastTrialTrigger?.focus();
}

trialLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (trialFrame) return;
    lastTrialTrigger = link;
    trialFrame = document.createElement("iframe");
    trialFrame.className = "blog-trial-frame";
    trialFrame.title = "Request your free 24-hour trial";
    trialFrame.src = "../#trial-embed";
    document.body.classList.add("blog-modal-open");
    document.body.append(trialFrame);
  });
});

window.addEventListener("message", (event) => {
  if (!trialFrame || event.source !== trialFrame.contentWindow) return;
  if (window.location.protocol !== "file:" && event.origin !== window.location.origin) return;

  if (event.data?.type === "loopmint-trial-close") {
    closeBlogTrial();
  } else if (event.data?.type === "loopmint-trial-whatsapp" &&
             typeof event.data.url === "string" &&
             event.data.url.startsWith("https://wa.me/447597648884?text=")) {
    const url = event.data.url;
    closeBlogTrial();
    window.location.assign(url);
  }
});
