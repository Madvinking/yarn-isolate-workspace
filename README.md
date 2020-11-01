# yarn-isolate-workspace

**Isolate a workspace in yarn workspaces project** (works with lerna set to yarn)
when working in monorepo you could have a workspaces that depend on other workspaces
in order to prepare such workspace to deployment (eg. copy all related files to docker image)
you have to isolate the workspace meaning copy all the related workspaces to the choosen workspace.

## for example

```
├── lerna.json
├── node_modules
├── package.json
├── yarn-lock.json
└── packages
    ├── project-a (can be deploy)
    ├── util-a (private)
    ├── util-b
    ├── util-c
```

**Also**, let's say that app depends on util-a and util-b.
**And**, util-b depends on utils-c.

### Problems
1. in order to deploy project-a u need all related utils and also all their related utils
2. u need to generate a yarn.lock file that include only project-a and the relevant utils
3. if u using docker and want to manage a well orgnized docker context to each project,
   you also need everything in project-a folder and not use the root package.json and yarn.lock

### Solution

isolate the project.
```shell
  npx yarn-isolate-workspace packages/project-a
```
OR
```shell
yarn global add yarn-isolate-workspace
yarn-isolate-workspace packages/project-a
```
OR
```shell
yarn add yarn-isolate-workspace
yarn-isolate-workspace packages/project-a
```
by passing the folder or the name of the workspace
it will recursively copy all of the related workspaces to your desire location in the workspace dir
it will change all workspaces package.json to point to all other workspaces using an relative path.

## Cli params
```
  #### yarn-isolate [options] [workspace name to isolate]
  [--help]                                will print this message
  [--ignore-dev]                          will ignore all dev dependencies from root nad related workspaces.
  [--ignore-yarn-lock]                    will not generate yarn.lock on root workspace folder.
  [--package-json-file={value}]           different name to create root workspace package.json.
  [--workspaces-folder={value}]           different folder to copy related workspace inside the root workspace.
  [--copy-files-only]                     only copy files from the package.json file field
  [--ignore-copy-pattern={value}]         pattern that mach the pattern will be ignore in copy
  [--max-depth]                           by default we search recursively project-root 5 folder
```
