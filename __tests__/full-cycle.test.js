
const fse = require('fs-extra');

const { cleanAfter, originalMode, runWithParam, workspacePathPkgJsonPath, workspacePath, originalPkgJSON, assertDeps } = require('./utils');

describe('original mode', () => {
  afterEach(cleanAfter);

  test('no params should create all files', async () => {
    runWithParam();

    const nodeModules =  fse.readdirSync(originalMode.nodeModulesPath);

    expect(nodeModules).toEqual(originalMode.workspaceList);

    assertDeps(originalMode.mainWorkspace, originalMode.mainWorkspace.path);
    assertDeps(originalMode.workspace1, originalMode.workspace1.path);
  });


});
