const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

let [, , ...cliParams] = process.argv;

function getParam(name, value = false) {
  const p = cliParams.find(p => p.includes(name));

  cliParams = cliParams.filter(p => !p.includes(name));

  if (value) return p ? p.split('=')[1] : false;

  return Boolean(p);
}

if (getParam('--help')) printHelp();

const yarnrcDisable = getParam('--yarnrc-disable');
const yarnrcGenerate = getParam('--yarnrc-generate');
const yarnLockDisable = getParam('--yarn-lock-disable');
const srcLessDisable = getParam('--src-less-disable');
const srcLessRegex = getParam('--src-less-regex', true);
const srcLessProdDisable = getParam('--src-less-prod-disable');
const srcLessProdRegex = getParam('--src-less-prod-regex', true);
const jsonFileDisable = getParam('--json-file-disable');
const jsonFileProdDisable = getParam('--json-file-prod-disable');
const outputFolder = getParam('--output-folder', true) || '_isolated_';
const srcFilesEnable = getParam('--src-files-enable');
const srcFilesPackageJson = getParam('--src-files-package-json');
const srcFilesIncludeRegex = getParam('--src-files-include-regex', true);
const srcFilesExcludeRegex = getParam('--src-files-exclude-regex', true);
const workspacesExcludeRegex = getParam('--workspaces-exclude-regex', true);
const projectRoot = getParam('--project-folder', true) || path.resolve();

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

const rootDir = getWorkspacesRoot(projectRoot);

const projectWorkspaces = JSON.parse(execSync('yarn workspaces --silent info', { cwd: rootDir }).toString());

const workspaceName = (function getWorkspaceName() {
  const [targetWorkspaceName] = cliParams;

  if (!targetWorkspaceName) {
    console.log('please provide workspace name or folder');
    process.exit(1);
  }

  if (projectWorkspaces[targetWorkspaceName]) return targetWorkspaceName;

  let workspaceName = Object.keys(projectWorkspaces).find(
    workspace => projectWorkspaces[workspace].location === targetWorkspaceName,
  );

  if (workspaceName) return workspaceName;

  console.log(`no such workspace or folder: ${targetWorkspaceName}`);
  process.exit(1);
})();

for (let key in projectWorkspaces) {
  projectWorkspaces[key].location = path.join(rootDir, projectWorkspaces[key].location);
  projectWorkspaces[key].pkgJsonLocation = path.join(projectWorkspaces[key].location, 'package.json');
  projectWorkspaces[key].pkgJson = JSON.parse(fs.readFileSync(projectWorkspaces[key].pkgJsonLocation));
  if (projectWorkspaces[key].pkgJson.dependencies && projectWorkspaces[key].pkgJson.dependencies[workspaceName])
    delete projectWorkspaces[key].pkgJson.dependencies[workspaceName];

  if (projectWorkspaces[key].pkgJson.devDependencies && projectWorkspaces[key].pkgJson.devDependencies[workspaceName])
    delete projectWorkspaces[key].pkgJson.devDependencies[workspaceName];

  if (srcFilesPackageJson) projectWorkspaces[key].inclueFiles = projectWorkspaces[key].pkgJson.files || [];
}

const workspaceData = projectWorkspaces[workspaceName];

const prodWorkspaces = (function getProdWorkspaces() {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.keys(dependencies).forEach(depName => {
      if (projectWorkspaces[depName] && !list.includes(depName)) {
        list.push(depName);
        recursive(projectWorkspaces[depName].pkgJson.dependencies);
      }
    });
  };
  recursive(workspaceData.pkgJson.dependencies);
  return list;
})();

const devWorkspaces = (function getDevWorkspaces(prodWorkspaces) {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.keys(dependencies).forEach(depName => {
      if (projectWorkspaces[depName] && !list.includes(depName)) {
        list.push(depName);
        recursive(projectWorkspaces[depName].pkgJson.dependencies);
      }
    });
  };
  recursive({ ...workspaceData.pkgJson.dependencies, ...workspaceData.pkgJson.devDependencies });
  return list.filter(w => !prodWorkspaces.includes(w));
})(prodWorkspaces);

const relatedWorkspaces = [...prodWorkspaces, ...devWorkspaces];

let isolateFolder = `${workspaceData.location}/${outputFolder}`;
let workspacesFolder = `${isolateFolder}/workspaces/`;
let srcLessFolder = `${isolateFolder}/workspaces-src-less/`;
let srcLessFolderProd = `${isolateFolder}/workspaces-src-less-prod/`;

function printHelp() {
  console.log(`
  isolating workspace in yarn workspace project
  use:
  # yarn-isolate [options] [workspace name to isolate]

    // yarn files
    [--yarnrc-disable]                     disable copy or generate .yarnrc file
    [--yarnrc-generate]                    generate yarnrc with workspaces flag enable
    [--yarn-lock-disable]                  disable generate yarn.lock file

    // src-less folder
    [--src-less-disable]                   disable create of the src-less folders
    [--src-less-regex={value}]             extra files to copy to src-less folder

    // src-less-prod folder
    [--src-less-prod-disable]              disable create the prod src-less folder
    [--src-less-prod-regex={value}]        extra files to copy to src-less folder

    // main workspace
    [--json-file-disable]                  disable create json file
    [--json-file-prod-disable]             disable create json prod json file (withtout dev-dependencies)
    [--output-folder]                      folder to create all generated files (default to _isolated_)

    // files
    [--src-files-enable]                   copy all src file of main worksapce
    [--src-files-exclude-regex={value}]    copy src file of main workspace by regex
    [--src-files-include-regex={value}]    copy src file of main workspace by regex
    [--workspaces-exclude-regex={value}]   exclude regex when copy workspaces (default: node_modules and selected output-folder)

    // workspaces folder configuration
    [--max-depth]                          by default we search recursively project-root 5 folder
    [--project-folder={value}]             absolute path to project-root (default will look for the root)
`);

  process.exit(0);
}

module.exports = {
  rootDir,
  workspaceName,
  workspaceData,
  prodWorkspaces,
  devWorkspaces,
  relatedWorkspaces,
  projectWorkspaces,
  yarnrcDisable,
  yarnrcGenerate,
  yarnLockDisable,
  srcLessDisable,
  srcLessRegex,
  srcLessProdDisable,
  srcLessProdRegex,
  jsonFileDisable,
  jsonFileProdDisable,
  outputFolder,
  srcFilesEnable,
  srcFilesPackageJson,
  srcFilesIncludeRegex,
  srcFilesExcludeRegex,
  workspacesExcludeRegex,
  isolateFolder,
  workspacesFolder,
  srcLessFolder,
  srcLessFolderProd,
};
