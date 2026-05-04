/**
 * # @spark-sdk/init
 *
 * CLI tool for scaffolding new Spark SDK projects with a pre-configured Vite + TypeScript template.
 *
 * ## Purpose
 *
 * This package provides a quick-start experience for developers who want to create a new
 * Spark SDK project. It generates a complete project structure with Vite, TypeScript,
 * and the `@spark-sdk/vite-plugin` pre-configured, so you can start building immediately.
 *
 * ## What it does
 *
 * 1. **Project name resolution** — Accepts the project name via CLI argument (`--project`, `-p`,
 *    or positional) or prompts interactively if no argument is provided.
 * 2. **Scaffolds structure** — Creates a directory with the full Vite + TypeScript template:
 *    - `package.json` with `dev`, `build`, and `preview` scripts.
 *    - `tsconfig.json` configured for ES2022 + bundler module resolution.
 *    - `vite.config.ts` with the `@spark-sdk/vite-plugin` already installed.
 *    - `src/` with a minimal counter example (`main.ts`, `counter.ts`, `style.css`).
 *    - `public/` and `pages/` directories for static assets and multi-page support.
 *    - `.gitignore` pre-configured for Node.js/Vite projects.
 * 3. **Validates target** — Exits with an error if the target directory already exists.
 *
 * ## Example
 *
 * ```bash
 * # Using JSR (recommended)
 * deno run -A jsr:@spark-sdk/init my-app
 *
 * # Or with explicit flag
 * deno run -A jsr:@spark-sdk/init --project my-app
 * deno run -A jsr:@spark-sdk/init -p my-app
 *
 * # Interactive prompt (no argument)
 * deno run -A jsr:@spark-sdk/init
 * ```
 *
 * After scaffolding, navigate into the project and install dependencies:
 *
 * ```bash
 * cd my-app
 * deno install
 * deno install jsr:@spark-sdk/vite-plugin
 * deno task dev
 * ```
 *
 * The generated project structure:
 *
 * ```
 * my-app/
 * ├── .gitignore
 * ├── package.json
 * ├── tsconfig.json
 * ├── vite.config.ts
 * ├── src/
 * │   ├── main.ts
 * │   ├── counter.ts
 * │   ├── style.css
 * │   ├── typescript.svg
 * │   └── vite-env.d.ts
 * ├── public/
 * │   └── vite.svg
 * └── pages/
 *     └── counter.html
 * ```
 *
 * @module
 */
import { printLogo } from './src/logo.ts';
import {
  getProjectName,
  printSuccess,
  promptProjectName,
} from './src/prompts.ts';
import { scaffoldProject } from './src/scaffold.ts';

function main() {
  printLogo();

  let projectName = getProjectName(Deno.args);

  if (!projectName) {
    projectName = promptProjectName();
  }

  if (!projectName) {
    console.error('Error: Project name is required.');
    Deno.exit(1);
  }

  scaffoldProject(projectName);
  printSuccess(projectName);
}

main();
