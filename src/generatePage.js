#!/usr/bin/env node
/**
 * Generates docs/index.html from data/portals.json.
 *
 * Pipeline:  data/portals.json  ->  docs/index.html  ->  GitHub Pages
 *
 *   npm run build     regenerate docs/index.html
 *   npm run check     fail if docs/index.html is out of date (CI guard)
 *
 * docs/index.html is OUTPUT. Editing it by hand is how this project drifted
 * once already: the generator kept a 39-link copy while the shipped page had
 * 58 links, so a single `npm run build` would have deleted 21 job portals.
 * `npm run check` exists to make that impossible to do silently.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const DATA_FILE = path.join(ROOT, "data", "portals.json");
const OUT_FILE = path.join(ROOT, "docs", "index.html");

// Page copy. Directory entries live in portals.json; prose lives here.
const PAGE = {
  title: "Lewis\u2019s Job Search Hub",
  heading: "Lewis\u2019s Job Search Hub",
  bannerImage: "banner.jpg",
  intro: [
    "Hi Everyone! This page is your place for portals to all of the top GTA employers.",
    "This began as a python project and I realized that others may want to use it as well. After a while I wanted to shift towards full stack development and determined that the concept behind my python script would be better served by a Node.js implementation. Most of the links will focus on web development, however you can use this as a launch pad for your project or job search.",
  ],
  // Not directory listings, so they stay with the prose rather than the JSON.
  proseLinks: [
    {
      href: "https://lpfader.github.io/lewis_page/#/resume",
      text: "Here's",
      after: " my resume if you want to check it out or just contact me.",
    },
    {
      href: "https://lpfader.github.io/lewis-coffee/",
      text: "Here it is in the style of Global Village Coffeehouse",
      after: "",
    },
  ],
};

// Text nodes only need & < > escaped. Attribute values also need quotes.
const TEXT_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const ATTR_ESCAPES = { ...TEXT_ESCAPES, '"': "&quot;" };
const escapeHtml = (value) => String(value).replace(/[&<>]/g, (c) => TEXT_ESCAPES[c]);
const escapeAttr = (value) => String(value).replace(/[&<>"]/g, (c) => ATTR_ESCAPES[c]);

function load() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_FILE, "utf8");
  } catch {
    fail(`Cannot read ${path.relative(ROOT, DATA_FILE)}. Run this from the repository.`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`${path.relative(ROOT, DATA_FILE)} is not valid JSON: ${err.message}`);
  }

  const sections = data?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    fail("portals.json has no sections.");
  }
  return sections;
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** Catches the mistakes that are easy to make by hand: typos, dupes, blanks. */
function validate(sections) {
  const problems = [];
  const seenUrls = new Map();
  const seenNames = new Map();

  sections.forEach((section, si) => {
    const where = `section ${si + 1}`;
    if (!section.title) problems.push(`${where}: missing "title"`);

    const portals = section.portals;
    if (!Array.isArray(portals) || portals.length === 0) {
      problems.push(`${where} ("${section.title}"): no portals`);
      return;
    }

    portals.forEach((portal, pi) => {
      const at = `"${section.title}" item ${pi + 1}`;

      if (!portal.company) {
        problems.push(`${at}: missing "company"`);
      } else {
        // Same employer under two links reads as a mistake; give each a distinct label.
        const key = portal.company.trim().toLowerCase();
        if (seenNames.has(key)) {
          problems.push(`${at}: duplicate company name "${portal.company}", already listed as ${seenNames.get(key)}`);
        } else {
          seenNames.set(key, at);
        }
      }
      if (!portal.url) {
        problems.push(`${at}: missing "url"`);
        return;
      }
      if (!/^https?:\/\//i.test(portal.url)) {
        problems.push(`${at}: url must start with http:// or https:// — got "${portal.url}"`);
      }
      if (seenUrls.has(portal.url)) {
        problems.push(`${at}: duplicate url, already listed as ${seenUrls.get(portal.url)}`);
      } else {
        seenUrls.set(portal.url, at);
      }
    });
  });

  if (problems.length > 0) {
    fail(`portals.json has ${problems.length} problem(s):\n   - ${problems.join("\n   - ")}`);
  }

  return seenUrls.size;
}

function renderPortal(portal) {
  const url = escapeAttr(portal.url);
  const name = escapeHtml(portal.company);
  return `      <li><a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a></li>`;
}

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function renderToc(sections) {
  const items = sections
    .map(
      (section) =>
        `      <li><a href="#${slugify(section.title)}">${escapeHtml(section.title)}</a></li>`
    )
    .join("\n");

  return `    <nav class="table-of-contents" aria-label="Table of Contents">
      <h2>Table of Contents</h2>
      <ul>
${items}
      </ul>
    </nav>`;
}

function renderSection(section) {
  const slug = slugify(section.title);
  const intro = section.intro ? `\n      <p class="section-intro">${escapeHtml(section.intro)}</p>` : "";
  const items = section.portals.map(renderPortal).join("\n");

  return `
    <section class="portal-card" id="${slug}">
      <h2 class="decal"><span class="decal-text">${escapeHtml(section.title)}</span></h2>
      <div class="container">${intro}
        <ul>
${items}
        </ul>
      </div>
    </section>
`;
}

function render(sections) {
  const intro = PAGE.intro.map((p) => `    <p>${escapeHtml(p)}</p>`).join("\n");
  const prose = PAGE.proseLinks
    .map(
      ({ href, text, after }) =>
        `    <p><a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>${escapeHtml(after)}</p>`
    )
    .join("\n");
  const toc = renderToc(sections);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(PAGE.title)}</title>
  <link rel="stylesheet" href="prostyle_v2.css" />
</head>
<body>
  <div class="boogie-backdrop" aria-hidden="true">
    <div class="boogie-glow"></div>
    <div class="boogie-sunburst"></div>
    <div class="boogie-dots"></div>
    <div class="boogie-waves"></div>
    <div class="boogie-arcs boogie-arcs-left"></div>
    <div class="boogie-arcs boogie-arcs-right"></div>
  </div>
  <header class="page-header">
    <div class="banner-wrapper">
      <img src="${escapeAttr(PAGE.bannerImage)}" alt="${escapeAttr(PAGE.heading)}" class="header-banner" />
      <h1 class="visually-hidden">${escapeHtml(PAGE.heading)}</h1>
    </div>
${intro}
${prose}
${toc}
  </header>
  <main class="grid-container">
${sections.map(renderSection).join("")}  </main>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------

const sections = load();
const portalCount = validate(sections);
const html = render(sections);

const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let existing = "";
  try {
    existing = fs.readFileSync(OUT_FILE, "utf8");
  } catch {
    fail(`${path.relative(ROOT, OUT_FILE)} is missing. Run: npm run build`);
  }
  if (existing !== html) {
    fail(
      `${path.relative(ROOT, OUT_FILE)} does not match data/portals.json.\n` +
        "   Either it was edited by hand, or the JSON changed without a rebuild.\n" +
        "   Run: npm run build"
    );
  }
  console.log(`docs/index.html is up to date (${sections.length} sections, ${portalCount} portals).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(
  `Generated ${path.relative(ROOT, OUT_FILE)} — ${sections.length} sections, ${portalCount} portals, ${kb} kB.`
);
