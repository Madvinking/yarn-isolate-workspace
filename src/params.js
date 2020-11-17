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

const ignoreCopyDev = getParam('--ignore-copy-dev');
const ignoreYarnLock = getParam('--disable-yarn-lock');
const ignoreYarnrc = getParam('--disable-yarnrc');
const createSrcLessFolder = !getParam('--disable-src-less-folder');
const createSrcLessProdFolder = !getParam('--disable-src-less-prod-folder');
const createJsonFile = !getParam('--disable-json-file');
const createJsonProdFile = !getParam('--disable-json-prod-file');
const outPutFolder = getParam('--output-folder', true) || '_isolated_';
const copyOnlyFiles = getParam('--copy-only-files');
const rootWorkspace = getParam('--root-workspace', true) || path.resolve();

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
    console.log('no workspace project found');
    process.exit(1);
  }
  max--;
  return getWorkspacesRoot(path.join(dir, '../'));
};

const rootDir = getWorkspacesRoot(rootWorkspace);

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
  if (allWorkspaces[key].pkgJson.dependencies && allWorkspaces[key].pkgJson.dependencies[workspaceName])
    delete allWorkspaces[key].pkgJson.dependencies[workspaceName];

  if (allWorkspaces[key].pkgJson.devDependencies && allWorkspaces[key].pkgJson.devDependencies[workspaceName])
    delete allWorkspaces[key].pkgJson.devDependencies[workspaceName];
}

function printHelp() {
  console.log(`
  isolating workspace in yarn workspace project
  use:
  # yarn-isolate [options] [workspace name to isolate]

    [--ignore-copy-dev]              disable DEV dependencies on copying workspaces
    [--disable-yarnrc]                wont generate .yarnrc file
    [--disable-yarn-lock]             wont generate yarn.lock
    [--disable-src-less-folder]       wont create the src-less folders
    [--disable-src-less-prod-folder]  wont create the prod src-less folder
    [--disable-json-file]             wont create json file
    [--disable-json-prod-file]        wont create json prod json file
    [--output-folder]                 folder to create all generated files (default to _isolated_)
  * [--copy-files-only]               include only files listed on the file key in the package.json
  * [--ignore-copy-pattern={value}]   pattern that mach the pattern will be ignore in copy
    [--max-depth]                     by default we search recursively project-root 5 folder
    [--workspace-folder={value}]      absolute path to project-root (default will look for the root)

  * in progress
`);

  process.exit(0);
}

module.exports = {
  rootDir,
  ignoreCopyDev,
  ignoreYarnrc,
  workspaceName,
  allWorkspaces,
  ignoreYarnLock,
  createSrcLessFolder,
  createSrcLessProdFolder,
  outPutFolder,
  createJsonFile,
  createJsonProdFile,
  copyOnlyFiles,
};
