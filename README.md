# Cloud Mate

Compile, merge, optimize, and distribute static files including: TypeScript, JavaScript, Less, Sass, CSS.

## Highlights

* Compiple and merge multiple files, and multiple file formats in a singe file.
* JSON configuration.
* Easy configuration no matter how advanced the requirements are.
* No need to add this package into the project package dependencies.

## Getting started

### Install globally from npm

`> npm i -g cloudmate`

## Simple scenario

### Create JSON configuration file in your project

`mateconfig.json`

```json
{
    "files":  
    [
        {
            "output": ["dist/index.js"],
            "input": ["src/index.ts"]
        }
    ]
}
```

### Execute

Run mate from the terminal

`> mate`

## Configuration

Cloud mate could handle simple configuration which requires a minimum of 1 input and i output.

On the other hand, it could handle advanced configuration where the developer could merge multiple files into 1 and distributed in multiple directory using **Build**.

### Builds

Builds are set of settings/distribution environment, each build could overwrite the output directory and default compilation and configuration.

Default build's name is **dev**, so if the developer didn't specify the build of files, it would be by default the **dev** build.

```json
{
    "builds":
    [
        { // Default Build
            "name": "dev",
            "css": {
                "minify": false,
                "sourceMap": true
            },
            "js": {
                "minify": false,
                "sourceMap": true,
                "declaration": true
            },
            "ts": {
                "compilerOptions": { // 1.
                    "target": "es5",
                    "noEmitOnError": false,
                    "noImplicitAny": false,
                }
            }
        },
        { // Distribution Build
            "name": "dist",
            "outDir": "dist", // 2.
            "outDirVersioning": true, // 3.
            "outDirName": true, // 4.
            "css": {
                "outDirSuffix": "css", // 5.
                "minify": true,
                "sourceMap": false
            },
            "js": {
                "outDirSuffix": "js",
                "minify": true,
                "sourceMap": false
            },
            "ts": {
                "compilerOptions": {
                    "declaration": true
                }
            }
        }
    ],
    "files": [...]
}
```

**1. ts compilerOptions**
accepts tsconfig compiler options <https://www.typescriptlang.org/docs/handbook/compiler-options.html>

* ignore
    * declaratio and sourceMap (will be defined under js options).
    * outDir, outFile, and other similar options.

**2. outDir**
overwrites the output directory.

**3. outDirVersioning**
creates a sub directory under the outDir which will be named under the project version

* outDir should be specified to take effect.
* project version will try to find "version" under the mateconfig.json.
* if not found will try to find it under the "package.json".

**4. outDirName**
creates a sub directory under the outDir (and under the version folder if specified) which will be named under the project name

* outDir should be specified to take effect.
* project name will try to find "name" under the mateconfig.json.
* if not found will try to find it under the "package.json".

**5. outDirSuffix**
creates a sub directory for the specified file type.

### Files

```json
{
    "builds": [...],
    "files":
    [
        { // 1.
            "output": ["test/temp.txt", "test/temp2.txt"],
            "input": [
                "files/temp1.txt"
            ]
        },
        { // 2.
            "output": ["test/site.css"],
            "input": [
                "files/cssFile.css",
                "files/lessFile1.less",
                "files/lessFile2.less",
                "files/saasFile.scss"
            ],
            "builds": ["dev", "dist"]
        },
        { // 2.
            "output": ["test/site.js"],
            "input": [
                "files/tsFile1.ts",
                "files/tsFile2.ts"
            ],
            "builds": ["dev", "dist"]
        },
        { // 3.
            "output": ["README.md"],
            "input": ["README.md"],
            "builds": ["dist"]
        }
    ]
}
```

**1. Single input to Multiple outputs**

* Single input which creates a duplicate copy of the file into 2 outputs.
* Build is not specified so it will use the **dev** build (the default build configuration dev build is specified).

**2. Multiple inputs to Single output**

* Multiple inputs with multiple inputs formats which will be compiled and merge into a single output.
* It will run using **dev** and **dist** builds.

**2. Single inputs to Single output**

* Single input to be cloned into another path, the new directory is specified in the **dist** build.
* It will run using the **dist** build only.

And of course, it could be multiple inputs into multiple outputs.

## CLI commands

### Usage

`> mate [builds] [options]`

### General

Run **dev** build only

`> mate`

run **dist** build only

`> mate dist`

run **dev** and **dist** and **abc** builds

`> mate dev dist abc`

### Options

Print Cloud Mate version

`-v, --version`

Print cli information

`-h, --help`

Run all builds

`-a, --all`

Watch input files

`-w, --watch`
