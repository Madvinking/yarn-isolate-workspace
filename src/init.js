const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const lockfile = require('@yarnpkg/lockfile');


function init(params) {

  const {
    rootDir,
    ignoreCopyDev,
    ignoreDevPackageJson,
    ignoreDevPackageJsonName,
    ignoreYarnrc,
    monorepoMode,
    workspaceName,
    allWorkspaces,
    ignoreYarnLock,
    packageJsonName,
    srcLessFolders,
    defaultWorkspacesFolder,
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
    const destWorkspacesDir = `${allWorkspaces[workspaceName].location}/${defaultWorkspacesFolder}`;

    fs.rmdirSync(destWorkspacesDir, { recursive: true });
    fs.mkdirSync(destWorkspacesDir, { recursive: true });
    if (srcLessFolders) {
      fs.rmdirSync(`${destWorkspacesDir}_src_less`, { recursive: true });
      fs.mkdirSync(`${destWorkspacesDir}_src_less`, { recursive: true });
      if (!ignoreCopyDev) {
        fs.rmdirSync(`${destWorkspacesDir}_src_less_no_dev`, { recursive: true });
        fs.mkdirSync(`${destWorkspacesDir}_src_less_no_dev`, { recursive: true });
      }
    }

    return destWorkspacesDir;
  }

  function copyRelatedWorkspacesToDest(workspaces, relatedToDev, destinationFolder) {
    const mainWorkspace = allWorkspaces[workspaceName];
    mainWorkspace.relativeTo = mainWorkspace.newLocation = mainWorkspace.location;
    //TODO ability to copy only files from the package.json files attribute
    workspaces
      .forEach(name => {
        const subWorkspace = allWorkspaces[name];

        if (monorepoMode) {
          subWorkspace.newLocation = path.join(destinationFolder, path.relative(rootDir, subWorkspace.location));
        } else {
          subWorkspace.newLocation = path.join(destinationFolder, name);
          subWorkspace.relativeTo = path.join(mainWorkspace.location, defaultWorkspacesFolder ?defaultWorkspacesFolder : 'node_modules', name);
        }
        //TODO ignore pattern list right now ignore node_modules
        fse.copySync(subWorkspace.location, subWorkspace.newLocation, {
          filter: src => !src.includes('node_modules'),
        });

        fse.writeFileSync(
          path.join(subWorkspace.newLocation, 'package.json'),
          JSON.stringify(subWorkspace.pkgJson, null, 2)
        );

        if (srcLessFolders) {
          let reletiveFolder = path.join(path.relative(rootDir, subWorkspace.location), 'package.json');
          fs.mkdirSync(path.join(`${destinationFolder}_src_less`, reletiveFolder), { recursive: true });

          fse.writeFileSync(
            path.join(`${destinationFolder}_src_less`, reletiveFolder, 'package.json'),
            JSON.stringify(subWorkspace.pkgJson, null, 2),
            { flag: 'wx' }
          )
          if (!ignoreCopyDev && !relatedToDev.includes(name)) {
            fs.mkdirSync(path.join(`${destinationFolder}_src_less_no_dev`, reletiveFolder), { recursive: true });
            fse.writeFileSync(
              path.join(`${destinationFolder}_src_less_no_dev`, reletiveFolder, 'package.json'),
              JSON.stringify(subWorkspace.pkgJson, null, 2),
              { flag: 'wx' }
            )
          }
        }
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
      const currentWorkspace =  allWorkspaces[name];
      const { dependencies, devDependencies } = currentWorkspace.pkgJson;

      if (dependencies) currentWorkspace.pkgJson.dependencies = changeLocation(dependencies, currentWorkspace.relativeTo);

      if (!ignoreDevPackageJson && devDependencies)
        currentWorkspace.pkgJson.devDependencies = changeLocation(devDependencies, currentWorkspace.relativeTo);


      fse.writeFileSync(
        path.join(
          currentWorkspace.newLocation,
          name === workspaceName && packageJsonName ? packageJsonName : 'package.json',
        ),
        JSON.stringify(currentWorkspace.pkgJson, null, 2),
      );

      if (ignoreDevPackageJsonName && name === workspaceName) {
        currentWorkspace.pkgJson.devDependencies = {};
        fse.writeFileSync(
          path.join(currentWorkspace.newLocation, ignoreDevPackageJsonName),
          JSON.stringify(currentWorkspace.pkgJson, null, 2),
        );
      }
    });
  }

  function createMonoRepo(relatedWorkspaces) {
    const currentWorkspace = allWorkspaces[workspaceName];

    currentWorkspace.pkgJson.workspaces = relatedWorkspaces.map(name => path.relative(currentWorkspace.newLocation, allWorkspaces[name].newLocation));

    fse.writeFileSync(
      path.join(
        currentWorkspace.newLocation,
        packageJsonName ? packageJsonName : 'package.json',
      ),
      JSON.stringify(currentWorkspace.pkgJson, null, 2),
    )

    if (ignoreDevPackageJsonName) {
      currentWorkspace.pkgJson.devDependencies = {};
      fse.writeFileSync(
        path.join(currentWorkspace.newLocation, ignoreDevPackageJsonName),
        JSON.stringify(currentWorkspace.pkgJson, null, 2),
      );
    }

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

  function start() {
    const { prodWorkspaces, devWorkspaces, collectedDependenciesToInstall } = getAllRelatedWorkspaces();

    const destWorkspacesDir = createFolderForRelatedWorkspaces();

    copyRelatedWorkspacesToDest([...prodWorkspaces, ...devWorkspaces], devWorkspaces, destWorkspacesDir);

    if (monorepoMode) {
      createMonoRepo([...prodWorkspaces, ...devWorkspaces]);
    } else {
      resolvePackageJsonWithNewLocations([...[...prodWorkspaces, ...devWorkspaces], workspaceName]);
    }

    if (!ignoreYarnLock) createYarnLock(collectedDependenciesToInstall);
  }

  return {
    getAllRelatedWorkspaces,
    createFolderForRelatedWorkspaces,
    copyRelatedWorkspacesToDest,
    changeLocation,
    resolvePackageJsonWithNewLocations,
    createMonoRepo,
    createYarnLock,
    start
  }

}

module.exports = {
  init
}

