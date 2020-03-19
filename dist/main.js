"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("./config");
var chokidar = require("chokidar");
var gulp = require('gulp');
var gulpLess = require('gulp-less');
var gulpSass = require('gulp-sass');
var gulpRename = require('gulp-rename');
var gulpConcat = require("gulp-concat");
var gulpTs = require("gulp-typescript");
var gulpSourcemaps = require("gulp-sourcemaps");
var gulpUglify = require('gulp-uglify');
var merge2 = require('merge2');
var gulpCleanCSS = require('gulp-clean-css');
var gulpFilter = require('gulp-filter-each');
var path = require('path');
var webClean = require('./webcleanjs');
var bundle = function (files, build) {
    var process = [];
    var groupFilesExtention = '';
    var groupedFiles = [];
    files.forEach(function (file) {
        var fileExtention = file.split('.').pop().toLowerCase();
        if (fileExtention !== groupFilesExtention) {
            if (groupedFiles.length > 0) {
                process.push(compile(groupedFiles, groupFilesExtention, build));
                groupedFiles = [];
            }
            groupFilesExtention = fileExtention;
        }
        groupedFiles.push(file);
    });
    if (groupedFiles.length > 0)
        process.push(compile(groupedFiles, groupFilesExtention, build));
    var stream = merge2();
    process.forEach(function (p) {
        stream.add(p);
    });
    return stream;
};
var compile = function (files, extention, build) {
    var process = gulp.src(files);
    switch (extention) {
        case 'css':
            return process.pipe(gulpConcat('empty'));
        case 'less':
            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.init());
            process = process.pipe(gulpLess());
            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.write());
            return process.pipe(gulpConcat('empty'));
        case 'scss':
            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.init());
            process = process.pipe(gulpSass().on('error', gulpSass.logError));
            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.write());
            return process.pipe(gulpConcat('empty'));
        case 'ts':
            if (build.js.sourceMap)
                process = process.pipe(gulpSourcemaps.init());
            process = process.pipe(gulpTs(build.ts.compilerOptions));
            if (build.js.sourceMap)
                process = process.pipe(gulpSourcemaps.write());
            return process.pipe(gulpConcat('empty'));
        case 'd.ts':
            return process.pipe(gulpTs(config_1.MateConfigTSConfig.declarationCompilerOptions(build.ts.compilerOptions)));
    }
    return process;
};
var createTypeScriptDeclaration = function (files, outputDirectory, outputFileName, build) {
    var typescriptDeclarations = [];
    files.forEach(function (file) {
        var fileExtention = file.split('.').pop().toLowerCase();
        if (fileExtention === 'ts')
            typescriptDeclarations.push(file);
    });
    if (typescriptDeclarations.length > 0)
        compile(typescriptDeclarations, 'd.ts', build)
            .pipe(gulpFilter(function (content, filepath) { return filepath.toLowerCase().endsWith('.d.ts'); }))
            .pipe(gulpConcat('empty'))
            .pipe(gulpRename({
            basename: outputFileName.replace('.js', ''),
            suffix: '.d',
            extname: '.ts'
        }))
            .pipe(gulp.dest(outputDirectory));
};
var allWatchers = [];
exports.watch = function (builds) {
    if (builds === undefined || (builds !== null && builds.length === 0))
        builds = ['dev'];
    var configWatcher = chokidar.watch('mateconfig.json', { persistent: true })
        .on('change', function (event, path) {
        allWatchers.forEach(function (watcher) {
            watcher.close();
        });
        allWatchers = [];
        exports.watch(builds);
    });
    allWatchers.push(configWatcher);
    var config = config_1.MateConfig.get();
    config.files.forEach(function (file) {
        file.builds.forEach(function (buildName) {
            if (builds === null || builds.indexOf(buildName) !== -1) {
                var watch_1 = chokidar.watch(file.input, { persistent: true })
                    .on('change', function (event, path) {
                    runFiles(config, file, [buildName]);
                });
                allWatchers.push(watch_1);
            }
        });
    });
    exports.runBuild(builds);
};
exports.runBuild = function (builds) {
    console.log('executed at ' + new Date().toTimeString());
    var config = config_1.MateConfig.get();
    config.files.forEach(function (file) {
        runFiles(config, file, builds);
    });
};
var runFiles = function (config, file, builds) {
    if (builds === undefined || (builds !== null && builds.length === 0))
        builds = ['dev'];
    file.output.forEach(function (output) {
        var outputExtention = output.split('.').pop().toLowerCase();
        var outputFileName = output.replace(/^.*[\\\/]/, '');
        file.builds.forEach(function (buildName) {
            if (builds !== null && builds.indexOf(buildName) === -1)
                return;
            var build = config.getBuild(buildName);
            var outputDirectory = build.outDir ? build.outDir : path.dirname(output);
            if (build.outDirVersioning)
                outputDirectory += '/' + config.getOutDirVersion();
            if (build.outDirName)
                outputDirectory += '/' + config.getOutDirName();
            switch (outputExtention) {
                case 'css':
                    if (build.css.outDirSuffix)
                        outputDirectory += '/' + build.css.outDirSuffix;
                    break;
                case 'js':
                    if (build.js.outDirSuffix)
                        outputDirectory += '/' + build.js.outDirSuffix;
                    break;
            }
            if (build.js.declaration === true)
                createTypeScriptDeclaration(file.input, outputDirectory, outputFileName, build);
            var process = bundle(file.input, build)
                .pipe(gulpConcat('empty'));
            switch (outputExtention) {
                case 'js':
                    if (build.js.webClean)
                        process = process.pipe(webClean());
                    break;
            }
            process = process.pipe(gulpRename(outputFileName))
                .pipe(gulp.dest(outputDirectory));
            switch (outputExtention) {
                case 'css':
                    if (build.css.minify) {
                        process.pipe(gulpCleanCSS())
                            .pipe(gulpRename({ suffix: ".min" }))
                            .pipe(gulp.dest(outputDirectory));
                    }
                    break;
                case 'js':
                    if (build.js.minify) {
                        process.pipe(gulpUglify())
                            .pipe(gulpRename({ suffix: ".min" }))
                            .pipe(gulp.dest(outputDirectory));
                    }
                    break;
            }
        });
    });
};
