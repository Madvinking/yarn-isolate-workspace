# yarn-isolate-workspace

![npm](https://img.shields.io/npm/v/yarn-isolate-workspace)

**Isolate a workspace in yarn workspaces project**
when working in yarn workspaces environment
sometimes there is workspaces that depend on other workspaces.
this behavior make it hard to prepare a workspace for a production environment,
since u need to copy all related workspaces along with it.

this tool help u isolate the workspace.
it will copy all related workspaces to a destination folder under the workspace
and will make it a root workspace to all the other copied workspaces.
that way u end up with isolated project that have everything it need under one folder

### motivation
using CI/CD to get your project ready for production its extremly tricky with monorepos.
when your monorepo get to big and u want to dockerized each service independly, u want to prevent
make your dockerfile context scope the root of the monorepo,
and make te scope for the folder of your worksapce/project/service folder.
in order to achive it, u need to copy all project depence workspaces to this folder.


### example
if we have a monorepo workspaces tree that looks like this:
```
├── workspace-1
├   ├── package.json
├   ├── src-code
├── workspace-2
├   ├── package.json
├   ├── src-code
├── package.json
├── .yarnrc
├── yarn.lock
```
and workspace-1 depend on workspace-2
after running
`npx yarn-isolate-workspace workspace-1`
the tree will look like this:
```
├── workspace-1
    ├── _isolated_
        ├── workspaces
            ├── workspace-2
                ├── package.json
                ├── src-code
        ├── workspaces-src-less
            ├── workspace-2
                ├── package.json
        ├── workspaces-src-less-prod
            ├── workspace-2
                ├── package.json
        ├── package.json
        ├── package-prod.json
        ├── .yarnrc
        ├── .yarn.lock
    ├── package.json
    ├── src-code
├── workspace-2
    ├── package.json
    ├── src-code
├── package.json
├── .yarnrc
├── .yarn.lock
```

### what did u get?
the tool created a folder (with default name _isolated_)
this folder contains:
  1. `workspaces` folder - include all the related workspaces and their source code (in the example workspace 2)
  2. `workspaces-src-less` folder - contain all related workspaces by only package.json files.
*** a folder contain all the worksapces package.json (same tree as the workspaces folder).
usally when building image with docker, u want to take advantage the docker cache layering.
and to do so u want to copy all package.json before copying all source code. to create a layer
for all the node_modules. this folder contains only those pacakge.json,
so instaed of COPY all package.json one by one, u can COPY this all folder.
  3. `workspaces-src-less-prod` folder - contain all related workspaces that are not in devDependencies and
*** same as the previues folder but each package.json filterout the devDependencis.
same as before if u run yarn install with the --prod flag
  4. `package.json` file - duplication of the main package.json just with an extra key: `workspaces`
     and all related workspaces are listed there so it could resolve them.
  5. `package-prod.json` file - duplication of the main package.json just with an extra key: `workspaces`
     and without the devDependencies.
  6. `.yarnrc` - copy if the rootscope .yarnrc if exsit if not generate the file with worksapces enable flag
  7. `yarn.lock` - if there is a yarn.lock file in the root of the project,
     it will copy all relevant dependencies from it

## Supported cli flags:
```
  #### yarn-isolate [options] [workspace name to isolate]
    [--yarnrc-disable]                     disable copy or generate .yarnrc file
    [--yarnrc-generate]                    generate yarnrc (instaed of copy the existing one)
    [--yarn-lock-disable]                  disable generate yarn.lock file

    [--src-less-disable]                   disable create of the src-less folders
    [--src-less-regex={value}]             files to include with the src-less folder

    [--src-less-prod-disable]              disable create the prod src-less folder
    [--src-less-prod-regex={value}]        files to include with the src-less-prod folder

    [--json-file-disable]                  disable create json file
    [--json-file-prod-disable]             disable create json prod json file
    [--output-folder]                      folder to create all generated files (default to _isolated_)

    [--src-files-enable]                   copy all src file of main worksapce to the isolated folder
    [--src-files-exclude-regex={value}]    copy all files of main workspace withtout those files
    [--src-files-include-regex={value}]    copy only this files from the main workspace
    [--workspaces-exclude-regex={value}]   exclude regex when copy workspaces (default: node_modules and selected output-folder(_isolated_))

    [--max-depth]                          by default we search recursively project-root 5 folder
    [--project-folder={value}]             absolute path to project-root (default will look for the root)
```
