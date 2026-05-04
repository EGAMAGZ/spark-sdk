import { printLogo } from './src/logo.ts';
import { getProjectName, promptProjectName, printSuccess } from './src/prompts.ts';
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
