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

class GlyphParty {
  constructor() {
    this.characters = [];
    this.filteredCharacters = [];
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";
    this.currentModalChar = null;
    this.dataLoaded = false;
    this.renderedCount = 0;

    this.init();
  }

  async init() {
    this.bindEvents();
    initThemeToggle();
    if (!(await this.loadData())) return;

    this.dataLoaded = true;
    this.setupFilters();
    this.filterCharacters();
    this.hideLoading();
  }

  async loadData() {
    try {
      const response = await fetch("unicode-data.min.json");
      if (!response.ok) {
        throw new Error(`Unicode data request failed (${response.status})`);
      }
      const data = await response.json();
      if (!Array.isArray(data.characters)) {
        throw new Error("Unicode data does not contain a character list");
      }

      this.characters = data.characters;
      this.stats = data.stats;

      this.updateStats();

      console.log(
        `✨ Loaded ${this.characters.length.toLocaleString()} characters`,
      );
      return true;
    } catch (error) {
      console.error("Failed to load Unicode data:", error);
      this.showError("Failed to load Unicode data. Please reload the page.");
      return false;
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

    const modal = document.getElementById("character-modal");
    modal.addEventListener("click", (event) => {
      if (event.target !== modal) return;

      const bounds = modal.getBoundingClientRect();
      if (
        event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom
      ) {
        hideModal();
      }
    });
    modal.addEventListener("close", () => {
      this.currentModalChar = null;
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
      if (
        !modal.open &&
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"
      ) {
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
    if (!this.dataLoaded) return;

    this.filteredCharacters = filterCharacters(this.characters, {
      search: this.currentSearch,
      category: this.currentCategory,
      block: this.currentBlock,
    });

    this.renderCharacters();
    this.updateVisibleCount();
  }

  renderCharacters() {
    this.renderedCount = renderCharacters(this.filteredCharacters, {
      onCopy: copyCharacter,
      onShowDetail: (char, trigger) => {
        this.currentModalChar = char;
        showCharacterDetail(char, trigger);
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
      document.getElementById("character-stats").classList.remove("hidden");
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
    const shown = this.renderedCount.toLocaleString();
    const matched = this.filteredCharacters.length.toLocaleString();
    document.getElementById("visible-count").textContent =
      this.renderedCount < this.filteredCharacters.length
        ? `${shown} of ${matched}`
        : shown;
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden");
  }

  showError(message) {
    const loading = document.getElementById("loading");
    loading.removeAttribute("role");
    const errorPanel = document.createElement("div");
    errorPanel.className = "error-panel";
    errorPanel.setAttribute("role", "alert");

    const icon = document.createElement("div");
    icon.className = "error-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⚠️";

    const heading = document.createElement("h3");
    heading.textContent = "Could not load characters";

    const body = document.createElement("p");
    body.textContent = message;

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.textContent = "Reload page";
    reloadButton.className = "btn error-reload";
    reloadButton.addEventListener("click", () => {
      location.reload();
    });

    errorPanel.append(icon, heading, body, reloadButton);
    loading.replaceChildren(errorPanel);
    loading.scrollIntoView?.({ block: "center" });
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
