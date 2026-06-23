const STORAGE_KEY = "glyph-party-theme";

export function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  updateThemeButton(themeToggle);

  themeToggle.addEventListener("click", () => {
    toggleTheme(themeToggle);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (event) => {
      let hasSavedTheme = false;
      try {
        hasSavedTheme = !!localStorage.getItem(STORAGE_KEY);
      } catch {
        hasSavedTheme = false;
      }
      if (!hasSavedTheme) {
        setTheme(event.matches ? "dark" : "light", themeToggle, false);
      }
    });
}

function toggleTheme(themeToggle) {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme, themeToggle, true);
}

function setTheme(theme, themeToggle, save = true) {
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButton(themeToggle);

  if (save) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    }
  }
}

function updateThemeButton(themeToggle) {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const isDark = currentTheme === "dark";

  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );

  themeToggle.innerHTML = isDark ? getSunIcon() : getMoonIcon();
}

function getSunIcon() {
  return `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
}

function getMoonIcon() {
  return `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
}
