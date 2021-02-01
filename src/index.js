#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const readDirSync = require('fs-readdir-recursive');
const lockfile = require('@yarnpkg/lockfile');
const glob = require('glob');
const {
  rootDir,
  outputFolder,
  workspaceData,
  prodWorkspaces,
  devWorkspaces,
  relatedWorkspaces,
  projectWorkspaces,
  yarnrcDisable,
  yarnrcGenerate,
  yarnLockDisable,
  srcLessDisable,
  srcLessGlob,
  srcLessProdDisable,
  srcLessProdGlob,
  jsonFileDisable,
  jsonFileProdDisable,
  srcFilesEnable,
  srcFilesIncludeGlob,
  srcFilesExcludeGlob,
  workspacesExcludeGlob,
  isolateFolder,
  workspacesFolder,
  srcLessFolder,
  srcLessFolderProd,
} = require('./params');

const ignorePattterns = ['.', 'package.json', 'node_modules', outputFolder];

function createDestinationFolders() {
  if (fs.existsSync(isolateFolder)) fs.rmdirSync(isolateFolder, { recursive: true });
  fs.mkdirSync(workspacesFolder, { recursive: true });

  if (srcFilesExcludeGlob) {
    const files = glob.sync(srcFilesExcludeGlob, { cwd: workspaceData.location, absolute: true, ignore: ignorePattterns });

    const filesToCopy = readDirSync(
      workspaceData.location,
      (name, i, dir) => !ignorePattterns.includes(name) && !files.includes(`${dir}/${name}`),
    );

    filesToCopy.forEach(file =>
      fse.copySync(path.join(workspaceData.location, file), path.join(isolateFolder, file), { preserveTimestamps: true }),
    );
  } else if (srcFilesIncludeGlob) {
    const files = glob.sync(srcFilesIncludeGlob, { cwd: workspaceData.location, absolute: true, ignore: ignorePattterns });

    files.forEach(file =>
      fse.copySync(file, path.join(isolateFolder, path.relative(workspaceData.location, file)), { preserveTimestamps: true }),
    );
  } else if (srcFilesEnable) {
    const filesToCopy = readDirSync(workspaceData.location, name => !ignorePattterns.includes(name));
    filesToCopy.forEach(file =>
      fse.copySync(path.join(workspaceData.location, file), path.join(isolateFolder, file), { preserveTimestamps: true }),
    );
  }
}

function resolveWorkspacesNewLocation() {
  relatedWorkspaces.forEach(name => {
    const subWorkspace = projectWorkspaces[name];
    const relativePath = path.relative(rootDir, subWorkspace.location);
    subWorkspace.newLocation = path.join(workspacesFolder, relativePath);

    subWorkspace.pkgJsonLocation = path.join(subWorkspace.newLocation, 'package.json');
    fs.mkdirSync(subWorkspace.newLocation, { recursive: true });

    subWorkspace.pkgJson.devDependencies = {};
    fs.writeFileSync(subWorkspace.pkgJsonLocation, JSON.stringify(subWorkspace.pkgJson, null, 2));

    const files = workspacesExcludeGlob
      ? glob.sync(workspacesExcludeGlob, { cwd: subWorkspace.location, absolute: true, ignore: ignorePattterns })
      : [];

    const filesToCopy = readDirSync(
      subWorkspace.location,
      (name, i, dir) => !ignorePattterns.includes(name) && !files.includes(`${dir}/${name}`),
    );

    filesToCopy.forEach(file =>
      fse.copySync(path.join(subWorkspace.location, file), path.join(subWorkspace.newLocation, file), {
        preserveTimestamps: true,
      }),
    );
  });
}

function copySrcLessToNewLocation() {
  if (!srcLessDisable) {
    fs.mkdirSync(srcLessFolder, { recursive: true });
    relatedWorkspaces.forEach(name => {
      const subWorkspace = projectWorkspaces[name];
      const relativePath = path.relative(rootDir, subWorkspace.location);
      const subWorkspaceSrcLessFolder = path.join(srcLessFolder, relativePath);
      fs.mkdirSync(subWorkspaceSrcLessFolder, { recursive: true });

      fs.writeFileSync(path.join(subWorkspaceSrcLessFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2), {
        flag: 'wx',
      });
      if (srcLessGlob) {
        const files = glob.sync(srcLessGlob, { cwd: subWorkspace.location, absolute: true, ignore: ignorePattterns });

        files.forEach(file =>
          fse.copySync(file, path.join(subWorkspaceSrcLessFolder, path.relative(subWorkspace.location, file)), {
            preserveTimestamps: true,
          }),
        );
      }
    });
  }
}

