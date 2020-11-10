
const fse = require('fs-extra');

const { cleanAfter, originalMode, runWithParam, workspacePathPkgJsonPath, workspacePath, originalPkgJSON, assertDeps } = require('./utils');

describe('original mode', () => {
  afterEach(cleanAfter);

  test('clean run - override package.json | override node_modules | path to files', async () => {
    runWithParam();

    const nodeModules =  fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    assertDeps(originalMode.mainWorkspace, originalMode.mainWorkspace.path);
    assertDeps(originalMode.workspace1, originalMode.workspace1.path);
  });

  test('--package-json-name - keep package.json and create isolate.json | override node_modules | path to files', async () => {
    runWithParam('--package-json-name=isolate.json');

    const pkgJson = JSON.parse(fse.readFileSync(workspacePathPkgJsonPath));
    expect(pkgJson).toEqual(originalPkgJSON);

    const nodeModules =  fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    const isolateFile = fse.existsSync(`${workspacePath}/isolate-prod.json`);
    expect(isolateFile).toEqual(false);

    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate.json`);
    assertDeps(originalMode.workspace1, originalMode.workspace1.path);
  });

  test('--ignore-dev-package-json-name - override package.json and create isolate-prod.json | override node_modules | path to files', async () => {
    runWithParam('--ignore-dev-package-json-name=isolate-prod.json');

    const nodeModules =  fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    const isolateFile = fse.existsSync(`${workspacePath}/isolate.json`);
    expect(isolateFile).toEqual(false);

    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate-prod.json`, { devDependencies: {} });
    assertDeps(originalMode.mainWorkspace, originalMode.mainWorkspace.path);
    assertDeps(originalMode.workspace1, originalMode.workspace1.path );
  });

  test('--ignore-dev-package-json-name && --package-json-name - keep package.json and create isolate-prod.json and isolate.json | override node_modules | path to files', async () => {
    runWithParam('--ignore-dev-package-json-name=isolate-prod.json --package-json-name=isolate.json');

    const nodeModules = fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    const pkgJson = JSON.parse(fse.readFileSync(workspacePathPkgJsonPath));
    expect(pkgJson).toEqual(originalPkgJSON);

    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate.json`);
    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate-prod.json`, { devDependencies: {} });
    assertDeps(originalMode.workspace1, originalMode.workspace1.path );
  });

  test('--ignore-dev-package-json-name && --package-json-name - keep package.json and create isolate-prod.json and isolate.json | override node_modules | path to files', async () => {
    runWithParam('--ignore-dev-package-json-name=isolate-prod.json --package-json-name=isolate.json');

    const nodeModules = fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    const pkgJson = JSON.parse(fse.readFileSync(workspacePathPkgJsonPath));
    expect(pkgJson).toEqual(originalPkgJSON);

    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate.json`);
    assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate-prod.json`, { devDependencies: {} });
    assertDeps(originalMode.workspace1, originalMode.workspace1.path );
  });

  test('--src-less-folders - create 2 folders for only package.json', async () => {
    runWithParam('--src-less-folders');

    const nodeModules = fse.readdirSync(originalMode.nodeModulesPath);
    expect(nodeModules).toEqual(originalMode.workspaceList);

    const nodeModulesSrcLess = fse.readdirSync(`${workspacePath}/node_modules_src_less/packages`);
    expect(nodeModulesSrcLess).toEqual([
      'workspace-1',
      'workspace-2',
      'workspace-4',
      'workspace11',
      'workspace12',
      'workspace13',
      'workspace3'
    ]);

    const srcFile = fse.existsSync(`${workspacePath}/node_modules_src_less/packages/workspace-1/src.js`);
    expect(srcFile).toEqual(false);

    const nodeModulesSrcLessNoDev = fse.readdirSync(`${workspacePath}/node_modules_src_less_no_dev/packages`);
    expect(nodeModulesSrcLessNoDev).toEqual(['workspace-1', 'workspace-2', 'workspace-4', 'workspace3']);
    const srcFileDev = fse.existsSync(`${workspacePath}/node_modules_src_less_no_dev/packages/workspace-1/src.js`);
    expect(srcFileDev).toEqual(false);


    assertDeps(originalMode.mainWorkspace, originalMode.mainWorkspace.path);

    // const pkgJson = JSON.parse(fse.readFileSync(workspacePathPkgJsonPath));
    // expect(pkgJson).toEqual(originalPkgJSON);

    // assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate.json`);
    // assertDeps(originalMode.mainWorkspace, `${workspacePath}/isolate-prod.json`, { devDependencies: {} });
    // assertDeps(originalMode.workspace1, originalMode.workspace1.path );
  });

});
