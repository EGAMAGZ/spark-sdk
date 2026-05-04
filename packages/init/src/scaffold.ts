import { join, dirname } from '@std/path';
import { ensureDirSync } from '@std/fs/ensure-dir';
import { existsSync } from '@std/fs/exists';
import { MINT, RESET } from './colors.ts';
import { getTemplateFiles, type TemplateFile } from './template.ts';

export function scaffoldProject(name: string): void {
  const absPath = Deno.realPathSync('.');
  const target = join(absPath, name);

  if (existsSync(target)) {
    console.error(`Error: Directory "${target}" already exists.`);
    Deno.exit(1);
  }

  console.log(`Creating project in ${MINT}${target}${RESET}...\n`);

  const files = getTemplateFiles(name);
  const dirs = new Set(files.map((f) => dirname(f.path)));

  for (const dir of dirs) {
    ensureDirSync(join(target, dir));
  }

  for (const file of files) {
    Deno.writeTextFileSync(join(target, file.path), file.content);
  }
}