function copySrcLessProdToNewLocation() {
  if (!srcLessProdDisable) {
    fs.mkdirSync(srcLessFolderProd, { recursive: true });
    prodWorkspaces.forEach(name => {
      const subWorkspace = projectWorkspaces[name];
      const relativePath = path.relative(rootDir, subWorkspace.location);
      const subWorkspaceSrcLessProdFolder = path.join(srcLessFolderProd, relativePath);
      fs.mkdirSync(subWorkspaceSrcLessProdFolder, { recursive: true });

      fs.writeFileSync(path.join(subWorkspaceSrcLessProdFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2), {
        flag: 'wx',
      });

      if (srcLessProdGlob) {
        const files = glob.sync(srcLessProdGlob, { cwd: subWorkspace.location, absolute: true, ignore: ignorePattterns });

        files.forEach(file =>
          fse.copySync(file, path.join(subWorkspaceSrcLessProdFolder, path.relative(subWorkspace.location, file)), {
            preserveTimestamps: true,
          }),
        );
      }
    });
  }
}

function createMainJsonFile() {
  workspaceData.pkgJson.workspaces = prodWorkspaces.map(name => path.relative(isolateFolder, projectWorkspaces[name].newLocation));

  let currentDevDependencies = {};

  if (workspaceData.pkgJson.devDependencies) {
    currentDevDependencies = JSON.parse(JSON.stringify(workspaceData.pkgJson.devDependencies));
  }

  if (!jsonFileProdDisable) {
    workspaceData.pkgJson.devDependencies = {};
    fs.writeFileSync(path.join(isolateFolder, 'package-prod.json'), JSON.stringify(workspaceData.pkgJson, null, 2));
  }

  workspaceData.pkgJson.devDependencies = currentDevDependencies;
  workspaceData.pkgJson.workspaces.push(
    ...devWorkspaces.map(name => path.relative(isolateFolder, projectWorkspaces[name].newLocation)),
  );

  if (!jsonFileDisable) {
    fs.writeFileSync(path.join(isolateFolder, 'package.json'), JSON.stringify(workspaceData.pkgJson, null, 2));
  }
}

function createYarnRc() {
  if (yarnrcDisable) return;
  const yarnrcFileSrc = path.join(rootDir, '.yarnrc');
  const yarnrcFileDest = path.join(isolateFolder, '.yarnrc');
  if (!yarnrcGenerate && fs.existsSync(yarnrcFileSrc)) {
    fs.copyFileSync(yarnrcFileSrc, yarnrcFileDest);
    return;
  }
  fs.writeFileSync(yarnrcFileDest, 'workspaces-experimental true');
}

function createYarnLock() {
  if (yarnLockDisable) return;
  const yarnLockPath = path.join(rootDir, 'yarn.lock');
  if (!fs.existsSync(yarnLockPath)) {
    console.warn('no yarn.lock file on project root');
    return;
  }

  let { object: oldFile } = lockfile.parse(fs.readFileSync(yarnLockPath, 'utf8'));

  const dependenciesList = (function getDependencies() {
    const list = [];
    const recursive = (dependencies = {}) => {
      Object.entries(dependencies).forEach(([name, version]) => {
        const depName = `${name}@${version}`;
        if (!projectWorkspaces[name] && !list.includes(depName)) {
          list.push(depName);
        } else if (projectWorkspaces[name]) {
          recursive(projectWorkspaces[name].pkgJson.dependencies);
        }
      });
    };
    recursive({ ...workspaceData.pkgJson.dependencies, ...workspaceData.pkgJson.devDependencies });
    return list;
  })();

  const recuireDeps = Object.keys(oldFile).filter(name => dependenciesList.includes(name));

  let newFile = recuireDeps.reduce((acc, key) => {
    acc[key] = oldFile[key];
    return acc;
  }, {});

  fs.writeFileSync(path.join(isolateFolder, 'yarn.lock'), lockfile.stringify(newFile));
}

async function start() {
  createDestinationFolders();
  resolveWorkspacesNewLocation();
  copySrcLessToNewLocation();
  copySrcLessProdToNewLocation();
  createMainJsonFile();
  createYarnRc();
  createYarnLock();
}

start();
