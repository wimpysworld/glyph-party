import { showToast } from "./toast.js";

export async function copyToClipboard(text, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
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
      document.body.removeChild(textArea);
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
