import { type Plugin, type ResolvedConfig } from 'vite';
import { convertHtmlToAspx } from './template-converter.ts';

export default function spark(): Plugin[] {
  let config: ResolvedConfig;

  return [
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
