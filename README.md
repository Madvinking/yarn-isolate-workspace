# yarn-isolate-workspace

**Isolate a workspace in yarn workspaces project** (works with lerna set to yarn)
when working in mono-repo environment u have could have a workspaces that depend on other workspaces
in order to prepare such a workspace to deployment such as copy all related files to docker image
u have to isolate the workspace meaning copy all the related workspaces to the chooses workspace.

### Problems
1. in order to deploy project-a u need all related utils and also all their related utils
2. u need to generate a yarn.lock file that include only project-a and the relevant utils
3. if u using docker and want to manage a well orgnized docker context to each project,
   u also need everything in project-a folder and not use the root package.json and yarn.lock

### Solution

isolate the project.
```shell
  npx yarn-isolate-workspace packages/project-a
```
OR
```shell
npm -g yarn-isolate-workspace
yarn-isolate-workspace packages/project-a
```
OR
```shell
npm -i yarn-isolate-workspace
yarn-isolate-workspace packages/project-a
```
passing folder or name of the workspace
will recursively copy all of the related workspaces to your desire location in the workspace dir

in original mode
it will change all workspaces package.json to point to all other workspaces using an relative path.

in a monorepo-mode
it will make the selected workspace the root of the workspace project

## Cli params
```
  #### yarn-isolate [options] [workspace name to isolate]
    [--ignore-copy-dev]              disable DEV dependencies on copying workspaces
    [--disable-yarnrc]                wont generate .yarnrc file
    [--disable-yarn-lock]             wont generate yarn.lock
    [--disable-src-less-folder]       wont create the src-less folders
    [--disable-src-less-prod-folder]  wont create the prod src-less folder
    [--disable-json-file]             wont create json file
    [--disable-json-prod-file]        wont create json prod json file
    [--output-folder]                 folder to create all generated files (default to _isolated_)
  * [--copy-files-only]               include only files listed on the file key in the package.json
  * [--ignore-copy-pattern={value}]   pattern that mach the pattern will be ignore in copy
    [--max-depth]                     by default we search recursively project-root 5 folder
    [--workspace-folder={value}]      absolute path to project-root (default will look for the root)

  * in progress
```
