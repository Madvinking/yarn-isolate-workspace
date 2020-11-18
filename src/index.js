#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');
const readDirSync = require('fs-readdir-recursive');

const {
  rootDir,
  ignoreYarnrc,
  ignoreYarnLock,
  workspaceName,
  allWorkspaces,
  createSrcLessFolder,
  createSrcLessProdFolder,
  createJsonFile,
  createJsonProdFile,
  outPutFolder,
  ignoreCopyRegex,
  includeWithSrcLess,
  includeWithSrcLessProd,
  // copyOnlyFiles,
} = require('./params');

const currentWorkspace = allWorkspaces[workspaceName];

function getProdWorkspaces() {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.keys(dependencies).forEach(depName => {
      if (allWorkspaces[depName] && !list.includes(depName)) {
        list.push(depName);
        recursive(allWorkspaces[depName].pkgJson.dependencies);
      }
    });
  };
  recursive(currentWorkspace.pkgJson.dependencies);
  return list;
}

function getDevWorkspaces(prodWorkspaces) {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.keys(dependencies).forEach(depName => {
      if (allWorkspaces[depName] && !list.includes(depName)) {
        list.push(depName);
        recursive(allWorkspaces[depName].pkgJson.dependencies);
      }
    });
  };
  recursive({ ...currentWorkspace.pkgJson.dependencies, ...currentWorkspace.pkgJson.devDependencies });
  return list.filter(w => !prodWorkspaces.includes(w));
}

function getDependencies() {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.entries(dependencies).forEach(([name, version]) => {
      const depName = `${name}@${version}`;
      if (!allWorkspaces[name] && !list.includes(depName)) {
        list.push(depName);
      } else if (allWorkspaces[name]) {
        recursive(allWorkspaces[name].pkgJson.dependencies);
      }
    });
  };
  recursive({ ...currentWorkspace.pkgJson.dependencies, ...currentWorkspace.pkgJson.devDependencies });
  return list;
}

function createFolderDestinationFolders() {
  currentWorkspace.newLocation = `${currentWorkspace.location}/${outPutFolder}`;
  currentWorkspace.workspaceFolder = `${currentWorkspace.location}/${outPutFolder}/workspaces/`;
  currentWorkspace.srcLessFolder = `${currentWorkspace.location}/${outPutFolder}/workspaces-src-less/`;
  currentWorkspace.srcLessFolderProd = `${currentWorkspace.location}/${outPutFolder}/workspaces-src-less-prod/`;
  if (fs.existsSync(currentWorkspace.newLocation)) fs.rmdirSync(currentWorkspace.newLocation, { recursive: true });
  fs.mkdirSync(currentWorkspace.workspaceFolder, { recursive: true });
  if (createSrcLessFolder) fs.mkdirSync(currentWorkspace.srcLessFolder, { recursive: true });
  if (createSrcLessProdFolder) fs.mkdirSync(currentWorkspace.srcLessFolderProd, { recursive: true });
}

function resolveWorkspacesNewLocation(workspaces) {
  workspaces.forEach(name => {
    const subWorkspace = allWorkspaces[name];
    const relativePath = path.relative(rootDir, subWorkspace.location);
    subWorkspace.workspaceFolder = path.join(currentWorkspace.workspaceFolder, relativePath);
    subWorkspace.srcLessFolder = path.join(currentWorkspace.srcLessFolder, relativePath);
    subWorkspace.srcLessFolderProd = path.join(currentWorkspace.srcLessFolderProd, relativePath);
  });
}

function copyWorkspacesToNewLocation(workspaces) {
  workspaces.forEach(name => {
    const subWorkspace = allWorkspaces[name];

    const ignoreRxgEx = new RegExp(ignoreCopyRegex ? ignoreCopyRegex : `node_modules|${outPutFolder}`);
    fs.mkdirSync(subWorkspace.workspaceFolder, { recursive: true });
    fse.copySync(subWorkspace.location, subWorkspace.workspaceFolder, {
      filter: src => !ignoreRxgEx.test(src),
    });
    subWorkspace.pkgJson.devDependencies = {};
    fse.writeFileSync(path.join(subWorkspace.workspaceFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2));
  });
}

