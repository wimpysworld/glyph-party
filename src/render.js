const MAX_RENDER = 500;

export function renderCharacters(characters, callbacks) {
  const grid = document.getElementById("character-grid");
  const noResults = document.getElementById("no-results");

  if (characters.length === 0) {
    grid.classList.add("hidden");
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");
  grid.classList.remove("hidden");

  const charactersToRender = characters.slice(0, MAX_RENDER);
  const nodes = charactersToRender.map((char) =>
    createCharacterCard(char, callbacks),
  );

  if (characters.length > MAX_RENDER) {
    nodes.push(createLoadMore(characters.length));
  }

  grid.replaceChildren(...nodes);
}

function createCharacterCard(char, callbacks) {
  const card = document.createElement("div");
  card.className = "character-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `Copy ${char.name}`);

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

  card.addEventListener("click", (event) => {
    if (!event.target.closest(".character-info-btn")) {
      event.preventDefault();
      callbacks.onCopy(char, card);
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.target !== card) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callbacks.onCopy(char, card);
    }
  });

  infoButton.addEventListener("click", (event) => {
    event.stopPropagation();
    callbacks.onShowDetail(char);
  });

  return card;
}

function createLoadMore(totalCharacters) {
  const loadMore = document.createElement("div");
  loadMore.className = "load-more";

  const loadMoreCount = document.createElement("p");
  const renderedCount = totalCharacters.toLocaleString();
  loadMoreCount.textContent =
    `Showing first ${MAX_RENDER} of ${renderedCount} characters`;

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

  return loadMore;
}

export function showCharacterDetail(char) {
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

export function hideModal() {
  document.getElementById("character-modal").classList.add("hidden");
  document.body.style.overflow = "";
}
