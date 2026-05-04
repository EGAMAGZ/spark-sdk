import { MINT, WHITE, RESET } from './colors.ts';

export function getProjectName(args: string[]): string | null {
  const projectFlag = args.find((a) => a.startsWith('--project='));
  if (projectFlag) return projectFlag.split('=')[1];

  const flagIndex = args.indexOf('--project');
  if (flagIndex !== -1 && args[flagIndex + 1]) return args[flagIndex + 1];

  const shortIndex = args.indexOf('-p');
  if (shortIndex !== -1 && args[shortIndex + 1]) return args[shortIndex + 1];

  const positional = args.find((a) => !a.startsWith('-'));
  if (positional) return positional;

  return null;
}

export function promptProjectName(): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  Deno.stdout.writeSync(encoder.encode('Enter project name: '));

  const buf = new Uint8Array(1024);
  const n = Deno.stdin.readSync(buf);
  if (n === null) throw new Error('Failed to read project name');

  return decoder.decode(buf.subarray(0, n)).trim();
}

export function printSuccess(name: string): void {
  console.log(`${MINT}Done!${RESET}\n`);
  console.log(`To get started:`);
  console.log(`  ${WHITE}cd ${name}${RESET}`);
  console.log(`  ${WHITE}npm install${RESET}`);
  console.log(`  ${WHITE}npm run dev${RESET}\n`);
}
