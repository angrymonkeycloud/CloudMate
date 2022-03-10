"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MateBundler = void 0;
var path = require('path');
var config_1 = require("./config");
var chokidar = require("chokidar");
var gulp = require('gulp');
var gulpLess = require('gulp-less');
var gulpSass = require('gulp-sass')(require('sass'));
var gulpRename = require('gulp-rename');
var gulpConcat = require('gulp-concat');
var gulpTs = require('gulp-typescript');
var gulpSourcemaps = require('gulp-sourcemaps');
var gulpMinify = require('gulp-minify');
var merge2 = require('merge2');
var gulpCleanCSS = require('gulp-clean-css');
var gulpFilter = require('gulp-filter-each');
var webClean = require('./webcleanjs');
var MateBundler = (function () {
    function MateBundler() {
    }
    MateBundler.execute = function (config, builds) {
        if (!config.files)
            return;
        console.log('executed at ' + new Date().toTimeString());
        config.files.forEach(function (file) {
            MateBundler.runFiles(config, file, builds);
        });
    };
    MateBundler.watch = function (config, builds) {
        var _this = this;
        if (!config.files)
            return;
        if (builds === undefined || (builds !== null && builds.length === 0))
            builds = ['dev'];
        var configWatcher = chokidar.watch(config_1.MateConfig.availableConfigurationFile, { persistent: true }).on('change', function (event, path) {
            _this.allWatchers.forEach(function (watcher) {
                watcher.close();
            });
            _this.allWatchers = [];
            _this.watch(config, builds);
        });
        this.allWatchers.push(configWatcher);
        config.files.forEach(function (file) {
            file.builds.forEach(function (buildName) {
                if (builds === null || builds.indexOf(buildName) !== -1) {
                    var extensions = ['less', 'scss'];
                    var watchPaths_1 = [];
                    file.input.forEach(function (path) {
                        watchPaths_1.push(path);
                    });
                    for (var _i = 0, extensions_1 = extensions; _i < extensions_1.length; _i++) {
                        var extension = extensions_1[_i];
                        if (config_1.MateConfigFile.hasExtension(file.input, extension))
                            watchPaths_1.push('./**/*.' + extension);
                    }
                    var watch = chokidar.watch(watchPaths_1, { persistent: true }).on('change', function (event, path) {
                        _this.runFiles(config, file, [buildName]);
                    });
                    _this.allWatchers.push(watch);
                }
            });
        });
        this.execute(config, builds);
    };
    MateBundler.runFiles = function (config, file, builds) {
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
                    MateBundler.createTypeScriptDeclaration(file.input, outputDirectory, outputFileName, build);
                var process = MateBundler.bundle(file.input, outputExtention, build).pipe(gulpConcat('empty'));
                process = process.pipe(gulpRename(outputFileName)).pipe(gulp.dest(outputDirectory));
                switch (outputExtention) {
                    case 'css':
                        if (build.css.minify) {
                            process
                                .pipe(gulpCleanCSS())
                                .pipe(gulpRename({ suffix: '.min' }))
                                .pipe(gulp.dest(outputDirectory));
                        }
                        break;
                    case 'js':
                        if (build.js.minify) {
                            process
                                .pipe(gulpMinify({
                                ext: {
                                    src: '.js',
                                    min: '.min.js',
                                },
                            }))
                                .pipe(gulp.dest(outputDirectory));
                        }
                        break;
                }
            });
        });
    };
    MateBundler.createTypeScriptDeclaration = function (files, outputDirectory, outputFileName, build) {
        var typescriptDeclarations = [];
        files.forEach(function (file) {
            var fileExtention = file.split('.').pop().toLowerCase();
            if (fileExtention === 'ts' && !file.toLocaleLowerCase().endsWith('.d.ts'))
                typescriptDeclarations.push(file);
        });
        if (typescriptDeclarations.length > 0)
            MateBundler.compile(typescriptDeclarations, 'd.ts', 'ts', build)
                .pipe(gulpFilter(function (content, filepath) { return filepath.toLowerCase().endsWith('.d.ts'); }))
                .pipe(gulpConcat('empty'))
                .pipe(webClean({ isDeclaration: true }))
                .pipe(gulpRename({
                basename: outputFileName.replace('.js', ''),
                suffix: '.d',
                extname: '.ts',
            }))
                .pipe(gulp.dest(outputDirectory));
    };
    MateBundler.bundle = function (files, outputExtention, build) {
        var process = [];
        var groupFilesExtention = '';
        var groupedFiles = [];
        files.forEach(function (file) {
            var fileExtention = file.split('.').pop().toLowerCase();
            if (fileExtention !== groupFilesExtention) {
                if (groupedFiles.length > 0) {
                    process.push(MateBundler.compile(groupedFiles, groupFilesExtention, outputExtention, build));
                    groupedFiles = [];
                }
                groupFilesExtention = fileExtention;
            }
            groupedFiles.push(file);
        });
        if (groupedFiles.length > 0)
            process.push(MateBundler.compile(groupedFiles, groupFilesExtention, outputExtention, build));
        var stream = merge2();
        process.forEach(function (p) {
            stream.add(p);
        });
        return stream;
    };
    MateBundler.compile = function (files, inputExtention, outputExtention, build) {
        var process = gulp.src(files);
        if (inputExtention === outputExtention)
            return process.pipe(gulpConcat('empty'));
        switch (inputExtention) {
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
                var ts = null;
                if (build.ts)
                    ts = gulpTs.createProject(build.ts);
                process = process.pipe(ts ? ts() : gulpTs());
                if (outputExtention === 'js' && build.js.webClean)
                    process = process.pipe(webClean());
                if (build.js.sourceMap)
                    process = process.pipe(gulpSourcemaps.write());
                return process.pipe(gulpConcat('empty'));
            case 'd.ts':
                var tsd = null;
                if (build.ts)
                    tsd = gulpTs.createProject(build.ts, { declaration: true });
                return process.pipe(tsd ? tsd() : gulpTs({ declaration: true }));
        }
        return process;
    };
    MateBundler.allWatchers = [];
    return MateBundler;
}());
exports.MateBundler = MateBundler;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ1gsR0FBRyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUU3RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNsRTtRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUE1T00sdUJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBNk8vQyxrQkFBQztDQTlPRCxBQThPQyxJQUFBO0FBOU9ZLGtDQUFXIiwiZmlsZSI6ImJ1bmRsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuaW1wb3J0IHsgTWF0ZUNvbmZpZywgTWF0ZUNvbmZpZ0ZpbGUsIE1hdGVDb25maWdCdWlsZCB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuY29uc3QgZ3VscExlc3MgPSByZXF1aXJlKCdndWxwLWxlc3MnKTtcbmNvbnN0IGd1bHBTYXNzID0gcmVxdWlyZSgnZ3VscC1zYXNzJykocmVxdWlyZSgnc2FzcycpKTtcbmNvbnN0IGd1bHBSZW5hbWUgPSByZXF1aXJlKCdndWxwLXJlbmFtZScpO1xuY29uc3QgZ3VscENvbmNhdCA9IHJlcXVpcmUoJ2d1bHAtY29uY2F0Jyk7XG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmNvbnN0IGd1bHBTb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBndWxwTWluaWZ5ID0gcmVxdWlyZSgnZ3VscC1taW5pZnknKTtcbmNvbnN0IG1lcmdlMiA9IHJlcXVpcmUoJ21lcmdlMicpO1xuY29uc3QgZ3VscENsZWFuQ1NTID0gcmVxdWlyZSgnZ3VscC1jbGVhbi1jc3MnKTtcbmNvbnN0IGd1bHBGaWx0ZXIgPSByZXF1aXJlKCdndWxwLWZpbHRlci1lYWNoJyk7XG5jb25zdCB3ZWJDbGVhbiA9IHJlcXVpcmUoJy4vd2ViY2xlYW5qcycpO1xuXG5leHBvcnQgY2xhc3MgTWF0ZUJ1bmRsZXIge1xuXHRzdGF0aWMgYWxsV2F0Y2hlcnM6IGNob2tpZGFyLkZTV2F0Y2hlcltdID0gW107XG5cblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZywgYnVpbGRzPzogc3RyaW5nW10pOiB2b2lkIHtcblxuXHRcdGlmICghY29uZmlnLmZpbGVzKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Y29uc29sZS5sb2coJ2V4ZWN1dGVkIGF0ICcgKyBuZXcgRGF0ZSgpLnRvVGltZVN0cmluZygpKTtcblxuXHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKTogdm9pZCA9PiB7XG5cdFx0XHRNYXRlQnVuZGxlci5ydW5GaWxlcyhjb25maWcsIGZpbGUsIGJ1aWxkcyk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgd2F0Y2goY29uZmlnOiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSkge1xuXG5cdFx0aWYgKCFjb25maWcuZmlsZXMpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRpZiAoYnVpbGRzID09PSB1bmRlZmluZWQgfHwgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMubGVuZ3RoID09PSAwKSkgYnVpbGRzID0gWydkZXYnXTtcblxuXHRcdGNvbnN0IGNvbmZpZ1dhdGNoZXIgPSBjaG9raWRhci53YXRjaChNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlLCB7IHBlcnNpc3RlbnQ6IHRydWUgfSkub24oJ2NoYW5nZScsIChldmVudCwgcGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLmZvckVhY2goKHdhdGNoZXI6IGNob2tpZGFyLkZTV2F0Y2hlcikgPT4ge1xuXHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycyA9IFtdO1xuXG5cdFx0XHR0aGlzLndhdGNoKGNvbmZpZywgYnVpbGRzKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaChjb25maWdXYXRjaGVyKTtcblxuXHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyA9PT0gbnVsbCB8fCBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNvbnN0IGV4dGVuc2lvbnMgPSBbJ2xlc3MnLCAnc2NzcyddO1xuXG5cdFx0XHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcblxuXHRcdFx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xuXHRcdFx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBleHRlbnNpb24gb2YgZXh0ZW5zaW9ucykgaWYgKE1hdGVDb25maWdGaWxlLmhhc0V4dGVuc2lvbihmaWxlLmlucHV0LCBleHRlbnNpb24pKSB3YXRjaFBhdGhzLnB1c2goJy4vKiovKi4nICsgZXh0ZW5zaW9uKTtcblxuXHRcdFx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5ydW5GaWxlcyhjb25maWcsIGZpbGUsIFtidWlsZE5hbWVdKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZywgYnVpbGRzKTtcblx0fVxuXG5cdHN0YXRpYyBydW5GaWxlcyhjb25maWc6IE1hdGVDb25maWcsIGZpbGU6IE1hdGVDb25maWdGaWxlLCBidWlsZHM/OiBzdHJpbmdbXSkge1xuXHRcdGlmIChidWlsZHMgPT09IHVuZGVmaW5lZCB8fCAoYnVpbGRzICE9PSBudWxsICYmIGJ1aWxkcy5sZW5ndGggPT09IDApKSBidWlsZHMgPSBbJ2RldiddO1xuXG5cdFx0ZmlsZS5vdXRwdXQuZm9yRWFjaCgob3V0cHV0KSA9PiB7XG5cdFx0XHRjb25zdCBvdXRwdXRFeHRlbnRpb24gPSBvdXRwdXQuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBvdXRwdXQucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xuXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpOiB2b2lkID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpID09PSAtMSkgcmV0dXJuO1xuXG5cdFx0XHRcdGNvbnN0IGJ1aWxkID0gY29uZmlnLmdldEJ1aWxkKGJ1aWxkTmFtZSk7XG5cblx0XHRcdFx0bGV0IG91dHB1dERpcmVjdG9yeSA9IGJ1aWxkLm91dERpciA/IGJ1aWxkLm91dERpciA6IHBhdGguZGlybmFtZShvdXRwdXQpO1xuXG5cdFx0XHRcdGlmIChidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgY29uZmlnLmdldE91dERpclZlcnNpb24oKTtcblxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyTmFtZSkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJOYW1lKCk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5jc3Mub3V0RGlyU3VmZml4O1xuXG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5qcy5vdXREaXJTdWZmaXg7XG5cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLmRlY2xhcmF0aW9uID09PSB0cnVlKSBNYXRlQnVuZGxlci5jcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZS5pbnB1dCwgb3V0cHV0RGlyZWN0b3J5LCBvdXRwdXRGaWxlTmFtZSwgYnVpbGQpO1xuXG5cdFx0XHRcdGxldCBwcm9jZXNzID0gTWF0ZUJ1bmRsZXIuYnVuZGxlKGZpbGUuaW5wdXQsIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwUmVuYW1lKG91dHB1dEZpbGVOYW1lKSkucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBDbGVhbkNTUygpKVxuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBSZW5hbWUoeyBzdWZmaXg6ICcubWluJyB9KSlcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKFxuXHRcdFx0XHRcdFx0XHRcdFx0Z3VscE1pbmlmeSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGV4dDoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNyYzogJy5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWluOiAnLm1pbi5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgY3JlYXRlVHlwZVNjcmlwdERlY2xhcmF0aW9uKGZpbGVzOiBzdHJpbmdbXSwgb3V0cHV0RGlyZWN0b3J5OiBzdHJpbmcsIG91dHB1dEZpbGVOYW1lOiBzdHJpbmcsIGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcblx0XHRjb25zdCB0eXBlc2NyaXB0RGVjbGFyYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG5cdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRpZiAoZmlsZUV4dGVudGlvbiA9PT0gJ3RzJyAmJiAhZmlsZS50b0xvY2FsZUxvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSB0eXBlc2NyaXB0RGVjbGFyYXRpb25zLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAodHlwZXNjcmlwdERlY2xhcmF0aW9ucy5sZW5ndGggPiAwKVxuXHRcdFx0TWF0ZUJ1bmRsZXIuY29tcGlsZSh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLCAnZC50cycsICd0cycsIGJ1aWxkKVxuXHRcdFx0XHQucGlwZShndWxwRmlsdGVyKChjb250ZW50LCBmaWxlcGF0aDogc3RyaW5nKSA9PiBmaWxlcGF0aC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSlcblx0XHRcdFx0LnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSlcblx0XHRcdFx0LnBpcGUod2ViQ2xlYW4oeyBpc0RlY2xhcmF0aW9uOiB0cnVlIH0pKVxuXHRcdFx0XHQucGlwZShcblx0XHRcdFx0XHRndWxwUmVuYW1lKHtcblx0XHRcdFx0XHRcdGJhc2VuYW1lOiBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKCcuanMnLCAnJyksXG5cdFx0XHRcdFx0XHRzdWZmaXg6ICcuZCcsXG5cdFx0XHRcdFx0XHRleHRuYW1lOiAnLnRzJyxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpXG5cdFx0XHRcdC5waXBlKGd1bHAuZGVzdChvdXRwdXREaXJlY3RvcnkpKTtcblx0fVxuXG5cdHN0YXRpYyBidW5kbGUoZmlsZXM6IHN0cmluZ1tdLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0Y29uc3QgcHJvY2VzczogYW55W10gPSBbXTtcblxuXHRcdGxldCBncm91cEZpbGVzRXh0ZW50aW9uID0gJyc7XG5cdFx0bGV0IGdyb3VwZWRGaWxlczogc3RyaW5nW10gPSBbXTtcblxuXHRcdGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcblxuXHRcdFx0aWYgKGZpbGVFeHRlbnRpb24gIT09IGdyb3VwRmlsZXNFeHRlbnRpb24pIHtcblx0XHRcdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0cHJvY2Vzcy5wdXNoKE1hdGVCdW5kbGVyLmNvbXBpbGUoZ3JvdXBlZEZpbGVzLCBncm91cEZpbGVzRXh0ZW50aW9uLCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKSk7XG5cdFx0XHRcdFx0Z3JvdXBlZEZpbGVzID0gW107XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRncm91cEZpbGVzRXh0ZW50aW9uID0gZmlsZUV4dGVudGlvbjtcblx0XHRcdH1cblxuXHRcdFx0Z3JvdXBlZEZpbGVzLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoZ3JvdXBlZEZpbGVzLmxlbmd0aCA+IDApIHByb2Nlc3MucHVzaChNYXRlQnVuZGxlci5jb21waWxlKGdyb3VwZWRGaWxlcywgZ3JvdXBGaWxlc0V4dGVudGlvbiwgb3V0cHV0RXh0ZW50aW9uLCBidWlsZCkpO1xuXG5cdFx0Y29uc3Qgc3RyZWFtID0gbWVyZ2UyKCk7XG5cblx0XHRwcm9jZXNzLmZvckVhY2goKHApID0+IHtcblx0XHRcdHN0cmVhbS5hZGQocCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc3RyZWFtO1xuXHR9XG5cblx0c3RhdGljIGNvbXBpbGUoZmlsZXM6IHN0cmluZ1tdLCBpbnB1dEV4dGVudGlvbjogc3RyaW5nLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0bGV0IHByb2Nlc3MgPSBndWxwLnNyYyhmaWxlcyk7XG5cblx0XHRpZiAoaW5wdXRFeHRlbnRpb24gPT09IG91dHB1dEV4dGVudGlvbikgcmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdHN3aXRjaCAoaW5wdXRFeHRlbnRpb24pIHtcblx0XHRcdGNhc2UgJ2Nzcyc6XG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2xlc3MnOlxuXHRcdFx0XHRpZiAoYnVpbGQuY3NzLnNvdXJjZU1hcCkgcHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU291cmNlbWFwcy5pbml0KCkpO1xuXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscExlc3MoKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAnc2Nzcyc6XG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLmluaXQoKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU2FzcygpLm9uKCdlcnJvcicsIGd1bHBTYXNzLmxvZ0Vycm9yKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAndHMnOlxuXHRcdFx0XHRpZiAoYnVpbGQuanMuc291cmNlTWFwKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcblxuXHRcdFx0XHRsZXQgdHMgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0cyA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KGJ1aWxkLnRzKTtcblxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKHRzID8gdHMoKSA6IGd1bHBUcygpKTtcblxuXHRcdFx0XHRpZiAob3V0cHV0RXh0ZW50aW9uID09PSAnanMnICYmIGJ1aWxkLmpzLndlYkNsZWFuKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUod2ViQ2xlYW4oKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcblx0XHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xuXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2QudHMnOlxuXG5cdFx0XHRcdGxldCB0c2QgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0c2QgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cywgeyBkZWNsYXJhdGlvbjogdHJ1ZSB9KTtcblxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKHRzZCA/IHRzZCgpIDogZ3VscFRzKHsgZGVjbGFyYXRpb246IHRydWUgfSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBwcm9jZXNzO1xuXHR9XG59Il19
