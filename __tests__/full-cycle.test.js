const { execSync } = require('child_process');
const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');

let workspaceFolder = path.join(__dirname, 'monoRepo/packages/root-workspace');
let workspaceFolder1 = path.join(__dirname, 'monoRepo/packages/workspace-1');

const runWithParam = (params = '', workspace = 'root-workspace') => {
  execSync(
    `node ${path.join(__dirname, '../src/index.js')} --project-folder=${path.join(__dirname, 'monoRepo')} ${workspace} ${params}`,
  );
};

const clean = () => {
  execSync(
    ` rm -rf ${workspaceFolder}/_isolated_ ${workspaceFolder}/_isolated-other_ ${workspaceFolder1}/_isolated_ ${workspaceFolder1}/_isolated-other_`,
  );
};

describe('full cycle of isolated', () => {
  afterEach(clean);

  test('should create all files', async () => {
    runWithParam();

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
    expect(fse.readFileSync(`${workspaceFolder}/_isolated_/.yarnrc`).toString()).toEqual('hola');

    const listOfAllWorkspaces = [
      'workspace-1',
      'workspace-2',
      'workspace-4',
      'workspace11',
      'workspace12',
      'workspace13',
      'workspace16',
      'workspace3',
    ];

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces/packages`)).toEqual(listOfAllWorkspaces);

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages`)).toEqual(listOfAllWorkspaces);

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less-prod/packages`)).toEqual([
      'workspace-1',
      'workspace-2',
      'workspace-4',
      'workspace3',
    ]);

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces/packages/workspace-1`)).toEqual([
      'nestedFolder',
      'package.json',
      'src.js',
    ]);

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages/workspace-1`)).toEqual(['package.json']);

    expect(fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less-prod/packages/workspace-1`)).toEqual([
      'package.json',
    ]);

    const mainPackageJSON = JSON.parse(fse.readFileSync(`${workspaceFolder}/package.json`).toString());
    const generatedPackageJSON = JSON.parse(fse.readFileSync(`${workspaceFolder}/_isolated_/package.json`).toString());

    expect(mainPackageJSON.dependencies).toEqual(generatedPackageJSON.dependencies);
    expect(mainPackageJSON.devDependencies).toEqual(generatedPackageJSON.devDependencies);
    expect(generatedPackageJSON.workspaces).toEqual([
      'workspaces/packages/workspace-1',
      'workspaces/packages/workspace-2',
      'workspaces/packages/workspace3',
      'workspaces/packages/workspace-4',
      'workspaces/packages/workspace11',
      'workspaces/packages/workspace12',
      'workspaces/packages/workspace13',
      'workspaces/packages/workspace16',
    ]);

    const generatedProdPackageJSON = JSON.parse(fse.readFileSync(`${workspaceFolder}/_isolated_/package-prod.json`).toString());

    expect(mainPackageJSON.dependencies).toEqual(generatedPackageJSON.dependencies);
    expect(generatedProdPackageJSON.devDependencies).toEqual({});
    expect(generatedProdPackageJSON.workspaces).toEqual([
      'workspaces/packages/workspace-1',
      'workspaces/packages/workspace-2',
      'workspaces/packages/workspace3',
      'workspaces/packages/workspace-4',
    ]);

    expect(fs.readFileSync(`${workspaceFolder}/_isolated_/.yarnrc`, { encoding: 'utf-8' })).toEqual('hola');
    expect(fse.readFileSync(`${workspaceFolder}/_isolated_/yarn.lock`).toString()).toMatchSnapshot();
  });

  test('--output-folder: generated in a different output folder', async () => {
    runWithParam('--output-folder=_isolated-other_');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated-other_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
    expect(fse.existsSync(`${workspaceFolder}/_isolated_`)).toEqual(false);
  });

  test('--yarnrc-disable: disable yarnrc creation', async () => {
    runWithParam('--yarnrc-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
  });

  test('--yarnrc-generate: generate .yarnrc', async () => {
    runWithParam('--yarnrc-generate');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);

    expect(fse.readFileSync(`${workspaceFolder}/_isolated_/.yarnrc`, { encoding: 'utf-8' })).toEqual(
      'workspaces-experimental true',
    );
  });

  test('--yarn-lock-disable: disable yarn lock creation', async () => {
    runWithParam('--yarn-lock-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
    ]);
  });

  test('--src-less-disable: disable src less folder creation', async () => {
    runWithParam('--src-less-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
  });

  test('--src-less-prod-disable]: disable src less prod folder creation', async () => {
    runWithParam('--src-less-prod-disable]');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual(['.yarnrc', 'package-prod.json', 'package.json', 'workspaces', 'workspaces-src-less', 'yarn.lock']);
  });

  test('--json-file-disable: disable json file creation', async () => {
    runWithParam('--json-file-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
  });

  test('--json-file-prod-disable: disable json prod file creation', async () => {
    runWithParam('--json-file-prod-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual([
      '.yarnrc',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);
  });

  test('should not copy nested output folders (default _isolated_)', async () => {
    runWithParam('--output-folder=_isolated-other_', 'workspace-1');
    runWithParam('--output-folder=_isolated-other_');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated-other_/workspaces/packages/workspace-1`);

    expect(folder).toEqual(['nestedFolder', 'package.json', 'src.js']);
  });

  test('should filter by regex when copy files (default _isolated_ & node_modules)', async () => {
    runWithParam('--output-folder=_isolated-other_', 'workspace-1');
    runWithParam(`--output-folder=_isolated-other_ --workspaces-exclude-glob='src.js'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated-other_/workspaces/packages/workspace-1`);

    expect(folder).toEqual(['nestedFolder', 'package.json']);
  });

  test('--src-less-glob: should include in src-less param', async () => {
    runWithParam(`--src-less-glob='src.js'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages/workspace-1`);

    expect(folder).toEqual(['package.json', 'src.js']);
  });

  test('--src-less-prod-glob: should include in src-less param nested', async () => {
    runWithParam(`--src-less-prod-glob='nestedFolder/nestedFile.js'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less-prod/packages/workspace-1`);

    expect(folder).toEqual(['nestedFolder', 'package.json']);
  });

  test('--src-files-enable: should include main workspace src files', async () => {
    runWithParam('--src-files-enable --src-less-disable --yarn-lock-disable');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/`);

    expect(folder).toEqual([
      '.yarnrc',
      'no.js',
      'package-prod.json',
      'package.json',
      'src.js',
      'workspaces',
      'workspaces-src-less-prod',
    ]);
  });

  test('--src-files-exclude-glob: should exclude main workspace recived values', async () => {
    runWithParam("--src-files-exclude-glob='no.js' --src-less-disable --yarn-lock-disable");

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/`);

    expect(folder).toEqual(['.yarnrc', 'package-prod.json', 'package.json', 'src.js', 'workspaces', 'workspaces-src-less-prod']);
  });

  test('--src-files-include-glob: should exclude main workspace recived values', async () => {
    runWithParam("--src-files-include-glob='src.js' --src-less-disable --yarn-lock-disable");

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/`);

    expect(folder).toEqual(['.yarnrc', 'package-prod.json', 'package.json', 'src.js', 'workspaces', 'workspaces-src-less-prod']);
  });

  test('--src-less-sub-dev-deps: should inclue sub worksapced dev deps', async () => {
    runWithParam('--src-less-sub-dev-deps');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/`);

    expect(folder).toEqual([
      '.yarnrc',
      'package-prod.json',
      'package.json',
      'workspaces',
      'workspaces-src-less',
      'workspaces-src-less-prod',
      'yarn.lock',
    ]);

    const subWorkspacePackgeJson = JSON.parse(
      fse.readFileSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages/workspace-1/package.json`).toString(),
    );

    expect(subWorkspacePackgeJson.devDependencies).toEqual({
      'workspace-11': '1',
      'workspace-13': '1',
      'workspace-15': '1',
      'in-w1-dev-dep-1': '1',
      'in-w1-dev-dep-2': '1',
    });

    expect(fse.readFileSync(`${workspaceFolder}/_isolated_/yarn.lock`).toString().includes('in-w1-dev-dep-1@1')).toEqual(true);
  });
});
