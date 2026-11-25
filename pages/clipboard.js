import { showToast } from "./toast.js";

export async function copyToClipboard(text, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  } catch (error) {
    const previousFocus = document.activeElement;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("aria-label", "Text to copy");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    const copyParent = document.querySelector("dialog[open]") || document.body;
    copyParent.appendChild(textArea);
    textArea.select();

    try {
      const copied = document.execCommand("copy");
      if (!copied) {
        showToast("Copy failed. Please select and copy manually.", "error");
        return false;
      }
      showToast(successMessage);
      return true;
    } catch (fallbackError) {
      showToast("Copy failed. Please select and copy manually.", "error");
      return false;
    } finally {
      textArea.remove();
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    }
  }
}

export async function copyCharacter(char, cardElement) {
  const copied = await copyToClipboard(char.char, `${char.char} copied!`);
  if (!copied) {
    return;
  }

  cardElement.classList.add("copied");
  setTimeout(() => {
    cardElement.classList.remove("copied");
  }, 500);
}
