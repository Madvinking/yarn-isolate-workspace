const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

let [, , ...cliParams] = process.argv;

function getParam(param, value = false) {
  const p = cliParams.find(p => p.includes(param));

  cliParams = cliParams.filter(p => !p.includes(param));

  if (value) return p ? p.split('=')[1] : false;

  return Boolean(p);
}

if (getParam('--help')) printHelp();

const ignoreDevPackageJsonName = getParam('--ignore-dev-package-json-name', true);

const ignoreDevPackageJson = ignoreDevPackageJsonName ? false : getParam('--ignore-dev-package-json');

const ignoreCopyDev = ignoreDevPackageJson ? true : getParam('--ignore-copy-dev');

const packageJsonName = getParam('--package-json-name', true);

const ignoreYarnLock = getParam('--ignore-yarn-lock');

const ignoreYarnrc = getParam('--ignore-yarnrc');

const monorepoMode = getParam('--monorepo-mode');

const defaultWorkspacesFolder = getParam('--default-workspaces-folder', true) || 'node_modules';

const copyOnlyFiles = getParam('--copy-only-files');


let max = getParam('--max-depth', true) || 5;
const getWorkspacesRoot = dir => {
  const pkg = path.join(dir, 'package.json');
  let found = false;
  if (fs.existsSync(pkg)) {
    const { workspaces } = JSON.parse(fs.readFileSync(pkg, 'utf-8'));
    if (workspaces) found = true;
  }
  if (found) return dir;
  if (max === 0) {
    console.log('no workspace project found')
    process.exit(1);
  }
  max--;
  return getWorkspacesRoot(path.join(dir, '../'));
};

const rootDir = getWorkspacesRoot(path.resolve());

const allWorkspaces = JSON.parse(execSync('yarn workspaces --silent info', { cwd: rootDir }).toString());

const workspaceName = (function getWorkspaceName() {
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

  * [--copy-files-only]                      include only files listed on the file key in the package.json
  * [--ignore-copy-pattern={value}]          pattern that mach the pattern will be ignore in copy
    [--ignore-copy-dev]                      ignore DEV dependencies on copying workspaces.
    [--ignore-dev-package-json]              run --ignore-copy-dev and filter dev-dependencies from package.json.
    [--ignore-dev-package-json-name={value}] create a package.json file filter dev-dependencies in different name
    [--package-json-name={value}]            create a package.json file in a different name
    [--default-workspaces-folder={value}]    different folder to copy related workspace inside the root workspace.
    [--ignore-yarnrc]                        in monorepo-mode yarnrc will be created, can ignore it.
    [--ignore-yarn-lock]                     not generate yarn.lock on root workspace folder.
    [--monorepo-mode]                        make the current workspace a mono-repo project.
    [--max-depth]                            by default we search recursively project-root 5 folder

  * in progress
`);

  process.exit(0);
}


module.exports = {
  ignoreCopyDev,
  ignoreDevPackageJson,
  ignoreDevPackageJsonName,
  packageJsonName,
  monorepoMode,
  ignoreYarnrc,
  rootDir,
  workspaceName,
  allWorkspaces,
  ignoreYarnLock,
  defaultWorkspacesFolder,
  copyOnlyFiles,
}