
import { supabase } from "./supabase.js";

/*
  HANOON WORLD
  Public Page Runtime
  Applies published homepage content safely.
*/

const PAGE_KEY = "homepage";

const DEFAULT_SELECTORS = {
  intro: ".intro",
  hero: ".hero",
  categories: ".section:has(.category-grid)",
  games: "#gamesGrid",
  promo: ".promo",
  rooms: "#roomsGrid",
  live: ".live-grid"
};

const ALLOWED_COLORS = /^#[0-9a-fA-F]{6}$/;

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.slice(0, 2000);
}

function safeUrl(value) {
  if (typeof value !== "string") return "#";

  const url = value.trim();

  if (
    url.startsWith("#") ||
    url.startsWith("./") ||
    url.startsWith("../")
  ) return url;

  try {
    const parsed = new URL(url, location.origin);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.href;
    }
  } catch {}

  return "#";
}

function safeColor(value, fallback) {
  return typeof value === "string" && ALLOWED_COLORS.test(value)
    ? value
    : fallback;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function setText(element, value) {
  if (!element || typeof value !== "string") return;

  element.textContent = value.slice(0, 2000);
}

function setLink(element, url, label) {
  if (!element) return;

  element.href = safeUrl(url);

  if (typeof label === "string") {
    element.textContent = label;
  }
}

function getMainContainer() {
  return document.querySelector(".app") ||
    document.querySelector("main") ||
    document.body;
}

function getBlockElement(block) {
  const selectors = {
    intro: ".intro",
    hero: ".hero",
    categories: ".section:has(.category-grid)",
    games: "#gamesGrid",
    promo: ".promo",
    rooms: "#roomsGrid",
    live: ".live-grid"
  };

  const selector = selectors[block.id];

  if (!selector) return null;

  const target = document.querySelector(selector);

  if (!target) return null;

  if (
    block.id === "games" ||
    block.id === "rooms" ||
    block.id === "live"
  ) {
    return target.closest(".section") || target;
  }

  return target;
}

function updateIntro(block) {
  const section = document.querySelector(".intro");
  if (!section) return;

  const heading = section.querySelector("h1");
  const description = section.querySelector("p");

  if (heading && block.title) {
    heading.textContent = block.title;
  }

  if (description && block.text) {
    description.textContent = block.text;
  }
}

function updateHero(block) {
  const section = document.querySelector(".hero");
  if (!section) return;

  const eyebrow = section.querySelector(".hero-label");
  const heading = section.querySelector("h2");
  const description = section.querySelector(".hero-content p");
  const buttons = section.querySelectorAll(".hero-buttons a");

  if (eyebrow && block.eyebrow) {
    setText(eyebrow, block.eyebrow);
  }

  if (heading && block.title) {
    heading.textContent = block.title;
  }

  if (description && block.text) {
    setText(description, block.text);
  }

  if (buttons[0] && block.buttonText) {
    setLink(buttons[0], block.buttonUrl, block.buttonText);
  }
}

function updateCategories(block) {
  const section = document.querySelector(".section:has(.category-grid)");
  if (!section) return;

  const heading = section.querySelector(".section-heading h3");
  const description = section.querySelector(".section-heading p");

  if (heading && block.title) {
    setText(heading, block.title);
  }

  if (description && block.text) {
    setText(description, block.text);
  }

  if (!Array.isArray(block.items)) return;

  const cards = section.querySelectorAll(".category-card");

  block.items.slice(0, cards.length).forEach((item, index) => {
    const card = cards[index];
    if (!card) return;

    const title = card.querySelector("strong");
    const text = card.querySelector("small");

    if (title && item.title) setText(title, item.title);
    if (text && item.text) setText(text, item.text);
  });
}

function updatePromo(block) {
  const section = document.querySelector(".promo");
  if (!section) return;

  const heading = section.querySelector("h3");
  const description = section.querySelector("p");
  const button = section.querySelector("a");

  if (heading && block.title) setText(heading, block.title);
  if (description && block.text) setText(description, block.text);

  if (button && block.buttonText) {
    setLink(button, block.buttonUrl, block.buttonText);
  }
}

function updateSystemHeading(block) {
  const target = getBlockElement(block);
  if (!target) return;

  const heading = target.querySelector(".section-heading h3");
  const description = target.querySelector(".section-heading p");

  if (heading && block.title) {
    setText(heading, block.title);
  }

  if (description && block.text) {
    setText(description, block.text);
  }
}

function buildCards(block) {
  const section = createElement("section", "section");
  const header = createElement("div", "section-head");
  const headingWrap = createElement("div", "section-heading");
  const heading = createElement("h3", "", safeText(block.title, "قسم جديد"));

  headingWrap.appendChild(heading);
  header.appendChild(headingWrap);
  section.appendChild(header);

  if (block.text) {
    section.appendChild(createElement("p", "", safeText(block.text)));
  }

  const grid = createElement("div", "category-grid");

  const items = Array.isArray(block.items) ? block.items : [];

  items.slice(0, 20).forEach(item => {
    const card = createElement("article", "category-card");
    const content = createElement("div");
    const title = createElement("strong", "", safeText(item.title, "بطاقة"));
    const description = createElement("small", "", safeText(item.text));

    content.append(title, description);
    card.appendChild(content);

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function buildTextBlock(block) {
  const section = createElement("section", "section");
  const heading = createElement("h3", "", safeText(block.title, "عنوان"));
  const paragraph = createElement("p", "", safeText(block.text));

  section.append(heading, paragraph);
  return section;
}

function buildImageBlock(block) {
  const section = createElement("section", "section");

  const heading = createElement("h3", "", safeText(block.title, "صورة"));
  section.appendChild(heading);

  if (typeof block.imageUrl === "string") {
    const url = safeUrl(block.imageUrl);

    if (url !== "#") {
      const image = document.createElement("img");

      image.src = url;
      image.alt = safeText(block.title);
      image.loading = "lazy";
      image.style.cssText =
        "width:100%;max-height:400px;object-fit:cover;border-radius:18px;margin-top:12px";

      section.appendChild(image);
    }
  }

  if (block.text) {
    section.appendChild(
      createElement("p", "", safeText(block.text))
    );
  }

  return section;
}

function buildNewBlock(block) {
  if (block.type === "cards") return buildCards(block);
  if (block.type === "image") return buildImageBlock(block);

  if (block.type === "text") return buildTextBlock(block);

  if (block.type === "hero" || block.type === "banner") {
    const section = createElement("section", "section");
    const heading = createElement("h2", "", safeText(block.title));
    const paragraph = createElement("p", "", safeText(block.text));

    section.append(heading, paragraph);

    if (block.buttonText) {
      const link = createElement("a", "btn-primary", block.buttonText);
      link.href = safeUrl(block.buttonUrl);
      link.style.marginTop = "15px";
      section.appendChild(link);
    }

    return section;
  }

  return null;
}

function applyTheme(theme) {
  if (!theme || typeof theme !== "object") return;

  const accent = safeColor(theme.accent, null);
  const background = safeColor(theme.background, null);
  const text = safeColor(theme.text, null);

  const root = document.documentElement;

  if (accent) {
    root.style.setProperty("--purple", accent);
    root.style.setProperty("--purple2", accent);
  }

  if (background) {
    root.style.setProperty("--bg", background);
    document.body.style.backgroundColor = background;
  }

  if (text) {
    root.style.setProperty("--text", text);
    document.body.style.color = text;
  }
}

function applyExistingBlock(block) {
  switch (block.id) {
    case "intro":
      updateIntro(block);
      return true;

    case "hero":
      updateHero(block);
      return true;

    case "categories":
      updateCategories(block);
      return true;

    case "promo":
      updatePromo(block);
      return true;

    case "games":
    case "rooms":
    case "live":
      updateSystemHeading(block);
      return true;

    default:
      return false;
  }
}

function applyPublishedDocument(documentData) {
  if (!documentData || typeof documentData !== "object") return;

  const blocks = Array.isArray(documentData.blocks)
    ? documentData.blocks.slice(0, 100)
    : [];

  applyTheme(documentData.theme);

  const app = getMainContainer();
  const footer = document.querySelector("footer");
  const bottomNav = document.querySelector(".bottom-nav");

  const originalElements = new Map();

  blocks.forEach(block => {
    if (!block || typeof block !== "object") return;

    const element = getBlockElement(block);

    if (element) {
      originalElements.set(block.id, element);
    }
  });

  const orderedElements = [];

  blocks.forEach(block => {
    if (!block || typeof block !== "object") return;

    const isSystem = block.type === "system";

    let element = originalElements.get(block.id);

    if (!element && !isSystem) {
      element = buildNewBlock(block);

      if (element) {
        element.dataset.hanoonCustomBlock = block.id;
      }
    }

    if (!element) return;

    element.hidden = block.visible === false;

    if (block.visible !== false) {
      if (!isSystem) {
        applyExistingBlock(block);
      }

      orderedElements.push(element);
    }
  });

  /*
    Preserve the dynamic game and room grids.
    Their cards continue to be rendered by the original page scripts.
  */

  const protectedGrids = [
    document.querySelector("#gamesGrid"),
    document.querySelector("#roomsGrid")
  ].filter(Boolean);

  protectedGrids.forEach(grid => {
    grid.dataset.hanoonDynamic = "true";
  });

  /*
    Only reorder existing homepage sections.
    Header, search, dynamic game cards, room cards,
    footer, and bottom navigation remain intact.
  */

  const managedSections = new Set(
    Array.from(originalElements.values())
  );

  const customSections = Array.from(
    app.querySelectorAll("[data-hanoon-custom-block]")
  );

  customSections.forEach(section => managedSections.add(section));

  const firstManaged = Array.from(managedSections)
    .find(element => element.parentElement === app);

  if (!firstManaged) {
    if (footer) {
      orderedElements.forEach(element => {
        if (element.parentElement === app) {
          app.insertBefore(element, footer);
        }
      });
    }
    return;
  }

  let insertionPoint = firstManaged;

  orderedElements.forEach(element => {
    if (element.parentElement !== app) return;

    app.insertBefore(element, insertionPoint);
    insertionPoint = element.nextElementSibling;
  });

  /*
    The footer and bottom navigation are never removed.
  */
  if (footer && !footer.isConnected) {
    app.appendChild(footer);
  }

  if (bottomNav) {
    bottomNav.hidden = false;
  }
}

export async function loadPublishedHomepage() {
  try {
    const { data, error } = await supabase.rpc(
      "hanoon_get_published_page",
      { p_content_key: PAGE_KEY }
    );

    if (error) {
      throw error;
    }

    if (!data || typeof data !== "object") {
      return false;
    }

    const publishedContent = data.content;

    if (
      !publishedContent ||
      typeof publishedContent !== "object"
    ) {
      return false;
    }

    applyPublishedDocument(publishedContent);

    document.documentElement.dataset.hanoonPublished = "true";

    return true;

  } catch (error) {
    console.error("HANOON published page:", error);
    return false;
  }
}

loadPublishedHomepage();
