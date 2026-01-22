/**
 * Glyph Party - Unicode Character Search
 * Beautiful interface for finding Unicode characters
 */

class GlyphParty {
  constructor() {
    this.characters = [];
    this.filteredCharacters = [];
    this.currentSearch = "";
    this.currentCategory = "";
    this.currentBlock = "";
    this.isLoading = true;

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
    this.setupFilters();
    this.showAllCharacters();
    this.hideLoading();
  }

  async loadData() {
    try {
      const response = await fetch("unicode-data.min.json");
      const data = await response.json();

      this.characters = data.characters;
      this.stats = data.stats;

      // Update stats display
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

    // Get unique categories and blocks
    const categories = [
      ...new Set(this.characters.map((char) => char.category)),
    ].sort();
    const blocks = [
      ...new Set(this.characters.map((char) => char.block)),
    ].sort();

    // Populate category filter
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = this.getCategoryName(category);
      categoryFilter.appendChild(option);
    });

    // Populate block filter
    blocks.forEach((block) => {
      const option = document.createElement("option");
      option.value = block;
      option.textContent = block;
      blockFilter.appendChild(option);
    });
  }

  getCategoryName(category) {
    const categoryNames = {
      Sm: "Mathematical Symbols",
      So: "Other Symbols",
      Ps: "Open Punctuation",
      Pe: "Close Punctuation",
      Pd: "Dash Punctuation",
      Po: "Other Punctuation",
      Sc: "Currency Symbols",
      Sk: "Modifier Symbols",
      Mn: "Nonspacing Marks",
      Mc: "Spacing Marks",
      Me: "Enclosing Marks",
      Nd: "Decimal Numbers",
      Nl: "Letter Numbers",
      No: "Other Numbers",
      Zs: "Space Separators",
      Zl: "Line Separators",
      Zp: "Paragraph Separators",
      Cc: "Control Characters",
      Cf: "Format Characters",
      Cs: "Surrogate Characters",
      Co: "Private Use",
      Cn: "Unassigned",
    };

    return categoryNames[category] || category;
  }

  filterCharacters() {
    this.filteredCharacters = this.characters.filter((char) => {
      // Search filter
      if (this.currentSearch) {
        const searchTerm = this.currentSearch;
        const matchesName = char.name.toLowerCase().includes(searchTerm);
        const matchesCode = char.code.toLowerCase().includes(searchTerm);
        const matchesChar = char.char.includes(searchTerm);
        const matchesDesc = char.description
          ?.toLowerCase()
          .includes(searchTerm);

        if (!matchesName && !matchesCode && !matchesChar && !matchesDesc) {
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

    // Limit initial render for performance
    const maxRender = 500;
    const charactersToRender = this.filteredCharacters.slice(0, maxRender);

    grid.innerHTML = "";

    charactersToRender.forEach((char) => {
      const card = this.createCharacterCard(char);
      grid.appendChild(card);
    });

    // Show load more message if there are more characters
    if (this.filteredCharacters.length > maxRender) {
      const loadMore = document.createElement("div");
      loadMore.className = "load-more";
      loadMore.innerHTML = `
                <p>Showing first ${maxRender} of ${this.filteredCharacters.length.toLocaleString()} characters</p>
                <p style="font-size: 0.875rem; color: var(--subtext0); margin-top: 0.5rem;">
                    Use search or filters to narrow results
                </p>
            `;
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
    card.innerHTML = `
            <div class="character-char">${char.char}</div>
            <div class="character-code">U+${char.code}</div>
            <div class="character-name">${char.name}</div>
            <button class="character-info-btn" aria-label="Show details for ${char.name}">
                <i class="fas fa-info-circle"></i>
            </button>
        `;

    // Click to copy (but not on the info button)
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".character-info-btn")) {
        e.preventDefault();
        this.copyCharacter(char, card);
      }
    });

    // Info button for details
    const infoBtn = card.querySelector(".character-info-btn");
    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showCharacterDetail(char);
    });

    return card;
  }

  copyCharacter(char, cardElement) {
    this.copyToClipboard(char.char, `${char.char} copied!`);

    // Visual feedback
    cardElement.classList.add("copied");
    setTimeout(() => {
      cardElement.classList.remove("copied");
    }, 500);
  }

  showCharacterDetail(char) {
    this.currentModalChar = char;

    // Update modal content
    document.getElementById("modal-char").textContent = char.char;
    document.getElementById("modal-name").textContent = char.name;
    document.getElementById("modal-code").textContent = `U+${char.code}`;
    document.getElementById("modal-category").textContent =
      this.getCategoryName(char.category);
    document.getElementById("modal-block").textContent = char.block;
    document.getElementById("modal-decimal").textContent = char.decimal;

    // Show description if present
    const descRow = document.getElementById("modal-description-row");
    if (char.description) {
      document.getElementById("modal-description").textContent =
        char.description;
      descRow.classList.remove("hidden");
    } else {
      descRow.classList.add("hidden");
    }

    // Show modal
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
    this.isLoading = false;
  }

  async copyToClipboard(text, successMessage = "Copied!") {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(successMessage);
    } catch (error) {
      // Fallback for older browsers
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

    // Auto remove after 3 seconds
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
    document.getElementById("loading").innerHTML = `
            <div style="text-align: center; padding: 4rem 0; color: var(--red);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Error Loading Data</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 1rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--red);
                    color: var(--crust);
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                ">Reload Page</button>
            </div>
        `;
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

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.glyphParty = new GlyphParty();
});

// Service worker registration for PWA (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}
