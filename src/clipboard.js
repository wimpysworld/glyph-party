import { showToast } from "./toast.js";

export async function copyToClipboard(text, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      showToast(successMessage);
    } catch (fallbackError) {
      showToast("Copy failed. Please select and copy manually.", "error");
    }

    document.body.removeChild(textArea);
  }
}

export function copyCharacter(char, cardElement) {
  copyToClipboard(char.char, `${char.char} copied!`);

  cardElement.classList.add("copied");
  setTimeout(() => {
    cardElement.classList.remove("copied");
  }, 500);
}
