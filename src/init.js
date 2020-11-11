const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');

function init(params) {

  const {
    rootDir,
    ignoreCopyDev,
    ignoreYarnrc,
    workspaceName,
    allWorkspaces,
    ignoreYarnLock,
    createSrcLessFolder,
    createSrcLessProdFolder,
    createJsonFile,
    createJsonProdFile,
    outPutFolder,
    // copyOnlyFiles,
  } = params;

  function getAllRelatedWorkspaces() {
    const prodWorkspaces = [];

    const willBeRelatedToDev = [];

    const collectedDependenciesToInstall = [];

    const recursive = (name, isDev = false) => {
      const {
        pkgJson: { dependencies = {}, devDependencies = {} },
      } = allWorkspaces[name];

      const forEachDep = ([name, version], isDevInner = false) => {
        if (allWorkspaces[name] && !prodWorkspaces.includes(name)) {
          if (isDevInner) willBeRelatedToDev.push(name)
          else  prodWorkspaces.push(name);
          recursive(name, isDevInner);
        } else if (!allWorkspaces[name]) collectedDependenciesToInstall.push(`${name}@${version}`);
      };

      Object.entries(dependencies).forEach(d => forEachDep(d, isDev));
      if (!ignoreCopyDev) Object.entries(devDependencies).forEach(d => forEachDep(d, true));
    };

    recursive(workspaceName, false);
    const devWorkspaces = willBeRelatedToDev.filter(name =>  !prodWorkspaces.includes(name));

    return {
      prodWorkspaces: [...new Set(prodWorkspaces)],
      collectedDependenciesToInstall: [...new Set(collectedDependenciesToInstall)],
      devWorkspaces: [...new Set(devWorkspaces)],
    }
  }

  function createFolderForRelatedWorkspaces() {
    allWorkspaces[workspaceName].newLocation = `${allWorkspaces[workspaceName].location}/${outPutFolder}`;

    fs.rmdirSync(allWorkspaces[workspaceName].newLocation, { recursive: true });
    fs.mkdirSync(`${allWorkspaces[workspaceName].newLocation}/workspaces`, { recursive: true });
    if (createSrcLessFolder) fs.mkdirSync(`${allWorkspaces[workspaceName].newLocation}/workspaces-src-less`, { recursive: true });
    if (createSrcLessProdFolder) fs.mkdirSync(`${allWorkspaces[workspaceName].newLocation}/workspaces-src-less-prod`, { recursive: true });
  }

  function copyRelatedWorkspacesToDest(prodWorkspaces, devWorkspaces) {
    const destinationFolder = allWorkspaces[workspaceName].newLocation;
    const copyWorkspace = (name, ignore = false) => {
      const subWorkspace = allWorkspaces[name];

      subWorkspace.newLocation = path.join(destinationFolder, 'workspaces', path.relative(rootDir, subWorkspace.location));
      subWorkspace.newLocationSrcLess = subWorkspace.newLocation.replace('/workspaces/', '/workspaces-src-less/');

      subWorkspace.newLocationSrcLessProd = subWorkspace.newLocation.replace('/workspaces/', '/workspaces-src-less-prod/');

      //TODO ignore pattern list right now ignore node_modules
      fse.copySync(subWorkspace.location, subWorkspace.newLocation, {
        filter: src => !src.includes('node_modules'),
      });

      fse.writeFileSync(
        path.join(subWorkspace.newLocation, 'package.json'),
        JSON.stringify(subWorkspace.pkgJson, null, 2)
      );

      if (createSrcLessFolder) {
        fs.mkdirSync(subWorkspace.newLocationSrcLess, { recursive: true });
        fse.writeFileSync(
          path.join(subWorkspace.newLocationSrcLess, 'package.json'),
          JSON.stringify(subWorkspace.pkgJson, null, 2)
        );
      }

      if (!ignore && createSrcLessProdFolder) {
        fs.mkdirSync(subWorkspace.newLocationSrcLessProd, { recursive: true });
        subWorkspace.pkgJson.devDependencies = {};
        fse.writeFileSync(
          path.join(subWorkspace.newLocationSrcLessProd, 'package.json'),
          JSON.stringify(subWorkspace.pkgJson, null, 2)
        );
      }

    }

    prodWorkspaces.forEach(w => copyWorkspace(w, false));
    devWorkspaces.forEach(w => copyWorkspace(w, true));
  }

  function createMainJsonFile(prodWorkspaces, devWorkspaces) {
    const currentWorkspace = allWorkspaces[workspaceName];
    currentWorkspace.pkgJson.workspaces = prodWorkspaces.map(name => path.relative(currentWorkspace.newLocation, allWorkspaces[name].newLocation));

    let currentDevDependencies = JSON.parse(JSON.stringify(currentWorkspace.pkgJson.devDependencies));

    if (createJsonProdFile) {
      currentWorkspace.pkgJson.devDependencies = {};
      fse.writeFileSync(
        path.join(currentWorkspace.newLocation, 'package-prod.json'),
        JSON.stringify(currentWorkspace.pkgJson, null, 2),
      )
    }

    currentWorkspace.pkgJson.devDependencies = currentDevDependencies;
    currentWorkspace.pkgJson.workspaces.push(...devWorkspaces.map(name => path.relative(currentWorkspace.newLocation, allWorkspaces[name].newLocation)));

    if (createJsonFile) {
      fse.writeFileSync(
        path.join(currentWorkspace.newLocation, 'package.json'),
        JSON.stringify(currentWorkspace.pkgJson, null, 2),
      )
    }
  }

  function createYarnRc() {
    if (ignoreYarnrc) return;

    const yarnrcFile = path.join(rootDir, '.yarnrc');
    if (!fs.existsSync(yarnrcFile)) {
      console.warn('no .yarnrc file in root-project');
      return;
    }

    fse.writeFileSync(path.join(allWorkspaces[workspaceName].newLocation, '.yarnrc'), 'workspaces-experimental true');
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

  function start() {
    const { prodWorkspaces, devWorkspaces, collectedDependenciesToInstall } = getAllRelatedWorkspaces();

    createFolderForRelatedWorkspaces();

    copyRelatedWorkspacesToDest(prodWorkspaces, devWorkspaces);

    createMainJsonFile(prodWorkspaces, devWorkspaces);

    createYarnRc()

    if (!ignoreYarnLock) createYarnLock(collectedDependenciesToInstall);
  }

  return {
    getAllRelatedWorkspaces,
    createFolderForRelatedWorkspaces,
    copyRelatedWorkspacesToDest,
    createMainJsonFile,
    createYarnLock,
    start
  }
}

module.exports = {
  init
}

