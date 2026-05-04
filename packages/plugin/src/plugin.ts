import type { Plugin, ResolvedConfig } from 'vite';
import { convertHtmlToAspx } from '../src/template-converter.ts';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

function getHtmlFiles(root: string) {
  const pagesDir = 'pages';
  const fullPath = join(root, pagesDir);
  try {
    const files = readdirSync(fullPath);
    const htmlFiles = files.filter((file) => file.endsWith('.html') && file !== 'index.html');
    return htmlFiles.reduce((acc, file) => {
      const name = file.replace('.html', '');
      acc[name] = join(fullPath, file);
      return acc;
    }, {} as Record<string, string>);
  } catch {
    // If pages directory doesn't exist, return empty
    return {};
  }
}

export function spark(): Plugin[] {
  let config: ResolvedConfig;

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
        config = resolvedConfig;
      },
      generateBundle(_output, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (!fileName.endsWith('.html')) continue;

          if (chunk.type !== 'asset') continue;

          if (typeof chunk.source !== 'string') continue;

          const aspxFileName = fileName.replace(/.html$/, '.aspx');
          const aspxContent = convertHtmlToAspx(chunk.source);

          this.emitFile({
            type: 'asset',
            fileName: aspxFileName,
            source: aspxContent,
          });

          delete bundle[fileName];
        }
      },
    },
  ];
}
