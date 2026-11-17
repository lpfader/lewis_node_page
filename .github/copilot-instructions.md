# Copilot instructions for lewis_node_page

## Project overview

This repository is a small static-site generator for a GTA job portal directory. The project is intentionally simple: a curated JSON dataset is transformed into a static HTML page that is published via GitHub Pages.

- Canonical source data: `data/portals.json`
- Generator: `src/generatePage.js`
- Generated output: `docs/index.html`
- Styling: `docs/prostyle_v2.css`
- Deployment target: GitHub Pages serving the `docs/` directory

## Build, test, and validation commands

This repo defines the following scripts in `package.json`:

- `npm run build` - regenerate `docs/index.html` from `data/portals.json`
- `npm run check` - validate that the generated file matches the JSON source and fails if it is out of date
- `npm test` - same as `npm run check` (the project uses this as its validation gate)

There is no lint script in `package.json`. Treat `npm run check` as the project’s standard validation command.

Typical edit flow:

1. Update `data/portals.json`
2. Run `npm run build`
3. Run `npm run check` to verify the generated page is up to date

## High-level architecture

The repo follows a very direct generator pipeline:

- `data/portals.json` stores the job directory content as sections and portal entries
- `src/generatePage.js` reads the JSON, validates it, and renders HTML
- `docs/index.html` is the generated artifact checked into the repo for GitHub Pages

The generator includes explicit safety checks rather than trusting hand-edited HTML. It enforces rules like:

- every section must have a title
- every section must contain at least one portal
- every portal must have a company name and URL
- URLs must start with `http://` or `https://`
- duplicate company names are rejected
- duplicate URLs are rejected

This makes `data/portals.json` the real source of truth and `docs/index.html` a derived output.

## Key conventions

- Edit `data/portals.json`, not `docs/index.html`.
- Treat `docs/index.html` as generated output; manual edits can drift from the source and are rejected by the check script.
- Keep portal company names unique within the dataset; the generator uses normalized names to detect duplicates.
- Keep URLs unique and valid; invalid or duplicated links fail generation.
- Keep section structure consistent: `title`, optional `intro`, and a `portals` array.
- If you change page prose that is intentionally part of the app shell (for example the intro text or external links), update the `PAGE` constant in `src/generatePage.js` rather than editing the generated HTML.
- This repository is intentionally static and lightweight; there are no app frameworks, test suites, or build tooling beyond the Node generator.
