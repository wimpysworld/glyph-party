let referenceFontPromise;

function loadReferenceFont() {
  if (!referenceFontPromise) {
    referenceFontPromise = (async () => {
      const url =
        "https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTei9eI8daxVHDyfisHr71ypY.woff2";
      const font = new FontFace(
        "Glyph Party Noto Symbols 2",
        `url("${url}")`,
        { style: "normal", weight: "400" },
      );
      await font.load();
      document.fonts.add(font);
    })().catch((error) => {
      referenceFontPromise = null;
      throw error;
    });
  }
  return referenceFontPromise;
}

export function initPreviewFont() {
  const selector = document.getElementById("preview-font");
  const status = document.getElementById("preview-status");
  const modalMode = document.getElementById("modal-preview-mode");
  if (!selector || !status || !modalMode) return;

  let selectionVersion = 0;
  const localStatus = "Local browser fonts are active.";

  function updatePreview(reference, message) {
    document.documentElement.classList.toggle("reference-preview", reference);
    status.textContent = message;
    modalMode.textContent = reference
      ? "Preview: Noto Sans Symbols 2 with local fallback."
      : "Preview: local browser fonts.";
  }

  selector.value = "local";
  updatePreview(false, localStatus);

  selector.addEventListener("change", async () => {
    const version = ++selectionVersion;
    if (selector.value !== "reference") {
      updatePreview(false, localStatus);
      return;
    }

    if (
      typeof FontFace !== "function" ||
      typeof document.fonts?.add !== "function"
    ) {
      selector.value = "local";
      updatePreview(
        false,
        "This browser cannot load the optional Noto preview. Local fonts remain active. Try a newer browser for Noto previews.",
      );
      return;
    }

    updatePreview(
      false,
      "Loading Noto Sans Symbols 2. Local fonts remain active. You can switch back at any time.",
    );

    try {
      await loadReferenceFont();
      if (version !== selectionVersion || selector.value !== "reference") return;
      updatePreview(
        true,
        "Noto Sans Symbols 2 is active. Other characters use local fonts.",
      );
    } catch {
      if (version !== selectionVersion || selector.value !== "reference") return;
      selector.value = "local";
      updatePreview(
        false,
        "The Noto preview could not load. Local fonts remain active. Select Noto again to retry.",
      );
    }
  });
}
