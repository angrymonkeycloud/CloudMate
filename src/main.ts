import { MateConfig, MateConfigCSSConfig, MateConfigBuild, MateConfigFile } from "./config";
import chokidar = require('chokidar');

const gulp = require('gulp');
const gulpLess = require('gulp-less');
const gulpRename = require('gulp-rename');
const gulpConcat = require("gulp-concat");
const gulpTs = require("gulp-typescript");
const gulpSourcemaps = require("gulp-sourcemaps");
const gulpUglify = require('gulp-uglify');
const merge2 = require('merge2');
const gulpCleanCSS = require('gulp-clean-css');
const gulpFilter = require('gulp-filter-each');
const path = require('path');

const bundle = function(files: string[], build: MateConfigBuild): any {

    const process: any[] = [];

    let groupFilesExtention = '';
    let groupedFiles: string[] = [];
    
    files.forEach((file) =>{

        const fileExtention = file.split('.').pop().toLowerCase();

        if (fileExtention !== groupFilesExtention){

            if (groupedFiles.length > 0)
            {
                process.push(compile(groupedFiles, groupFilesExtention, build));
                groupedFiles = []
            }

            groupFilesExtention = fileExtention;
        }

        groupedFiles.push(file);

    });

    if (groupedFiles.length > 0)
        process.push(compile(groupedFiles, groupFilesExtention, build));

   const stream = merge2();

   process.forEach((p) =>{
    stream.add(p);
   });
    
   return stream;
}

const compile = function(files: string[], extention: string, build: MateConfigBuild): any {

    let process = gulp.src(files);

    switch (extention){
        case 'css':
            return process.pipe(gulpConcat('empty'));
            
        case 'less':

            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.init());

            process = process.pipe(gulpLess());    

            if (build.css.sourceMap)
                process = process.pipe(gulpSourcemaps.write());
            
            return process.pipe(gulpConcat('empty'));
    
        case 'ts':

            if (build.js.sourceMap)
                process = process.pipe(gulpSourcemaps.init());

            process = process.pipe(gulpTs());

            if (build.js.sourceMap)
                process = process.pipe(gulpSourcemaps.write());

            return process.pipe(gulpConcat('empty'));

        case 'd.ts':
            return process
                    .pipe(gulpTs(build.ts.compilerOptions));
    }

    return process;
}

const createTypeScriptDeclaration = function(files: string [], outputDirectory: string, outputFileName: string, build: MateConfigBuild): void {

    const typescriptDeclarations: string[] = [];
    
    files.forEach((file) => {
        const fileExtention = file.split('.').pop().toLowerCase();

        if (fileExtention === 'ts')
            typescriptDeclarations.push(file);
    });

    if (typescriptDeclarations.length > 0)
        compile(typescriptDeclarations, 'd.ts', build)
            .pipe(gulpFilter((content, filepath: string) => filepath.toLowerCase().endsWith('.d.ts')))
            .pipe(gulpConcat('empty'))
            .pipe(gulpRename({
                basename: outputFileName.replace('.js', ''),
                suffix: '.d',
                extname: '.ts'
            }))
            .pipe(gulp.dest(outputDirectory));
}

let allWatchers: chokidar.FSWatcher[] = [];

export const watch = function(builds?: string[]) {

    if (builds === undefined || (builds !== null && builds.length === 0))
        builds = ['dev'];

    const configWatcher = chokidar.watch('mateconfig.json', { persistent: true})
                                    .on('change', (event, path: string) => {

                                        allWatchers.forEach((watcher: chokidar.FSWatcher) =>
                                        {
                                            watcher.close();
                                        });

                                        allWatchers = [];

                                        watch(builds);
                                    });

    allWatchers.push(configWatcher);

    const config = MateConfig.get();

    config.files.forEach((file) => {
        file.builds.forEach((buildName) => {
            
            if (builds === null || builds.indexOf(buildName) !== -1) {

                const watch = chokidar.watch(file.input, { persistent: true})
                                        .on('change', (event, path: string) => {
                                            runFiles(config, file, [buildName]);
                                        });

                allWatchers.push(watch);
            }
        });
    });
    
    runBuild(builds);
}

export const runBuild = function(builds?: string[]) {

    const config = MateConfig.get();

    config.files.forEach((file): void => {
        
        runFiles(config, file, builds);
    });
}

const runFiles = function(config: MateConfig, file: MateConfigFile, builds?: string[]) {
    
    if (builds === undefined || (builds !== null && builds.length === 0))
        builds = ['dev'];

    file.output.forEach((output) => {
    
        const outputExtention = output.split('.').pop().toLowerCase();
        const outputFileName = output.replace(/^.*[\\\/]/, '');

        file.builds.forEach((buildName): void => {

            if (builds !== null && builds.indexOf(buildName) === -1)
                return;

            const build = config.getBuild(buildName);
        
            let outputDirectory = build.outDir ? build.outDir : path.dirname(output);

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
            
            if (build.ts.compilerOptions.declaration === true)
                createTypeScriptDeclaration(file.input, outputDirectory, outputFileName, build);

            const process = bundle(file.input, build)
            .pipe(gulpConcat('empty'))
            .pipe(gulpRename(outputFileName))
            .pipe(gulp.dest(outputDirectory));
            
            switch (outputExtention) {

                case 'css':
                    
                    if (build.css.minify) {

                        process.pipe(gulpCleanCSS())
                        .pipe(gulpRename({suffix: ".min"}))
                        .pipe(gulp.dest(outputDirectory));
                    }
                    break;

                case 'js': 
                
                    if (build.js.minify) {

                        process.pipe(gulpUglify())
                        .pipe(gulpRename({suffix: ".min"}))
                        .pipe(gulp.dest(outputDirectory));
                    }
                    break;
            }

        });

    });
}