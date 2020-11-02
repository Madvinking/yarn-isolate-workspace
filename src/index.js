#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');

const {
  rootDir,
  workspaceName,
  allWorkspaces,
  ignoreDev,
  ignoreYarnLock,
  defaultPackageJson,
  defaultWorkspacesFolder,
  // copyOnlyFiles,
} = require('./params.js');

function getAllRelatedWorkspaces() {
  const workspacesToCopy = [];

  const collectedDependenciesToInstall = [];

  const recursive = name => {
    const {
      pkgJson: { dependencies = {}, devDependencies = {} },
    } = allWorkspaces[name];

    const forEachDep = ([name, version]) => {
      if (allWorkspaces[name] && !workspacesToCopy.includes(name)) {
        workspacesToCopy.push(name);
        recursive(name);
      } else if (!allWorkspaces[name]) collectedDependenciesToInstall.push(`${name}@${version}`);
    };
    Object.entries(dependencies).forEach(forEachDep);
    if (!ignoreDev) Object.entries(devDependencies).forEach(forEachDep);
  };

  recursive(workspaceName);

  return { workspacesToCopy, collectedDependenciesToInstall };
}

function createFolderForRelatedWorkspaces(workspace) {
  const destWorkspacesDir = `${allWorkspaces[workspace].location}/${defaultWorkspacesFolder}`;

  fs.rmdirSync(destWorkspacesDir, { recursive: true });
  fs.mkdirSync(destWorkspacesDir, { recursive: true });

  return destWorkspacesDir;
}

function copyRelatedWorkspacesToDest(workspaces, destinationFolder) {
  //TODO ability to copy only files from the package.json files attribute
  workspaces
    .filter(name => name !== workspaceName)
    .forEach(name => {
      allWorkspaces[name].newLocation = path.join(destinationFolder, name);
      allWorkspaces[name].relativeTo = path.join(allWorkspaces[workspaceName].location, 'node_modules', name);
      //TODO ignore pattern list right now ignore node_modules
      fse.copySync(allWorkspaces[name].location, allWorkspaces[name].newLocation, {
        filter: src => !src.includes('node_modules'),
      });
    });
  allWorkspaces[workspaceName].newLocation = allWorkspaces[workspaceName].location;
  allWorkspaces[workspaceName].relativeTo = allWorkspaces[workspaceName].location;
}

const changeLocation = (list, relativeTo) => {
  return Object.entries(list).reduce((acc, [pkgName, version]) => {
    if (allWorkspaces[pkgName]) {
      acc[pkgName] = `file:${path.relative(relativeTo, allWorkspaces[pkgName].relativeTo)}`;
    } else {
      acc[pkgName] = version;
    }

    return acc;
  }, {});
};

function resolvePackageJsonWithNewLocations(workspaces) {
  workspaces.forEach(name => {
    const { dependencies, devDependencies } = allWorkspaces[name].pkgJson;

    if (dependencies) allWorkspaces[name].pkgJson.dependencies = changeLocation(dependencies, allWorkspaces[name].relativeTo);

    if (!ignoreDev && devDependencies)
      allWorkspaces[name].pkgJson.devDependencies = changeLocation(devDependencies, allWorkspaces[name].relativeTo);
    fse.writeFileSync(
      path.join(
        allWorkspaces[name].newLocation,
        name === workspaceName && defaultPackageJson ? defaultPackageJson : 'package.json',
      ),
      JSON.stringify(allWorkspaces[name].pkgJson, null, 2),
    );
  });
}

function createYarnLock(dependenciesList) {
  const yarnLockPath = path.join(rootDir, 'yarn.lock');
  if (!fs.existsSync(yarnLockPath)) {
    console.warn('no yarn.lock file on project root');
    return;
  }

  let { object: oldFile } = lockfile.parse(fs.readFileSync('yarn.lock', 'utf8'));

  let newFile = Object.fromEntries(Object.entries(oldFile).filter(([name]) => dependenciesList.includes(name)));

  fs.writeFileSync(path.join(allWorkspaces[workspaceName].location, 'yarn.lock'), lockfile.stringify(newFile));
}

async function init() {
  const { workspacesToCopy, collectedDependenciesToInstall } = getAllRelatedWorkspaces();

  const destWorkspacesDir = createFolderForRelatedWorkspaces(workspaceName, defaultWorkspacesFolder);

  copyRelatedWorkspacesToDest(workspacesToCopy, destWorkspacesDir);

  resolvePackageJsonWithNewLocations([...workspacesToCopy, workspaceName]);

  if (!ignoreYarnLock) createYarnLock(collectedDependenciesToInstall);
}

init();
