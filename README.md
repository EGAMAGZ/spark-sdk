# Spark SDK

> _Proof that SharePoint Classic and modern technologies still have a place
> today._

---

## Why did I create this?

During my brief time working within the Microsoft 365 ecosystem, our only tools
were the ones the platform itself provided. When the need arose to build a
management dashboard for a client, SharePoint Classic was the chosen route.

On my own research, I found no sufficient documentation or JavaScript packages
that would ease development — or that I could easily adopt given the tight
timeline and my familiarity with modern technologies. On top of that, the
internal project example I was given as reference (built vanilla for another
client) was significantly larger and more complex, yet riddled with bad
practices, code smells, unmaintainable patterns, and unnecessary complexity.

Faced with this, I decided to build my own alternatives using modern tooling:
**Deno** (chiefly for its devtools and TypeScript out of the box), **Vite** (for
local dev and building the site into a valid format), and **ECMAScript** (no
need to explain why).

These tools were developed in under 8 hours, resulting in some rough edges
regarding logic separation and inconsistencies; however, core functionality
remains intact. Due to personal circumstances, further development was halted. I
aimed to finalize the project while preserving the original logic, avoiding
changes that could compromise usability

---

## ⚠️ Important note

> [!WARNING]
> This is a **proof of concept** and a formalization of tools I built during my
> time working with SharePoint Classic at a previous job. **There will be no
> maintenance or official publication in the near future**, as I no longer have
> access to these tools or a Microsoft 365 tenant to continue development.

---

## Modules

Spark SDK consists of two main modules:

### `@spark-sdk/core`

**Type-safe client for interacting with SharePoint lists.**

Provides a fluent, typed API for CRUD operations on SharePoint lists using the
JavaScript Object Model (JSOM). Abstracts away the complexity of CAML queries,
context initialization, and field mapping.

- **List configuration** — Define schemas with `SPListBuilder`, mapping friendly
  names to actual SharePoint columns, with built-in validation.
- **Singleton client** — `SharePointClient` handles initialization, context
  management, and exposes `create()`, `read()`, `search()`, `getById()`,
  `update()`, and `delete()`.
- **Type safety** — Generic types (`SPListConfig`, `SPFields`, `SPResponse`)
  propagate your list schema across all operations, providing autocomplete and
  compile-time checks.

```ts
import { SharePointClient, SPListBuilder } from '@spark-sdk/core';

const tasks = SPListBuilder.create('Tasks', {
  description: 'Description',
  status: 'Status',
  dueDate: 'DueDate',
});

const client = SharePointClient.getInstance();
await client.initialize();

await client.create(tasks, {
  title: 'Review Q2 report',
  status: 'Pending',
  dueDate: '2026-06-01',
});
```

### `@spark-sdk/vite-plugin`

**Vite plugin that converts HTML to SharePoint-compatible ASPX.**

Build-time integration for Vite projects deploying to SharePoint. Automatically
discovers HTML files in a `pages/` directory, registers them as additional entry
points, and after the build converts each generated `.html` into an `.aspx` file
with the required page directives, master page references, and content
placeholder structure.

- **Auto-discovers pages** — Scans `pages/` for `.html` files (excluding
  `index.html`) and registers them as build entry points.
- **Converts to ASPX** — Injects `<%@ Page %>` and `<%@ Register %>` directives,
  wraps `<body>` content in `PlaceHolderMain`, extracts `<head>` assets to
  `PlaceHolderAdditionalPageHead`, and rewrites relative URLs and `.html` →
  `.aspx` links.
- **Auto-cleanup** — Removes the original `.html` files, leaving only `.aspx`
  outputs ready for deployment.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { spark } from '@spark-sdk/vite-plugin';

export default defineConfig({
  plugins: [spark()],
});
```

---

## References & antecedents

These projects were the original foundation and reference for Spark SDK:

### Original SharePointClient script (Gist)

The original version of the SharePoint client, written as a vanilla JavaScript
script:

```
https://gist.github.com/EGAMAGZ/9eca8f3ddabf2cf47ada2ebbc7e13738
```

### Vite plugin repository (early version)

An early version of the Vite plugin for HTML → ASPX conversion:

```
https://github.com/EGAMAGZ/vite-sharepoint-pages/
```

---

## License

[MIT](LICENSE)
