import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const getWorkspacesRoot = dir => {
  const pkg = path.join(dir, 'package.json');
  let found = false;
  if (fs.existsSync(pkg)) {
    const { workspaces } = JSON.parse(fs.readFileSync(pkg, 'utf-8'));
    if (workspaces) found = true;
  }
  if (found) return dir;
  return getWorkspacesRoot(path.join(dir, '../'));
};

export const rootDir = getWorkspacesRoot(path.resolve());

export const allWorkspaces = JSON.parse(execSync('yarn workspaces --silent info', { cwd: rootDir }).toString());

let [, , ...cliParams] = process.argv;

function getParam(param, value = false) {
  const p = cliParams.find(p => p.includes(param));

  cliParams = cliParams.filter(p => !p.includes(param));

  if (value) return p ? p.split('=')[1] : false;

  return Boolean(p);
}

const help = getParam('--help');

if (help) printHelp();

export const ignoreDev = getParam('--ignore-dev');

export const ignoreYarnLock = getParam('--ignore-yarn-lock');

export const defaultPackageJson = getParam('--default-package-json', true);

export const defaultWorkspacesFolder = getParam('--default-workspaces-folder', true) || 'node_modules';

export const copyOnlyFiles = getParam('--copy-only-files');

export const workspaceName = (function getWorkspaceName() {
  const [targetWorkspaceName] = cliParams;

  if (!targetWorkspaceName) {
    console.log('please provide workspace name of folder');
    process.exit(1);
  }

  if (allWorkspaces[targetWorkspaceName]) return targetWorkspaceName;

  let workspaceName = Object.keys(allWorkspaces).find(workspace => allWorkspaces[workspace].location === targetWorkspaceName);

  if (workspaceName) return workspaceName;

  console.log(`no such workspace of folder ${targetWorkspaceName}`);
  process.exit(1);
})();

for (let key in allWorkspaces) {
  allWorkspaces[key].location = path.join(rootDir, allWorkspaces[key].location);
  allWorkspaces[key].pkgJsonLocation = path.join(allWorkspaces[key].location, 'package.json');
  allWorkspaces[key].pkgJson = JSON.parse(fs.readFileSync(allWorkspaces[key].pkgJsonLocation));
}

function printHelp() {
  console.log(`
  isolating workspace in yarn workspace project
  use:
  # yarn-isolate [options] [workspace name to isolate]

  [--ignore-dev]                          will ignore all dev dependencies from root nad related workspaces.
  [--ignore-yarn-lock]                    will not generate yarn.lock on root workspace folder.
  [--default-package-json={value}]        different name to create root workspace package.json.
  [--default-workspaces-folder={value}]   different folder to copy related workspace inside the root workspace.
  [--copy-files-only]                     only copy files from the package.json file field
  [--ignore-copy-pattern={value}]         pattern that mach the pattern will be ignore in copy
`);

  process.exit(0);
}
