import type { Plugin, ResolvedConfig } from 'vite';
import { convertHtmlToAspx } from '../src/template-converter.ts';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

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
