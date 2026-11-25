const MAX_RENDER = 500;

export function renderCharacters(characters, callbacks) {
  const grid = document.getElementById("character-grid");
  const noResults = document.getElementById("no-results");

  if (characters.length === 0) {
    grid.classList.add("hidden");
    noResults.classList.remove("hidden");
    grid.replaceChildren();
    return 0;
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
  return charactersToRender.length;
}

function createCharacterCard(char, callbacks) {
  const card = document.createElement("div");
  card.className = "character-card";

  const copyButton = document.createElement("button");
  copyButton.className = "character-copy-btn";
  copyButton.type = "button";
  copyButton.setAttribute("aria-label", `Copy ${char.name}`);
  copyButton.title = `Copy ${char.name}`;

  const character = document.createElement("span");
  character.className = "character-char";
  character.textContent = char.char;

  const code = document.createElement("span");
  code.className = "character-code";
  code.textContent = `U+${char.code}`;

  const name = document.createElement("span");
  name.className = "character-name";
  name.textContent = char.name;

  const infoButton = document.createElement("button");
  infoButton.className = "character-info-btn";
  infoButton.type = "button";
  infoButton.setAttribute("aria-label", `Show details for ${char.name}`);
  infoButton.setAttribute("aria-haspopup", "dialog");
  infoButton.title = `Show details for ${char.name}`;

  const infoIcon = document.createElement("i");
  infoIcon.className = "fas fa-info-circle";
  infoIcon.setAttribute("aria-hidden", "true");
  infoButton.appendChild(infoIcon);

  copyButton.append(character, code, name);
  card.append(copyButton, infoButton);

  copyButton.addEventListener("click", () => {
    callbacks.onCopy(char, card);
  });

  infoButton.addEventListener("click", () => {
    callbacks.onShowDetail(char, infoButton);
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
  loadMoreHint.className = "load-more-hint";

  loadMore.append(loadMoreCount, loadMoreHint);

  return loadMore;
}

export function showCharacterDetail(char, trigger = document.activeElement) {
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

  const modal = document.getElementById("character-modal");
  if (modal.open) return;

  const previousOverflow = document.body.style.overflow;
  const toastContainer = document.getElementById("toast-container");
  const toastParent = toastContainer.parentElement;

  modal.showModal();
  modal.appendChild(toastContainer);
  document.body.style.overflow = "hidden";

  modal.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    toastParent.appendChild(toastContainer);
    const focusTarget = trigger?.isConnected
      ? trigger
      : document.getElementById("search-input");
    focusTarget?.focus();
  }, { once: true });
}

export function hideModal() {
  document.getElementById("character-modal").close();
}
