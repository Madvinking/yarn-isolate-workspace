#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');

const {
  rootDir,
  ignoreCopyDev,
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

function getDevWorkspaces() {
  const list = [];
  const recursive = (dependencies = {}) => {
    Object.keys(dependencies).forEach(depName => {
      if (allWorkspaces[depName] && !list.includes(depName)) {
        list.push(depName);
        recursive({ ...allWorkspaces[depName].pkgJson.dependencies, ...allWorkspaces[depName].pkgJson.devDependencies });
      }
    });
  };
  recursive(currentWorkspace.pkgJson.devDependencies);
  return list;
}

function getAllRelatedWorkspaces() {
  const prodWorkspaces = [];

  const willBeRelatedToDev = [];

  const collectedDependenciesToInstall = [];

  const recursive = (packageName, isDev = false) => {
    const {
      pkgJson: { dependencies = {}, devDependencies = {} },
    } = allWorkspaces[packageName];

    const forEachDep = ([name, version], isDevInner = false) => {
      if (allWorkspaces[name] && !prodWorkspaces.includes(name)) {
        if (isDevInner) willBeRelatedToDev.push(name);
        else prodWorkspaces.push(name);
        recursive(name, isDevInner);
      } else if (!allWorkspaces[name]) {
        if (!isDevInner) {
          collectedDependenciesToInstall.push(`${name}@${version}`);
        }
      }
    };

    Object.entries(dependencies).forEach(d => forEachDep(d, isDev));
    if (!ignoreCopyDev) Object.entries(devDependencies).forEach(d => forEachDep(d, packageName !== workspaceName));
  };

  recursive(workspaceName, false);
  const devWorkspaces = willBeRelatedToDev.filter(name => !prodWorkspaces.includes(name));

  return {
    prodWorkspaces: [...new Set(prodWorkspaces)],
    collectedDependenciesToInstall: [...new Set(collectedDependenciesToInstall)],
    devWorkspaces: [...new Set(devWorkspaces)],
  };
}

function createFolderDestinationFolders() {
  currentWorkspace.newLocation = `${currentWorkspace.location}/${outPutFolder}`;
  currentWorkspace.workspaceFolder = `${currentWorkspace.location}/${outPutFolder}/workspaces/`;
  currentWorkspace.srcLessFolder = `${currentWorkspace.location}/${outPutFolder}/workspaces-src-less/`;
  currentWorkspace.srcLessFolderProd = `${currentWorkspace.location}/${outPutFolder}/workspaces-src-less-prod/`;

  fs.rmdirSync(currentWorkspace.newLocation, { recursive: true });
  fs.mkdirSync(currentWorkspace.workspaceFolder, { recursive: true });
  if (createSrcLessFolder) fs.mkdirSync(currentWorkspace.srcLessFolder, { recursive: true });
  if (createSrcLessProdFolder) fs.mkdirSync(currentWorkspace.srcLessFolderProd, { recursive: true });
}

function resolveWorkspacesNewLocation(prodWorkspaces, devWorkspaces) {
  [...prodWorkspaces, ...devWorkspaces].forEach(name => {
    const subWorkspace = allWorkspaces[name];
    const relativePath = path.relative(rootDir, subWorkspace.location);
    subWorkspace.workspaceFolder = path.join(currentWorkspace.workspaceFolder, relativePath);
    subWorkspace.srcLessFolder = path.join(currentWorkspace.srcLessFolder, relativePath);
    subWorkspace.srcLessFolderProd = path.join(currentWorkspace.srcLessFolderProd, relativePath);
  });
}

function copyWorkspacesToNewLocation(prodWorkspaces, devWorkspaces) {
  [...prodWorkspaces, ...devWorkspaces].forEach(name => {
    const subWorkspace = allWorkspaces[name];

    const ignoreRxgEx = new RegExp(ignoreCopyRegex ? ignoreCopyRegex : `node_modules|${outPutFolder}`);
    fs.mkdirSync(subWorkspace.workspaceFolder, { recursive: true });
    fse.copySync(subWorkspace.location, subWorkspace.workspaceFolder, {
      filter: src => !ignoreRxgEx.test(src),
    });

    fse.writeFileSync(path.join(subWorkspace.workspaceFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2));
  });
}

function copySrcLessToNewLocation(prodWorkspaces, devWorkspaces) {
  if (createSrcLessFolder) {
    [...prodWorkspaces, ...devWorkspaces].forEach(name => {
      const subWorkspace = allWorkspaces[name];
      fs.mkdirSync(subWorkspace.srcLessFolder, { recursive: true });

      if (includeWithSrcLess) {
        const srcLessRxgEx = new RegExp(includeWithSrcLess);
        fse.copySync(subWorkspace.location, subWorkspace.srcLessFolder, {
          filter: src => {
            if (src === subWorkspace.location) return true;

            return srcLessRxgEx.test(src);
          },
        });
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
        fse.copySync(subWorkspace.location, subWorkspace.srcLessFolderProd, {
          filter: src => {
            if (src === subWorkspace.location) return true;
            return srcLessRxgEx.test(src);
          },
        });
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
  const { collectedDependenciesToInstall } = getAllRelatedWorkspaces();
  const prodWorkspaces = getProdWorkspaces();
  const devWorkspaces = getDevWorkspaces();
  createFolderDestinationFolders();
  resolveWorkspacesNewLocation(prodWorkspaces, devWorkspaces);
  copyWorkspacesToNewLocation(prodWorkspaces, devWorkspaces);
  copySrcLessToNewLocation(prodWorkspaces, devWorkspaces);
  copySrcLessProdToNewLocation(prodWorkspaces);
  createMainJsonFile(prodWorkspaces, devWorkspaces);
  createYarnRc();
  createYarnLock(collectedDependenciesToInstall);
}

start();
