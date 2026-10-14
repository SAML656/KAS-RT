/**
 * Application Entry Point & Bootstrapper
 * Kas RT 01 / RW 02 Desa Sladi
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Memulai Sistem Kas RT 01/RW 02...");

  // Load saved theme preference
  const settings = window.store.getSettings();
  if (settings.theme) {
    document.documentElement.setAttribute("data-theme", settings.theme);
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
      themeBtn.textContent = settings.theme === "dark" ? "☀️" : "🌙";
    }
  }

  // Initialize UI Controller
  window.KasUI.init();

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", e => {
    // Ctrl + / or Ctrl + K: Focus search in Buku Kas
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "/")) {
      e.preventDefault();
      window.KasUI.navigateTo("kas");
      setTimeout(() => {
        const searchInput = document.getElementById("kasSearchInput");
        if (searchInput) searchInput.focus();
      }, 100);
    }

    // Ctrl + M: Toggle Admin / Warga mode
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
      e.preventDefault();
      const nextMode = window.KasUI.currentMode === "w" ? "a" : "w";
      window.KasUI.setMode(nextMode);
    }
  });

  console.log("Sistem Kas RT siap digunakan.");
});
