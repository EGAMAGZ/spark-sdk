import { MINT, RESET, WHITE } from './colors.ts';

export function printLogo(): void {
  const lines = [
    `${MINT}    _____    ${RESET}`,
    `${MINT} __|___  ${WHITE}|__ ${RESET}`,
    `${MINT}|   ___|${WHITE}    |${RESET}`,
    `${MINT} \`-.\`-.${WHITE}     |${RESET}`,
    `${MINT}|______|${WHITE}  __|${RESET}`,
    `${MINT}   |_____|${RESET}`,
  ];
  console.log('\n' + lines.join('\n') + '\n');
}
