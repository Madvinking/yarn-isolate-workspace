# yarn-isolate-workspace

**Isolate a workspace in yarn workspaces project**
when working in yarn workspaces environment
u have could have a workspaces that depend on other workspaces
this behavior make it hard to prepare a workspace to production environment
since u need to copy all related workspaces.

this tool help u isolate the workspace.
it will copy all related workspaces to a destination folder under the workspace
and will make it a root workspace to all the other copied workspaces

### for example
if we have a tree that looks like this:

|- workspace-1
|   |- package.json
|   |- src-code
|- workspace-2
|   |- package.json
|   |- src-code
|-package.json

and workspace-1 depend on workspace-2
after running
`npx yarn-isolate-workspace workspace-1`
the tree will look like this:

|- workspace-1
|   |- _isolated_
|   |   |-workspaces
|   |   |  |- workspace-2
|   |   |  |   |- package.json
|   |   |  |   |- src-code
|   |   |-workspaces-src-less
|   |   |  |- workspace-2
|   |   |  |   |- package.json
|   |   |-workspaces-src-less-prod
|   |   |  |- workspace-2
|   |   |  |   |- package.json
|   |   |-package.json
|   |   |-package-prod.json
|   |   |.yarnrc
|   |   |.yarn.lock
|   |- package.json
|   |- src-code
|- workspace-2
|   |- package.json
|   |- src-code
|-package.json


### what did u get?
the tool created a folder by (default name _isolated_)
this folder contain number of stuff

  1. workspaces folder - contain all related workspaces (in the example workspace 2)

  2. workspaces-src-less folder - contain all related workspaces by only package.json files.
    * solution if the workspace depend on multiple workspaces and need to do a COPY command in dockerfile
      so u can copy all workspaces-src-less instead COPY each package.json

  3. workspaces-src-less-prod folder - contain all related workspaces that are not in devDependencies and
     remove all devDependencies from all package.json files
    * so if u plan to run 'yarn install --prod' it

  4. package.json file - same as the workspace package.json just with the key of workspaces
     and all related workspaces are listed there so it could resolve them

  5. package-prod.json file - package.json without devDependencies dependencies or workspaces

  6. .yarnrc - to make this workspace a workspace-root

  7. yarn.lock - if there is a yarn.lock file in the root of the project,
     it will copy all relevant dependencies from it


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
