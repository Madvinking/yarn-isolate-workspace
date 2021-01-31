#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');

const {
  rootDir,
  workspaceData,
  prodWorkspaces,
  devWorkspaces,
  relatedWorkspaces,
  projectWorkspaces,
  yarnrcDisable,
  yarnrcGenerate,
  yarnLockDisable,
  srcLessDisable,
  srcLessFilesRegex,
  srcLessProdDisable,
  srcLessProdFilesRegex,
  jsonFileDisable,
  jsonFileProdDisable,
  srcFilesEnable,
  srcFilesPackageJson,
  srcFilesIncludeRegex,
  srcFilesExcludeRegex,
  workspacesExcludeFiles,
  isolateFolder,
  workspacesFolder,
  srcLessFolder,
  srcLessFolderProd,
} = require('./params');

function createDestinationFolders() {
  if (fs.existsSync(isolateFolder)) fs.rmdirSync(isolateFolder, { recursive: true });
  fs.mkdirSync(workspacesFolder, { recursive: true });

  if (srcFilesEnable || srcFilesIncludeRegex || srcFilesExcludeRegex) {
    fse.copySync(workspacesFolder, isolateFolder, {
      preserveTimestamps: true,
      filter: name => {
        if (name.includes('package.json')) return false;
        if (name.includes('node_modules')) return false;
        if (name.includes(isolateFolder)) return false;
        if (srcFilesIncludeRegex) {
          if (new RegExp(srcFilesIncludeRegex).test(name)) return true;
          return false;
        } else if (srcFilesExcludeRegex) {
          if (new RegExp(srcFilesExcludeRegex).test(name)) return false;
          return true;
        } else  {
          return true
        }
      },
    });
  }

  // TODO:  srcFilesPackageJson

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

    fse.copySync(subWorkspace.location, subWorkspace.newLocation, {
      preserveTimestamps: true,
      filter: name => {
        if (name.includes('package.json')) return false;
        if (name.includes('node_modules')) return false;
        if (name.includes(isolateFolder)) return false;
        if (workspacesExcludeFiles && new RegExp(workspacesExcludeFiles).test(name)) return false;
        return true
      },
    });

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

      fs.writeFileSync(path.join(subWorkspaceSrcLessFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2), { flag: 'wx' });

      if (srcLessFilesRegex) {
        fse.copySync(subWorkspace.location, subWorkspaceSrcLessFolder, {
          preserveTimestamps: true,
          filter: name => {
            if (new RegExp(srcLessFilesRegex).test(name)) return true;
            return false
          },
        });
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

      fs.writeFileSync(path.join(subWorkspaceSrcLessProdFolder, 'package.json'), JSON.stringify(subWorkspace.pkgJson, null, 2), { flag: 'wx' });

      if (srcLessProdFilesRegex) {
        fse.copySync(subWorkspace.location, subWorkspaceSrcLessProdFolder, {
          preserveTimestamps: true,
          filter: name => {
            if (new RegExp(srcLessProdFilesRegex).test(name)) return true;
            return false
          },
        });
      }
    });
  }
}

function createMainJsonFile() {
  workspaceData.pkgJson.workspaces = prodWorkspaces.map(name =>
    path.relative(isolateFolder, projectWorkspaces[name].newLocation),
  );

  let currentDevDependencies = {};

  if (workspaceData.pkgJson.devDependencies) {
    currentDevDependencies = JSON.parse(JSON.stringify(workspaceData.pkgJson.devDependencies));
  }

  if (!jsonFileProdDisable) {
    workspaceData.pkgJson.devDependencies = {};
    fs.writeFileSync(
      path.join(isolateFolder, 'package-prod.json'),
      JSON.stringify(workspaceData.pkgJson, null, 2),
    );
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

  let newFile = Object.fromEntries(Object.entries(oldFile).filter(([name]) => dependenciesList.includes(name)));

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
