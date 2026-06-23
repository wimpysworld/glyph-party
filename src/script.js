/**
 * Glyph Party - Unicode Character Search
 * Static Unicode search UI for terminal-friendly glyphs.
 */

import { copyCharacter, copyToClipboard } from "./clipboard.js";
import {
  hideModal,
  renderCharacters,
  showCharacterDetail,
} from "./render.js";
import { filterCharacters } from "./search.js";
import { initThemeToggle } from "./theme.js";
import { showToast } from "./toast.js";

class GlyphParty {
  constructor() {
    this.characters = [];
    this.filteredCharacters = [];
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";
    this.currentModalChar = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.setupFilters();
    this.filterCharacters();
    this.hideLoading();
    initThemeToggle();
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
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener(
      "input",
      this.debounce((event) => {
        this.currentSearch = event.target.value;
        this.filterCharacters();
      }, 300),
    );

    document
      .getElementById("category-filter")
      .addEventListener("change", (event) => {
        this.currentCategory = event.target.value;
        this.filterCharacters();
      });

    document.getElementById("block-filter").addEventListener("change", (event) => {
      this.currentBlock = event.target.value;
      this.filterCharacters();
    });

    document.getElementById("clear-filters").addEventListener("click", () => {
      this.clearFilters();
    });

    document.getElementById("modal-close").addEventListener("click", () => {
      hideModal();
    });

    document
      .getElementById("character-modal")
      .addEventListener("click", (event) => {
        if (event.target.classList.contains("modal-overlay")) {
          hideModal();
        }
      });

    document.getElementById("copy-char").addEventListener("click", () => {
      copyToClipboard(this.currentModalChar.char, "Character copied!");
    });

    document.getElementById("copy-code").addEventListener("click", () => {
      copyToClipboard(
        `U+${this.currentModalChar.code}`,
        "Unicode code copied!",
      );
    });

    document.getElementById("copy-html").addEventListener("click", () => {
      copyToClipboard(
        `&#${this.currentModalChar.decimal};`,
        "HTML entity copied!",
      );
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideModal();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
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
    this.filteredCharacters = filterCharacters(this.characters, {
      search: this.currentSearch,
      category: this.currentCategory,
      block: this.currentBlock,
    });

    this.renderCharacters();
    this.updateVisibleCount();
  }

  renderCharacters() {
    renderCharacters(this.filteredCharacters, {
      onCopy: copyCharacter,
      onShowDetail: (char) => {
        this.currentModalChar = char;
        showCharacterDetail(char);
      },
    });
  }

  clearFilters() {
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";

    document.getElementById("search-input").value = "";
    document.getElementById("category-filter").value = "";
    document.getElementById("block-filter").value = "";

    this.filterCharacters();
  }

  updateStats() {
    if (this.stats) {
      document.getElementById("total-count").textContent =
        this.stats.totalCharacters.toLocaleString();
      document.getElementById("category-count").textContent =
        this.stats.categories;

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

  showError(message) {
    showToast(message, "error");
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
}

document.addEventListener("DOMContentLoaded", () => {
  window.glyphParty = new GlyphParty();
});
