
const { execSync } = require('child_process');
const fse = require('fs-extra');
const path = require('path');

let workspacePath = path.join(__dirname, 'monoRepo/packages/root-workspace');
let workspacePathPkgJsonPath = path.join(workspacePath, 'package.json');
const originalPkgJSON = require(workspacePathPkgJsonPath);

const runWithParam = (params = '') => {
  execSync(`node ${path.join(__dirname, '../src/index.js')} --root-workspace=${path.join(__dirname, 'monoRepo')} root-workspace ${params}`);
}

const cleanAfter = () =>  {
  fse.writeFileSync(
    workspacePathPkgJsonPath,
    JSON.stringify(originalPkgJSON, null, 2),
  );
  execSync(`cd ${workspacePath} && rm -rf node_modules isolate.json isolate-prod.json .yarnrc yarn.lock node_modules_src_less node_modules_src_less_no_dev`);
}

const originalMode = {
  nodeModulesPath: `${workspacePath}/node_modules`,
  workspaceList: [
    'workspace-1',
    'workspace-11',
    'workspace-12',
    'workspace-13',
    'workspace-2',
    'workspace-3',
    'workspace4'
  ],
  mainWorkspace: {
    path: workspacePathPkgJsonPath,
    dependencies: {
      'workspace-1': 'file:node_modules/workspace-1',
      'workspace-2': 'file:node_modules/workspace-2',
      'in-root-dep-1': '1',
      'in-root-dep-2': '2'
    },
    devDependencies: {
      'workspace-11': 'file:node_modules/workspace-11',
      'workspace-12': 'file:node_modules/workspace-12',
      'in-root-dev-dep-1': '1',
      'in-root-dev-dep-2': '1'
    },
  },
  workspace1: {
   path: `${workspacePath}/node_modules/workspace-1/package.json`,
   dependencies: {
    'workspace-2': 'file:../workspace-2',
    'workspace-3': 'file:../workspace-3',
    'in-w1-dep-1': '1',
    'in-w1-dep-2': '1'
    },
    devDependencies: {
      'workspace-11': 'file:../workspace-11',
      'workspace-13': 'file:../workspace-13',
      'in-w1-dev-dep-1': '1',
      'in-w1-dev-dep-2': '1'
    }
  }
}

const assertDeps = (workspace, file, { dependencies = null, devDependencies = null } = {}) => {
  const { dependencies: fileDependencies, devDependencies: fileDevDependencies } = JSON.parse(fse.readFileSync(file));
  if (dependencies) expect(fileDependencies).toEqual(dependencies);
  else expect(fileDependencies).toEqual(workspace.dependencies);

  if (devDependencies) expect(fileDevDependencies).toEqual(devDependencies);
  else expect(fileDevDependencies).toEqual(workspace.devDependencies);

}


module.exports = {
  originalMode,
  cleanAfter,
  runWithParam,
  originalPkgJSON,
  assertDeps,
  workspacePathPkgJsonPath,
  workspacePath
}