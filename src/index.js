#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');

const {
  rootDir,
  ignoreYarnrc,
  asMonorepo,
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
  const mainWorkspace = allWorkspaces[workspaceName];
  mainWorkspace.relativeTo = mainWorkspace.newLocation = mainWorkspace.location;
  //TODO ability to copy only files from the package.json files attribute
  workspaces
    .forEach(name => {
      const subWorkspace = allWorkspaces[name];

      if (asMonorepo) {
        subWorkspace.newLocation = path.join(destinationFolder, path.relative(rootDir, subWorkspace.location));
      } else {
        subWorkspace.newLocation = path.join(destinationFolder, name);
        subWorkspace.relativeTo = path.join(mainWorkspace.location, 'node_modules', name);
      }
      //TODO ignore pattern list right now ignore node_modules
      fse.copySync(subWorkspace.location, subWorkspace.newLocation, {
        filter: src => !src.includes('node_modules'),
      });
    });
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

function createMonoRepo(relatedWorkspaces) {
  const currentWorkspace = allWorkspaces[workspaceName];

  currentWorkspace.pkgJson.workspaces = relatedWorkspaces.map(name => path.relative(currentWorkspace.newLocation, allWorkspaces[name].newLocation))
  fse.writeFileSync(
    path.join(
      currentWorkspace.newLocation,
      defaultPackageJson ? defaultPackageJson : 'package.json',
    ),
    JSON.stringify(currentWorkspace.pkgJson, null, 2),
  )

  if (ignoreYarnrc) return;

  const yarnrcFile = path.join(rootDir, '.yarnrc');
  if (!fs.existsSync(yarnrcFile)) {
    console.warn('no .yarnrc file in root-project');
    return;
  }
  fse.copySync(yarnrcFile, path.join(currentWorkspace.location, '.yarnrc'));
}

function createYarnLock(dependenciesList) {
  const yarnLockPath = path.join(rootDir, 'yarn.lock');
  if (!fs.existsSync(yarnLockPath)) {
    console.warn('no yarn.lock file on project root');
    return;
  }

  let { object: oldFile } = lockfile.parse(fs.readFileSync(yarnLockPath, 'utf8'));

  let newFile = Object.fromEntries(Object.entries(oldFile).filter(([name]) => dependenciesList.includes(name)));

  fs.writeFileSync(path.join(allWorkspaces[workspaceName].location, 'yarn.lock'), lockfile.stringify(newFile));
}

async function init() {

  const { workspacesToCopy, collectedDependenciesToInstall } = getAllRelatedWorkspaces();

  const destWorkspacesDir = createFolderForRelatedWorkspaces(workspaceName, defaultWorkspacesFolder);

  copyRelatedWorkspacesToDest(workspacesToCopy, destWorkspacesDir);


  if (asMonorepo) {
    createMonoRepo(workspacesToCopy);
  } else {
    resolvePackageJsonWithNewLocations([...workspacesToCopy, workspaceName]);
  }

  if (!ignoreYarnLock) createYarnLock(collectedDependenciesToInstall);
}

init();
