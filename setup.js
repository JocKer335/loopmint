function settleSetupHash() {
  if (!window.location.hash) return;
  let targetId = window.location.hash.slice(1);
  try {
    targetId = decodeURIComponent(targetId);
  } catch {
    return;
  }

  const target = document.getElementById(targetId);
  if (!target || !target.classList.contains("setup-guide")) return;

  window.setTimeout(() => {
    const headerOffset = 96;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: targetTop, behavior: "instant" });
  }, 120);
}

window.addEventListener("pageshow", settleSetupHash);
document.fonts?.ready.then(settleSetupHash);
