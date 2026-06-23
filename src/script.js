/**
 * Glyph Party - Unicode Character Search
 * Static Unicode search UI for terminal-friendly glyphs.
 */

class GlyphParty {
  constructor() {
    this.characters = [];
    this.filteredCharacters = [];
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";
    this.currentModalChar = null;
    this.themeToggle = null;
    this.STORAGE_KEY = "glyph-party-theme";

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.setupFilters();
    this.showAllCharacters();
    this.hideLoading();
    this.initThemeToggle();
  }

  async loadData() {
    try {
      const response = await fetch("unicode-data.min.json");
      const data = await response.json();

      this.characters = data.characters;
      this.stats = data.stats;

      this.updateStats();

      console.log(
        `✨ Loaded ${this.characters.length.toLocaleString()} characters`,
      );
    } catch (error) {
      console.error("Failed to load Unicode data:", error);
      this.showError("Failed to load Unicode data. Please refresh the page.");
    }
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener(
      "input",
      this.debounce((e) => {
        this.currentSearch = e.target.value.toLowerCase();
        this.filterCharacters();
      }, 300),
    );

    // Filters
    document
      .getElementById("category-filter")
      .addEventListener("change", (e) => {
        this.currentCategory = e.target.value;
        this.filterCharacters();
      });

    document.getElementById("block-filter").addEventListener("change", (e) => {
      this.currentBlock = e.target.value;
      this.filterCharacters();
    });

    // Clear filters
    document.getElementById("clear-filters").addEventListener("click", () => {
      this.clearFilters();
    });

    // Modal events
    document.getElementById("modal-close").addEventListener("click", () => {
      this.hideModal();
    });

    document
      .getElementById("character-modal")
      .addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
          this.hideModal();
        }
      });

    // Modal action buttons
    document.getElementById("copy-char").addEventListener("click", () => {
      this.copyToClipboard(this.currentModalChar.char, "Character copied!");
    });

    document.getElementById("copy-code").addEventListener("click", () => {
      this.copyToClipboard(
        `U+${this.currentModalChar.code}`,
        "Unicode code copied!",
      );
    });

    document.getElementById("copy-html").addEventListener("click", () => {
      this.copyToClipboard(
        `&#${this.currentModalChar.decimal};`,
        "HTML entity copied!",
      );
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input").focus();
      }
    });
  }

  setupFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const blockFilter = document.getElementById("block-filter");

    const categories = [
      ...new Set(this.characters.map((char) => char.category)),
    ].sort();
    const categoryLabels = new Map();
    this.characters.forEach((char) => {
      if (!categoryLabels.has(char.category)) {
        categoryLabels.set(char.category, char.categoryName || char.category);
      }
    });
    const blocks = [
      ...new Set(this.characters.map((char) => char.block)),
    ].sort();

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = categoryLabels.get(category) || category;
      categoryFilter.appendChild(option);
    });

    blocks.forEach((block) => {
      const option = document.createElement("option");
      option.value = block;
      option.textContent = block;
      blockFilter.appendChild(option);
    });
  }

  filterCharacters() {
    this.filteredCharacters = this.characters.filter((char) => {
      // Search filter
      if (this.currentSearch) {
        const searchTerms = this.currentSearch
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        // Match against every visible detail on the character card and modal.
        const searchableText = [
          char.name.toLowerCase(),
          char.code.toLowerCase(),
          char.char,
          char.description?.toLowerCase() || "",
        ].join(" ");

        // All search terms must match so multi-word queries narrow results.
        const allTermsMatch = searchTerms.every((term) =>
          searchableText.includes(term),
        );

        if (!allTermsMatch) {
          return false;
        }
      }

      // Category filter
      if (this.currentCategory && char.category !== this.currentCategory) {
        return false;
      }

      // Block filter
      if (this.currentBlock && char.block !== this.currentBlock) {
        return false;
      }

      return true;
    });

    this.renderCharacters();
    this.updateVisibleCount();
  }

  showAllCharacters() {
    this.filteredCharacters = [...this.characters];
    this.renderCharacters();
    this.updateVisibleCount();
  }

  renderCharacters() {
    const grid = document.getElementById("character-grid");
    const noResults = document.getElementById("no-results");

    if (this.filteredCharacters.length === 0) {
      grid.classList.add("hidden");
      noResults.classList.remove("hidden");
      return;
    }

    noResults.classList.add("hidden");
    grid.classList.remove("hidden");

    // Limit initial paint work while keeping search results responsive.
    const maxRender = 500;
    const charactersToRender = this.filteredCharacters.slice(0, maxRender);

    grid.replaceChildren();

    charactersToRender.forEach((char) => {
      const card = this.createCharacterCard(char);
      grid.appendChild(card);
    });

    if (this.filteredCharacters.length > maxRender) {
      const loadMore = document.createElement("div");
      loadMore.className = "load-more";
      const loadMoreCount = document.createElement("p");
      const renderedCount = this.filteredCharacters.length.toLocaleString();
      loadMoreCount.textContent =
        `Showing first ${maxRender} of ${renderedCount} characters`;
      const loadMoreHint = document.createElement("p");
      loadMoreHint.textContent = "Use search or filters to narrow results";
      loadMoreHint.style.cssText =
        "font-size: 0.875rem; color: var(--subtext0); margin-top: 0.5rem;";
      loadMore.append(loadMoreCount, loadMoreHint);
      loadMore.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 2rem;
                background: var(--surface0);
                border: 1px solid var(--surface1);
                border-radius: 0.75rem;
                color: var(--subtext1);
            `;
      grid.appendChild(loadMore);
    }
  }

  createCharacterCard(char) {
    const card = document.createElement("div");
    card.className = "character-card";

    const character = document.createElement("div");
    character.className = "character-char";
    character.textContent = char.char;

    const code = document.createElement("div");
    code.className = "character-code";
    code.textContent = `U+${char.code}`;

    const name = document.createElement("div");
    name.className = "character-name";
    name.textContent = char.name;

    const infoButton = document.createElement("button");
    infoButton.className = "character-info-btn";
    infoButton.type = "button";
    infoButton.setAttribute("aria-label", `Show details for ${char.name}`);

    const infoIcon = document.createElement("i");
    infoIcon.className = "fas fa-info-circle";
    infoButton.appendChild(infoIcon);

    card.append(character, code, name, infoButton);

    // Card clicks copy unless the detail button handled the click.
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".character-info-btn")) {
        e.preventDefault();
        this.copyCharacter(char, card);
      }
    });

    infoButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCharacterDetail(char);
    });

    return card;
  }

  copyCharacter(char, cardElement) {
    this.copyToClipboard(char.char, `${char.char} copied!`);

    // Brief feedback confirms the copy action without blocking more clicks.
    cardElement.classList.add("copied");
    setTimeout(() => {
      cardElement.classList.remove("copied");
    }, 500);
  }

  showCharacterDetail(char) {
    this.currentModalChar = char;

    document.getElementById("modal-char").textContent = char.char;
    document.getElementById("modal-name").textContent = char.name;
    document.getElementById("modal-code").textContent = `U+${char.code}`;
    document.getElementById("modal-category").textContent =
      char.categoryName || char.category;
    document.getElementById("modal-block").textContent = char.block;
    document.getElementById("modal-decimal").textContent = char.decimal;

    const descRow = document.getElementById("modal-description-row");
    if (char.description) {
      document.getElementById("modal-description").textContent =
        char.description;
      descRow.classList.remove("hidden");
    } else {
      descRow.classList.add("hidden");
    }

    document.getElementById("character-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  hideModal() {
    document.getElementById("character-modal").classList.add("hidden");
    document.body.style.overflow = "";
  }

  clearFilters() {
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";

    document.getElementById("search-input").value = "";
    document.getElementById("category-filter").value = "";
    document.getElementById("block-filter").value = "";

    this.showAllCharacters();
  }

  updateStats() {
    if (this.stats) {
      document.getElementById("total-count").textContent =
        this.stats.totalCharacters.toLocaleString();
      document.getElementById("category-count").textContent =
        this.stats.categories;

      // Update version numbers
      if (this.stats.glyphPartyVersion) {
        document.getElementById("glyph-party-version").textContent =
          `v${this.stats.glyphPartyVersion}`;
      }
      if (this.stats.unicodeVersion) {
        document.getElementById("unicode-version").textContent =
          `Unicode ${this.stats.unicodeVersion}`;
      }
    }
  }

  updateVisibleCount() {
    document.getElementById("visible-count").textContent =
      this.filteredCharacters.length.toLocaleString();
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden");
  }

  async copyToClipboard(text, successMessage = "Copied!") {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(successMessage);
    } catch (error) {
      // Use the legacy copy path when the Clipboard API is unavailable or denied.
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        this.showToast(successMessage);
      } catch (fallbackError) {
        this.showToast(
          "Copy failed. Please select and copy manually.",
          "error",
        );
      }

      document.body.removeChild(textArea);
    }
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Fade toasts before removal so the CSS transition can finish.
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  showError(message) {
    this.showToast(message, "error");
    const loading = document.getElementById("loading");
    const errorPanel = document.createElement("div");
    errorPanel.style.cssText =
      "text-align: center; padding: 4rem 0; color: var(--red);";

    const icon = document.createElement("div");
    icon.style.cssText = "font-size: 3rem; margin-bottom: 1rem;";
    icon.textContent = "⚠️";

    const heading = document.createElement("h3");
    heading.textContent = "Error Loading Data";

    const body = document.createElement("p");
    body.textContent = message;

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.textContent = "Reload Page";
    reloadButton.style.cssText = `
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: var(--red);
      color: var(--crust);
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    `;
    reloadButton.addEventListener("click", () => {
      location.reload();
    });

    errorPanel.append(icon, heading, body, reloadButton);
    loading.replaceChildren(errorPanel);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  initThemeToggle() {
    this.themeToggle = document.getElementById("theme-toggle");
    if (!this.themeToggle) return;

    this.updateThemeButton();

    this.themeToggle.addEventListener("click", () => this.toggleTheme());

    // Follow system theme changes until the user chooses a theme.
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        let hasSavedTheme = false;
        try {
          hasSavedTheme = !!localStorage.getItem(this.STORAGE_KEY);
        } catch {
          hasSavedTheme = false;
        }
        if (!hasSavedTheme) {
          this.setTheme(e.matches ? "dark" : "light", false);
        }
      });
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme, true);
  }

  setTheme(theme, save = true) {
    document.documentElement.setAttribute("data-theme", theme);
    this.updateThemeButton();

    if (save) {
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch {
        // Storage unavailable (private browsing, quota exceeded, etc.)
      }
    }
  }

  updateThemeButton() {
    if (!this.themeToggle) return;

    const currentTheme = document.documentElement.getAttribute("data-theme");
    const isDark = currentTheme === "dark";

    // Keep the accessible name aligned with the next action.
    this.themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );

    // Show the icon for the theme the button will switch to.
    this.themeToggle.innerHTML = isDark
      ? this.getSunIcon()
      : this.getMoonIcon();
  }

  getSunIcon() {
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

  getMoonIcon() {
    return `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.glyphParty = new GlyphParty();
});
