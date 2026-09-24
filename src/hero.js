export function initHero() {
  const toggle = document.getElementById("intro-toggle");
  let collapsed = false;
  let autoCollapse = true;

  function setCollapsed(value) {
    collapsed = value;
    document.documentElement.classList.toggle("intro-collapsed", collapsed);
    toggle.textContent = collapsed ? "Show introduction" : "Hide introduction";
    toggle.setAttribute("aria-expanded", String(!collapsed));
  }

  setCollapsed(false);

  toggle.addEventListener("click", () => {
    autoCollapse = false;
    setCollapsed(!collapsed);
  });

  return {
    collapseOnIntent() {
      if (!autoCollapse) return;
      autoCollapse = false;
      setCollapsed(true);
    },
  };
}
