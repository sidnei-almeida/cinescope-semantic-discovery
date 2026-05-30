const HIGHLIGHT_NAME = "page-find";
const ACTIVE_HIGHLIGHT_NAME = "page-find-active";
const MARK_CLASS = "page-find-mark";
const MARK_ACTIVE_CLASS = "page-find-mark--active";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "BUTTON",
]);

let markNodes = [];

function getSearchRoot() {
  return document.querySelector("main.site-main, main");
}

function shouldSkipNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest(".site-header, .loading-screen")) return true;
  if (parent.closest("[data-page-find-ignore]")) return true;
  return false;
}

function collectTextRanges(root, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const ranges = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    if (!shouldSkipNode(node)) {
      const text = node.textContent ?? "";
      const haystack = text.toLowerCase();
      let from = 0;

      while (from < haystack.length) {
        const index = haystack.indexOf(needle, from);
        if (index === -1) break;

        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + needle.length);
        ranges.push(range);
        from = index + needle.length;
      }
    }
    node = walker.nextNode();
  }

  return ranges;
}

function clearMarkFallback() {
  for (const mark of markNodes) {
    const parent = mark.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
    parent.normalize();
  }
  markNodes = [];
}

function applyMarkFallback(ranges, activeIndex) {
  clearMarkFallback();

  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const range = ranges[i];
    const mark = document.createElement("mark");
    mark.className =
      i === activeIndex
        ? `${MARK_CLASS} ${MARK_ACTIVE_CLASS}`
        : MARK_CLASS;
    try {
      range.surroundContents(mark);
      markNodes.push(mark);
    } catch {
      /* ranges spanning partial elements are skipped */
    }
  }
}

function supportsCssHighlight() {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

export function clearPageFind() {
  if (supportsCssHighlight()) {
    CSS.highlights.delete(HIGHLIGHT_NAME);
    CSS.highlights.delete(ACTIVE_HIGHLIGHT_NAME);
  }
  clearMarkFallback();
}

export function applyPageFind(query) {
  clearPageFind();

  const trimmed = query.trim();
  if (!trimmed) return { total: 0, activeIndex: -1 };

  const root = getSearchRoot();
  if (!root) return { total: 0, activeIndex: -1 };

  const ranges = collectTextRanges(root, trimmed);
  if (ranges.length === 0) return { total: 0, activeIndex: -1 };

  const activeIndex = 0;

  if (supportsCssHighlight()) {
    const highlight = new Highlight(...ranges);
    CSS.highlights.set(HIGHLIGHT_NAME, highlight);

    const activeRange = ranges[activeIndex];
    if (activeRange) {
      CSS.highlights.set(ACTIVE_HIGHLIGHT_NAME, new Highlight(activeRange));
      const el =
        activeRange.startContainer.nodeType === Node.TEXT_NODE
          ? activeRange.startContainer.parentElement
          : activeRange.startContainer;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  } else {
    applyMarkFallback(ranges, activeIndex);
    const first = markNodes[0];
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return { total: ranges.length, activeIndex };
}

export function stepPageFind(query, direction = 1, currentIndexHint = -1) {
  const trimmed = query.trim();
  if (!trimmed) return { total: 0, activeIndex: -1 };

  const root = getSearchRoot();
  if (!root) return { total: 0, activeIndex: -1 };

  let previousIndex = currentIndexHint;

  if (supportsCssHighlight()) {
    const activeHighlight = CSS.highlights.get(ACTIVE_HIGHLIGHT_NAME);
    const current = activeHighlight?.size ? [...activeHighlight][0] : null;
    if (current) {
      const probe = collectTextRanges(root, trimmed);
      previousIndex = probe.findIndex(
        (r) =>
          r.startContainer === current.startContainer &&
          r.startOffset === current.startOffset
      );
    }
  } else {
    const currentMark = markNodes.find((m) =>
      m.classList.contains(MARK_ACTIVE_CLASS)
    );
    if (currentMark) previousIndex = markNodes.indexOf(currentMark);
  }

  clearPageFind();
  const ranges = collectTextRanges(root, trimmed);
  if (ranges.length === 0) return { total: 0, activeIndex: -1 };

  const activeIndex =
    (previousIndex + direction + ranges.length) % ranges.length;

  if (supportsCssHighlight()) {
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
    CSS.highlights.set(
      ACTIVE_HIGHLIGHT_NAME,
      new Highlight(ranges[activeIndex])
    );
  } else {
    applyMarkFallback(ranges, activeIndex);
  }

  const activeRange = ranges[activeIndex];
  const scrollTarget = supportsCssHighlight()
    ? activeRange?.startContainer.parentElement
    : markNodes[activeIndex];
  scrollTarget?.scrollIntoView({ block: "center", behavior: "smooth" });

  return { total: ranges.length, activeIndex };
}
