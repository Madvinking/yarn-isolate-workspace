const { execSync } = require('child_process');
const fse = require('fs-extra')
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

    expect(fs.readFileSync(`${workspaceFolder}/_isolated_/.yarnrc`, { encoding:'utf-8' })).toEqual('hola');
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

    expect(fse.readFileSync(`${workspaceFolder}/_isolated_/.yarnrc`, {encoding: 'utf-8'})).toEqual('workspaces-experimental true');
  });

  test.only('--disable-yarn-lock:  disable yarn lock creation', async () => {
    runWithParam('--disable-yarn-lock');

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

  test('--disable-src-less-folder: disable src less folder creation', async () => {
    runWithParam('--disable-src-less-folder');

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

  test('--disable-src-less-prod-folder: disable src less prod folder creation', async () => {
    runWithParam('--disable-src-less-prod-folder');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_`);
    expect(folder).toEqual(['.yarnrc', 'package-prod.json', 'package.json', 'workspaces', 'workspaces-src-less', 'yarn.lock']);
  });

  test('--disable-json-file: disable json file creation', async () => {
    runWithParam('--disable-json-file');

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

  test('--disable-json-prod-file: disable json prod file creation', async () => {
    runWithParam('--disable-json-prod-file');

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
    runWithParam(`--output-folder=_isolated-other_ --ignore-copy-regex='src.js|node_modules'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated-other_/workspaces/packages/workspace-1`);

    expect(folder).toEqual(['_isolated-other_', 'nestedFolder', 'package.json']);
  });

  test('should include in src-less param', async () => {
    runWithParam(`--includes-with-src-less='src.js'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages/workspace-1`);

    expect(folder).toEqual(['package.json', 'src.js']);
  });

  test('should include in src-less param nested', async () => {
    runWithParam(`--includes-with-src-less='nestedFolder/nestedFile.js'`);

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/workspaces-src-less/packages/workspace-1`);

    expect(folder).toEqual(['nestedFolder', 'package.json']);
  });

  test('should include main workspace src files', async () => {
    runWithParam('--copy-src-files --disable-src-less-folder --disable-yarn-lock');

    const folder = fse.readdirSync(`${workspaceFolder}/_isolated_/`);

    expect(folder).toEqual(['.yarnrc', 'package-prod.json', 'package.json', 'src.js', 'workspaces', 'workspaces-src-less-prod']);
  });
});
