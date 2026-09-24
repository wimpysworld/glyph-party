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
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        hasSavedTheme = savedTheme === "light" || savedTheme === "dark";
      } catch {
        hasSavedTheme = false;
      }
      if (!hasSavedTheme) {
        setTheme(event.matches ? "dark" : "light", themeToggle, false);
      }
    });
}

function getCurrentTheme() {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "light" || theme === "dark") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function toggleTheme(themeToggle) {
  const currentTheme = getCurrentTheme();
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
  const currentTheme = getCurrentTheme();
  const isDark = currentTheme === "dark";

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;

  themeToggle.replaceChildren(createThemeIcon(isDark));
}

function createThemeIcon(isDark) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  for (const [name, value] of Object.entries({
    "aria-hidden": "true", width: "20", height: "20",
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": "2",
  })) {
    svg.setAttribute(name, value);
  }

  if (isDark) {
    const circle = document.createElementNS(namespace, "circle");
    for (const [name, value] of Object.entries({ cx: "12", cy: "12", r: "5" })) {
      circle.setAttribute(name, value);
    }
    svg.appendChild(circle);
    for (const [x1, y1, x2, y2] of [
      ["12", "1", "12", "3"], ["12", "21", "12", "23"],
      ["4.22", "4.22", "5.64", "5.64"],
      ["18.36", "18.36", "19.78", "19.78"],
      ["1", "12", "3", "12"], ["21", "12", "23", "12"],
      ["4.22", "19.78", "5.64", "18.36"],
      ["18.36", "5.64", "19.78", "4.22"],
    ]) {
      const line = document.createElementNS(namespace, "line");
      for (const [name, value] of Object.entries({ x1, y1, x2, y2 })) {
        line.setAttribute(name, value);
      }
      svg.appendChild(line);
    }
  } else {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z");
    svg.appendChild(path);
  }
  return svg;
}
