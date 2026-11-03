function isScrollable(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  const canScroll = overflowY === "auto" || overflowY === "scroll";
  return canScroll && el.scrollHeight > el.clientHeight + 1;
}

function findScrollableAncestor(start: Element | null): Element | null {
  let current = start?.parentElement ?? null;
  while (current && current !== document.body) {
    if (isScrollable(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function scrollNow() {
  const target = document.getElementById("prescription-scroll-target");

  // Le dossier patient defile dans un panneau interne (overflow-y-auto) et non
  // dans window : on remonte donc explicitement le vrai conteneur scrollable.
  const scroller =
    findScrollableAncestor(target) ??
    document.getElementById("prescription-scroll-container") ??
    null;

  if (scroller) {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (target && !scroller) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Certains navigateurs conservent aussi un defilement au niveau du document.
  const docScroller = document.scrollingElement ?? document.documentElement;
  if (docScroller && docScroller.scrollTop > 0) {
    docScroller.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (window.scrollY > 0) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function scrollPrescriptionContentToTop() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Double frame : on attend que React ait applique le rendu (nouvel item
  // ajoute, champs reinitialises) avant de calculer le conteneur scrollable.
  requestAnimationFrame(() => {
    requestAnimationFrame(scrollNow);
  });
}
