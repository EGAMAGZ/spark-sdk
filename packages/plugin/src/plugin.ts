import type { Plugin, ResolvedConfig } from 'vite';
import { convertHtmlToAspx } from '../src/template-converter.ts';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

/**
 * Scans the `pages/` directory under the given root path and returns a
 * record mapping page names to their full file paths.
 *
 * Only `.html` files are included; `index.html` is excluded.
 *
 * @param root Project root directory path.
 * @returns Record where keys are page names (without extension) and values are absolute file paths.
 */
function getHtmlFiles(root: string) {
  const pagesDir = 'pages';
  const fullPath = join(root, pagesDir);
  try {
    const files = readdirSync(fullPath);
    const htmlFiles = files.filter((file) =>
      file.endsWith('.html') && file !== 'index.html'
    );
    return htmlFiles.reduce((acc, file) => {
      const name = file.replace('.html', '');
      acc[name] = join(fullPath, file);
      return acc;
    }, {} as Record<string, string>);
  } catch {
    return {};
  }
}

/**
 * Creates a Vite plugin that automates the conversion of HTML pages into
 * SharePoint-compatible ASPX layouts during the build process.
 *
 * The plugin performs two main tasks:
 * 1. **Configuration phase** — Discovers HTML files in the `pages/` directory
 *    and adds them as Rollup input entries so they are bundled as separate pages.
 * 2. **Build phase** — After the build completes, converts each generated `.html`
 *    file in `dist/pages/` to `.aspx` format with SharePoint directives and
 *    content placeholders, then removes the original `.html` files.
 *
 * @returns Array of Vite plugin objects to be used in Vite configuration.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { spark } from '@spark-sdk/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [spark()],
 * });
 * ```
 */
export function spark(): Plugin[] {
  let _config: ResolvedConfig;

  return [
    {
      name: 'spark:config',
      config(config) {
        const root = config.root || process.cwd();
        const htmlInputs = getHtmlFiles(root);
        return {
          build: {
            rollupOptions: {
              input: htmlInputs,
            },
          },
        };
      },
    },
    {
      name: 'spark:build',
      apply: 'build',
      configResolved(resolvedConfig: ResolvedConfig) {
        _config = resolvedConfig;
      },
      writeBundle(options, _bundle) {
        const outDir = options.dir || 'dist';
        const pagesDir = join(outDir, 'pages');
        try {
          const files = readdirSync(pagesDir);
          const htmlFiles = files.filter((file) => file.endsWith('.html'));
          for (const file of htmlFiles) {
            const htmlPath = join(pagesDir, file);
            const content = readFileSync(htmlPath, 'utf-8');
            const aspxContent = convertHtmlToAspx(content);
            const aspxPath = htmlPath.replace('.html', '.aspx');
            writeFileSync(aspxPath, aspxContent);
            unlinkSync(htmlPath);
            console.log(
              `Converted ${file} to ${file.replace('.html', '.aspx')}`,
            );
          }
        } catch (error) {
          console.error('Error in spark plugin writeBundle:', error);
        }
      },
    },
  ];
}
