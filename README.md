# Cloud Mate

Compile, merge, optimize, and distribute static files including: TypeScript, JavaScript, Less, Sass, CSS.

## Highlights

* Compile and distribute single or multiple files to a single or multiple output.
* Compress images (jpeg, png, gif, and svg);
* Create advanced configuration with simple JSON, YAML, or JavaScript configuration file, no coding required.
* No need to add the package into the project package dependencies, just install it globally.

## Getting started

### Install globally from npm

```bash
npm i -g cloudmate
```

## Simple scenario

### Create one of the following configuration file in your project:

```js
// JSON or YAML
.mateconfig

// JSON
.mateconfig.json

// YAML
.mateconfig.yaml,
.mateconfig.yml,

// JavaScipt
.mateconfig.json,

// JSON under "mateconfig" property
package.json
```

JSON Configuration file sample content:

```json
{
    "files":  
    [
        {
            "output": "dist/index.js",
            "input": "src/index.ts"
        }
    ]
}
```

### Execute

Run mate from the terminal

```bash
mate
```

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
        {
            "name": "dev",
            "css": {
                "minify": false,
                "sourceMap": true
            },
            "js": {
                "minify": false,
                "sourceMap": true,
                "declaration": true,
                "webClean": true
            }
        },
        {
            "name": "dist",
            "outDir": "dist",
            "outDirVersioning": true,
            "outDirName": true,
            "css": {
                "outDirSuffix": "css",
                "minify": true,
                "sourceMap": false
            },
            "js": {
                "outDirSuffix": "js",
                "minify": true,
                "sourceMap": false
            }
        }
    ],
    "files": [...]
}
```

> First build is development build (default)

> Second build is distribution build

**webClean**
removes unwanted JavaScript codes such as require(…). Make sure you’ve bundled all required files or added them to the html in the right order

> **Important:** Web Clean is in early staging development, and it requires module ES6 and highigher under ts compilerOptions.

**ts compilerOptions**
Reads tsconfig.json file if found.

* ignore
    * declaratio and sourceMap (will be defined under js options).
    * outDir, outFile, and other similar options.

**outDir**
overwrites the output directory.

**outDirVersioning**
creates a sub directory under the outDir which will be named under the project version

* outDir should be specified to take effect.
* project version will try to find "version" under the configuration file.
* if not found will try to find it under the "package.json".

**outDirName**
creates a sub directory under the outDir (and under the version folder if specified) which will be named under the project name

* outDir should be specified to take effect.
* project name will try to find "name" under the configuration file.
* if not found will try to find it under the "package.json".

**outDirSuffix**
creates a sub directory for the specified file type.

### Files

```json
{
    "builds": [...],
    "files":
    [
        {
            "output": ["test/temp.txt", "test/temp2.txt"],
            "input": "files/temp1.txt"
        },
        {
            "output": "test/site.css",
            "input": [
                "files/cssFile.css",
                "files/lessFile1.less",
                "files/lessFile2.less",
                "files/saasFile.scss"
            ],
            "builds": ["dev", "dist"]
        },
        {
            "output": "test/site.js",
            "input": [
                "files/tsFile1.ts",
                "files/tsFile2.ts"
            ],
            "builds": ["dev", "dist"]
        },
        {
            "output": "README.md",
            "input": "README.md",
            "builds": "dist"
        }
    ]
}
```

**First File Definition: Single input to Multiple outputs**

* Single input which creates a duplicate copy of the file into 2 outputs.
* Build is not specified so it will use the **dev** build (the default build configuration dev build is specified).

**Second File Definition: Multiple inputs to Single output**

* Multiple inputs with multiple inputs formats which will be compiled and merge into a single output.
* It will run using **dev** and **dist** builds.

**Third File Definition: Single inputs to Single output**

* Single input to be cloned into another path, the new directory is specified in the **dist** build.
* It will run using the **dist** build only.

And of course, it could be multiple inputs into multiple outputs.

### Images

```json
{
    "images":
    [
        {
            "output": "test/img",
            "input": "images/**"
        }
    ]
}
```

## CLI commands

### Usage

```bash
mate [builds] [options]
```

### General

Run **dev** build only

```bash
mate
```

run **dist** build only

```bash
mate dist
```

run **dev** and **dist** and **abc** builds

```bash
mate dev dist abc
```

### Options

Print Cloud Mate version

```bash
-v, --version
```

Print cli information

```bash
-h, --help
```

Run all builds

```bash
-a, --all
```

Watch input files

```bash
-w, --watch
```
