/**
 * @module @spark-sdk/vite-plugin
 *
 * Vite plugin that automates the conversion of HTML pages into SharePoint-compatible ASPX layouts.
 *
 * ## Purpose
 *
 * This package provides a seamless build-time integration for Vite projects targeting SharePoint
 * deployments. It automatically discovers HTML files in a `pages/` directory, injects them as
 * additional rollup entry points, and after the build completes converts each `.html` output
 * into a `.aspx` file with the required SharePoint page directives, master page references,
 * and content placeholder structure.
 *
 * ## What it does
 *
 * 1. **Auto-discovers pages** — Scans the `pages/` folder for `.html` files (excluding `index.html`)
 *    and adds them as build entry points so Vite bundles them as separate pages.
 * 2. **Converts to ASPX** — After the build finishes, each generated `.html` file in `dist/pages/`
 *    is transformed into a SharePoint-compatible `.aspx` page:
 *    - Injects `<%@ Page %>` and `<%@ Register %>` directives.
 *    - Wraps body content inside `<asp:Content ContentPlaceHolderId="PlaceHolderMain">`.
 *    - Extracts `<head>` assets (scripts, links, inline styles) and places them in
 *      `PlaceHolderAdditionalPageHead`, wrapping styles in `<SharePoint:StyleBlock>`.
 *    - Rewrites root-relative URLs (`/assets/...`) to be relative, and converts `.html` links
 *      to `.aspx` so internal navigation works in SharePoint.
 * 3. **Cleans up** — Removes the original `.html` files, leaving only `.aspx` outputs ready
 *    for deployment.
 *
 * ## Example
 *
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { spark } from '@spark-sdk/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [spark()],
 * });
 * ```
 *
 * With a project structure like:
 *
 * ```
 * project/
 * ├── pages/
 * │   ├── dashboard.html
 * │   └── reports.html
 * ├── src/
 * │   └── main.ts
 * └── vite.config.ts
 * ```
 *
 * Running `vite build` will produce:
 *
 * ```
 * dist/
 * ├── pages/
 * │   ├── dashboard.aspx   ← SharePoint-ready page
 * │   └── reports.aspx     ← SharePoint-ready page
 * └── assets/
 *     └── ...              ← Bundled JS/CSS
 * ```
 */

export * from './src/plugin.ts';
export * from './src/template-converter.ts';
