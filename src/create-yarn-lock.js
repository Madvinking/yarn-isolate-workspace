const path = require('path');
const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');

module.exports.createYarnLock = ({ yarnLockDisable, rootDir, projectWorkspaces, srcLessSubDev, workspaceData, isolateFolder }) => {
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
          if (oldFile[depName] && oldFile[depName].dependencies) {
            recursive(oldFile[depName].dependencies);
          }
        } else if (projectWorkspaces[name]) {
          if (srcLessSubDev) {
            recursive({ ...projectWorkspaces[name].pkgJson.dependencies, ...projectWorkspaces[name].pkgJson.devDependencies });
          } else {
            recursive(projectWorkspaces[name].pkgJson.dependencies);
          }
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

  const newLock = lockfile.stringify(newFile);
  fs.writeFileSync(path.join(isolateFolder, 'yarn.lock'), newLock);
  return newLock;
};