function copySrcLessToNewLocation(workspaces) {
  if (createSrcLessFolder) {
    workspaces.forEach(name => {
      const subWorkspace = allWorkspaces[name];
      fs.mkdirSync(subWorkspace.srcLessFolder, { recursive: true });

      if (includeWithSrcLess) {
        const srcLessRxgEx = new RegExp(includeWithSrcLess);
        const files = readDirSync(subWorkspace.location, name => {
          return name !== 'node_modules' || name[0] !== '.';
        });
        files
          .filter(f => srcLessRxgEx.test(f))
          .forEach(file => fse.copySync(path.join(subWorkspace.location, file), path.join(subWorkspace.srcLessFolder, file)));
      }
      fse.writeFileSync(path.join(subWorkspace.srcLessFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2));
    });
  }
}

function copySrcLessProdToNewLocation(prodWorkspaces) {
  if (createSrcLessProdFolder) {
    prodWorkspaces.forEach(name => {
      const subWorkspace = allWorkspaces[name];
      fs.mkdirSync(subWorkspace.srcLessFolderProd, { recursive: true });
      subWorkspace.pkgJson.devDependencies = {};
      if (includeWithSrcLessProd) {
        const srcLessRxgEx = new RegExp(includeWithSrcLessProd);
        const files = readDirSync(subWorkspace.location, name => {
          return name !== 'node_modules' || name[0] !== '.';
        });
        files
          .filter(f => srcLessRxgEx.test(f))
          .forEach(file => fse.copySync(path.join(subWorkspace.location, file), path.join(subWorkspace.srcLessFolderProd, file)));
      }
      fse.writeFileSync(path.join(subWorkspace.srcLessFolderProd, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2));
    });
  }
}

function createMainJsonFile(prodWorkspaces, devWorkspaces) {
  currentWorkspace.pkgJson.workspaces = prodWorkspaces.map(name =>
    path.relative(currentWorkspace.newLocation, allWorkspaces[name].workspaceFolder),
  );

  let currentDevDependencies = {};

  if (currentWorkspace.pkgJson.devDependencies) {
    currentDevDependencies = JSON.parse(JSON.stringify(currentWorkspace.pkgJson.devDependencies));
  }

  if (createJsonProdFile) {
    currentWorkspace.pkgJson.devDependencies = {};
    fse.writeFileSync(
      path.join(currentWorkspace.newLocation, 'package-prod.json'),
      JSON.stringify(currentWorkspace.pkgJson, null, 2),
    );
  }

  currentWorkspace.pkgJson.devDependencies = currentDevDependencies;
  currentWorkspace.pkgJson.workspaces.push(
    ...devWorkspaces.map(name => path.relative(currentWorkspace.newLocation, allWorkspaces[name].workspaceFolder)),
  );

  if (createJsonFile) {
    fse.writeFileSync(path.join(currentWorkspace.newLocation, 'package.json'), JSON.stringify(currentWorkspace.pkgJson, null, 2));
  }
}

function createYarnRc() {
  if (ignoreYarnrc) return;

  fse.writeFileSync(path.join(currentWorkspace.newLocation, '.yarnrc'), 'workspaces-experimental true');
}

function createYarnLock(dependenciesList) {
  if (ignoreYarnLock) return;
  const yarnLockPath = path.join(rootDir, 'yarn.lock');
  if (!fs.existsSync(yarnLockPath)) {
    console.warn('no yarn.lock file on project root');
    return;
  }

  let { object: oldFile } = lockfile.parse(fs.readFileSync(yarnLockPath, 'utf8'));

  let newFile = Object.fromEntries(Object.entries(oldFile).filter(([name]) => dependenciesList.includes(name)));

  fs.writeFileSync(path.join(currentWorkspace.newLocation, 'yarn.lock'), lockfile.stringify(newFile));
}

async function start() {
  const prodWorkspaces = getProdWorkspaces();
  const devWorkspaces = getDevWorkspaces(prodWorkspaces);
  const workspaces = [...prodWorkspaces, ...devWorkspaces];
  createFolderDestinationFolders();
  resolveWorkspacesNewLocation(workspaces);
  copyWorkspacesToNewLocation(workspaces);
  copySrcLessToNewLocation(workspaces);
  copySrcLessProdToNewLocation(prodWorkspaces);
  createMainJsonFile(prodWorkspaces, devWorkspaces);
  createYarnRc();
  const collectedDependenciesToInstall = getDependencies();
  createYarnLock(collectedDependenciesToInstall);
}

start();
