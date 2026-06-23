export function filterCharacters(characters, filters) {
  const search = filters.search || "";
  const category = filters.category || "";
  const block = filters.block || "";

  return characters.filter((char) => {
    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);
      const searchableText = [
        char.name.toLowerCase(),
        char.code.toLowerCase(),
        char.char,
        char.description?.toLowerCase() || "",
      ].join(" ");

      const allTermsMatch = searchTerms.every((term) =>
        searchableText.includes(term),
      );

      if (!allTermsMatch) {
        return false;
      }
    }

    if (category && char.category !== category) {
      return false;
    }

    if (block && char.block !== block) {
      return false;
    }

    return true;
  });
}
