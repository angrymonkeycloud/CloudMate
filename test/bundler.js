"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MateBundler = void 0;
var path = require('path');
var config_1 = require("./config");
var chokidar = require("chokidar");
var gulp = require('gulp');
var gulpLess = require('gulp-less');
var gulpSass = require('gulp-sass');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUU3RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNsRTtRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUE1T00sdUJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBNk8vQyxrQkFBQztDQTlPRCxBQThPQyxJQUFBO0FBOU9ZLGtDQUFXIiwiZmlsZSI6ImJ1bmRsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnRmlsZSwgTWF0ZUNvbmZpZ0J1aWxkIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xyXG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xyXG5jb25zdCBndWxwTGVzcyA9IHJlcXVpcmUoJ2d1bHAtbGVzcycpO1xyXG5jb25zdCBndWxwU2FzcyA9IHJlcXVpcmUoJ2d1bHAtc2FzcycpO1xyXG5jb25zdCBndWxwUmVuYW1lID0gcmVxdWlyZSgnZ3VscC1yZW5hbWUnKTtcclxuY29uc3QgZ3VscENvbmNhdCA9IHJlcXVpcmUoJ2d1bHAtY29uY2F0Jyk7XHJcbmNvbnN0IGd1bHBUcyA9IHJlcXVpcmUoJ2d1bHAtdHlwZXNjcmlwdCcpO1xyXG5jb25zdCBndWxwU291cmNlbWFwcyA9IHJlcXVpcmUoJ2d1bHAtc291cmNlbWFwcycpO1xyXG5jb25zdCBndWxwTWluaWZ5ID0gcmVxdWlyZSgnZ3VscC1taW5pZnknKTtcclxuY29uc3QgbWVyZ2UyID0gcmVxdWlyZSgnbWVyZ2UyJyk7XHJcbmNvbnN0IGd1bHBDbGVhbkNTUyA9IHJlcXVpcmUoJ2d1bHAtY2xlYW4tY3NzJyk7XHJcbmNvbnN0IGd1bHBGaWx0ZXIgPSByZXF1aXJlKCdndWxwLWZpbHRlci1lYWNoJyk7XHJcbmNvbnN0IHdlYkNsZWFuID0gcmVxdWlyZSgnLi93ZWJjbGVhbmpzJyk7XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUJ1bmRsZXIge1xyXG5cdHN0YXRpYyBhbGxXYXRjaGVyczogY2hva2lkYXIuRlNXYXRjaGVyW10gPSBbXTtcclxuXHJcblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZywgYnVpbGRzPzogc3RyaW5nW10pOiB2b2lkIHtcclxuXHJcblx0XHRpZiAoIWNvbmZpZy5maWxlcylcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKCdleGVjdXRlZCBhdCAnICsgbmV3IERhdGUoKS50b1RpbWVTdHJpbmcoKSk7XHJcblxyXG5cdFx0Y29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGUpOiB2b2lkID0+IHtcclxuXHRcdFx0TWF0ZUJ1bmRsZXIucnVuRmlsZXMoY29uZmlnLCBmaWxlLCBidWlsZHMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgd2F0Y2goY29uZmlnOiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSkge1xyXG5cclxuXHRcdGlmICghY29uZmlnLmZpbGVzKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0aWYgKGJ1aWxkcyA9PT0gdW5kZWZpbmVkIHx8IChidWlsZHMgIT09IG51bGwgJiYgYnVpbGRzLmxlbmd0aCA9PT0gMCkpIGJ1aWxkcyA9IFsnZGV2J107XHJcblxyXG5cdFx0Y29uc3QgY29uZmlnV2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKE1hdGVDb25maWcuYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGUsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KS5vbignY2hhbmdlJywgKGV2ZW50LCBwYXRoOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5mb3JFYWNoKCh3YXRjaGVyOiBjaG9raWRhci5GU1dhdGNoZXIpID0+IHtcclxuXHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycyA9IFtdO1xyXG5cclxuXHRcdFx0dGhpcy53YXRjaChjb25maWcsIGJ1aWxkcyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmFsbFdhdGNoZXJzLnB1c2goY29uZmlnV2F0Y2hlcik7XHJcblxyXG5cdFx0Y29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcclxuXHRcdFx0ZmlsZS5idWlsZHMuZm9yRWFjaCgoYnVpbGROYW1lKSA9PiB7XHJcblx0XHRcdFx0aWYgKGJ1aWxkcyA9PT0gbnVsbCB8fCBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZXh0ZW5zaW9ucyA9IFsnbGVzcycsICdzY3NzJ107XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRcdFx0XHRmaWxlLmlucHV0LmZvckVhY2goKHBhdGgpID0+IHtcclxuXHRcdFx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBleHRlbnNpb24gb2YgZXh0ZW5zaW9ucykgaWYgKE1hdGVDb25maWdGaWxlLmhhc0V4dGVuc2lvbihmaWxlLmlucHV0LCBleHRlbnNpb24pKSB3YXRjaFBhdGhzLnB1c2goJy4vKiovKi4nICsgZXh0ZW5zaW9uKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHdhdGNoUGF0aHMsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KS5vbignY2hhbmdlJywgKGV2ZW50LCBwYXRoOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5ydW5GaWxlcyhjb25maWcsIGZpbGUsIFtidWlsZE5hbWVdKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZXhlY3V0ZShjb25maWcsIGJ1aWxkcyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgcnVuRmlsZXMoY29uZmlnOiBNYXRlQ29uZmlnLCBmaWxlOiBNYXRlQ29uZmlnRmlsZSwgYnVpbGRzPzogc3RyaW5nW10pIHtcclxuXHRcdGlmIChidWlsZHMgPT09IHVuZGVmaW5lZCB8fCAoYnVpbGRzICE9PSBudWxsICYmIGJ1aWxkcy5sZW5ndGggPT09IDApKSBidWlsZHMgPSBbJ2RldiddO1xyXG5cclxuXHRcdGZpbGUub3V0cHV0LmZvckVhY2goKG91dHB1dCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvdXRwdXRFeHRlbnRpb24gPSBvdXRwdXQuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IG91dHB1dC5yZXBsYWNlKC9eLipbXFxcXFxcL10vLCAnJyk7XHJcblxyXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpOiB2b2lkID0+IHtcclxuXHRcdFx0XHRpZiAoYnVpbGRzICE9PSBudWxsICYmIGJ1aWxkcy5pbmRleE9mKGJ1aWxkTmFtZSkgPT09IC0xKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdGNvbnN0IGJ1aWxkID0gY29uZmlnLmdldEJ1aWxkKGJ1aWxkTmFtZSk7XHJcblxyXG5cdFx0XHRcdGxldCBvdXRwdXREaXJlY3RvcnkgPSBidWlsZC5vdXREaXIgPyBidWlsZC5vdXREaXIgOiBwYXRoLmRpcm5hbWUob3V0cHV0KTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLm91dERpclZlcnNpb25pbmcpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBjb25maWcuZ2V0T3V0RGlyVmVyc2lvbigpO1xyXG5cclxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyTmFtZSkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJOYW1lKCk7XHJcblxyXG5cdFx0XHRcdHN3aXRjaCAob3V0cHV0RXh0ZW50aW9uKSB7XHJcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxyXG5cdFx0XHRcdFx0XHRpZiAoYnVpbGQuY3NzLm91dERpclN1ZmZpeCkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGJ1aWxkLmNzcy5vdXREaXJTdWZmaXg7XHJcblxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRjYXNlICdqcyc6XHJcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5qcy5vdXREaXJTdWZmaXg7XHJcblxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5qcy5kZWNsYXJhdGlvbiA9PT0gdHJ1ZSkgTWF0ZUJ1bmRsZXIuY3JlYXRlVHlwZVNjcmlwdERlY2xhcmF0aW9uKGZpbGUuaW5wdXQsIG91dHB1dERpcmVjdG9yeSwgb3V0cHV0RmlsZU5hbWUsIGJ1aWxkKTtcclxuXHJcblx0XHRcdFx0bGV0IHByb2Nlc3MgPSBNYXRlQnVuZGxlci5idW5kbGUoZmlsZS5pbnB1dCwgb3V0cHV0RXh0ZW50aW9uLCBidWlsZCkucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcclxuXHJcblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwUmVuYW1lKG91dHB1dEZpbGVOYW1lKSkucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblxyXG5cdFx0XHRcdHN3aXRjaCAob3V0cHV0RXh0ZW50aW9uKSB7XHJcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxyXG5cdFx0XHRcdFx0XHRpZiAoYnVpbGQuY3NzLm1pbmlmeSkge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NcclxuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBDbGVhbkNTUygpKVxyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoZ3VscFJlbmFtZSh7IHN1ZmZpeDogJy5taW4nIH0pKVxyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcmVjdG9yeSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcclxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmpzLm1pbmlmeSkge1xyXG5cdFx0XHRcdFx0XHRcdHByb2Nlc3NcclxuXHRcdFx0XHRcdFx0XHRcdC5waXBlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRndWxwTWluaWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRleHQ6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNyYzogJy5qcycsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRtaW46ICcubWluLmpzJyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcmVjdG9yeSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBjcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZXM6IHN0cmluZ1tdLCBvdXRwdXREaXJlY3Rvcnk6IHN0cmluZywgb3V0cHV0RmlsZU5hbWU6IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgdHlwZXNjcmlwdERlY2xhcmF0aW9uczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdGlmIChmaWxlRXh0ZW50aW9uID09PSAndHMnICYmICFmaWxlLnRvTG9jYWxlTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5kLnRzJykpIHR5cGVzY3JpcHREZWNsYXJhdGlvbnMucHVzaChmaWxlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLmxlbmd0aCA+IDApXHJcblx0XHRcdE1hdGVCdW5kbGVyLmNvbXBpbGUodHlwZXNjcmlwdERlY2xhcmF0aW9ucywgJ2QudHMnLCAndHMnLCBidWlsZClcclxuXHRcdFx0XHQucGlwZShndWxwRmlsdGVyKChjb250ZW50LCBmaWxlcGF0aDogc3RyaW5nKSA9PiBmaWxlcGF0aC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSlcclxuXHRcdFx0XHQucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKVxyXG5cdFx0XHRcdC5waXBlKHdlYkNsZWFuKHsgaXNEZWNsYXJhdGlvbjogdHJ1ZSB9KSlcclxuXHRcdFx0XHQucGlwZShcclxuXHRcdFx0XHRcdGd1bHBSZW5hbWUoe1xyXG5cdFx0XHRcdFx0XHRiYXNlbmFtZTogb3V0cHV0RmlsZU5hbWUucmVwbGFjZSgnLmpzJywgJycpLFxyXG5cdFx0XHRcdFx0XHRzdWZmaXg6ICcuZCcsXHJcblx0XHRcdFx0XHRcdGV4dG5hbWU6ICcudHMnLFxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0LnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcmVjdG9yeSkpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGJ1bmRsZShmaWxlczogc3RyaW5nW10sIG91dHB1dEV4dGVudGlvbjogc3RyaW5nLCBidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogYW55IHtcclxuXHRcdGNvbnN0IHByb2Nlc3M6IGFueVtdID0gW107XHJcblxyXG5cdFx0bGV0IGdyb3VwRmlsZXNFeHRlbnRpb24gPSAnJztcclxuXHRcdGxldCBncm91cGVkRmlsZXM6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlRXh0ZW50aW9uID0gZmlsZS5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHRpZiAoZmlsZUV4dGVudGlvbiAhPT0gZ3JvdXBGaWxlc0V4dGVudGlvbikge1xyXG5cdFx0XHRcdGlmIChncm91cGVkRmlsZXMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdFx0cHJvY2Vzcy5wdXNoKE1hdGVCdW5kbGVyLmNvbXBpbGUoZ3JvdXBlZEZpbGVzLCBncm91cEZpbGVzRXh0ZW50aW9uLCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKSk7XHJcblx0XHRcdFx0XHRncm91cGVkRmlsZXMgPSBbXTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGdyb3VwRmlsZXNFeHRlbnRpb24gPSBmaWxlRXh0ZW50aW9uO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRncm91cGVkRmlsZXMucHVzaChmaWxlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChncm91cGVkRmlsZXMubGVuZ3RoID4gMCkgcHJvY2Vzcy5wdXNoKE1hdGVCdW5kbGVyLmNvbXBpbGUoZ3JvdXBlZEZpbGVzLCBncm91cEZpbGVzRXh0ZW50aW9uLCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKSk7XHJcblxyXG5cdFx0Y29uc3Qgc3RyZWFtID0gbWVyZ2UyKCk7XHJcblxyXG5cdFx0cHJvY2Vzcy5mb3JFYWNoKChwKSA9PiB7XHJcblx0XHRcdHN0cmVhbS5hZGQocCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gc3RyZWFtO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGNvbXBpbGUoZmlsZXM6IHN0cmluZ1tdLCBpbnB1dEV4dGVudGlvbjogc3RyaW5nLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XHJcblx0XHRsZXQgcHJvY2VzcyA9IGd1bHAuc3JjKGZpbGVzKTtcclxuXHJcblx0XHRpZiAoaW5wdXRFeHRlbnRpb24gPT09IG91dHB1dEV4dGVudGlvbikgcmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcclxuXHJcblx0XHRzd2l0Y2ggKGlucHV0RXh0ZW50aW9uKSB7XHJcblx0XHRcdGNhc2UgJ2Nzcyc6XHJcblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcclxuXHJcblx0XHRcdGNhc2UgJ2xlc3MnOlxyXG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLmluaXQoKSk7XHJcblxyXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscExlc3MoKSk7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0Y2FzZSAnc2Nzcyc6XHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcclxuXHJcblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU2FzcygpLm9uKCdlcnJvcicsIGd1bHBTYXNzLmxvZ0Vycm9yKSk7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0Y2FzZSAndHMnOlxyXG5cdFx0XHRcdGlmIChidWlsZC5qcy5zb3VyY2VNYXApXHJcblx0XHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLmluaXQoKSk7XHJcblxyXG5cdFx0XHRcdGxldCB0cyA9IG51bGw7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC50cylcclxuXHRcdFx0XHRcdHRzID0gZ3VscFRzLmNyZWF0ZVByb2plY3QoYnVpbGQudHMpO1xyXG5cclxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKHRzID8gdHMoKSA6IGd1bHBUcygpKTtcclxuXHJcblx0XHRcdFx0aWYgKG91dHB1dEV4dGVudGlvbiA9PT0gJ2pzJyAmJiBidWlsZC5qcy53ZWJDbGVhbilcclxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUod2ViQ2xlYW4oKSk7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5qcy5zb3VyY2VNYXApXHJcblx0XHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0Y2FzZSAnZC50cyc6XHJcblxyXG5cdFx0XHRcdGxldCB0c2QgPSBudWxsO1xyXG5cclxuXHRcdFx0XHRpZiAoYnVpbGQudHMpXHJcblx0XHRcdFx0XHR0c2QgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cywgeyBkZWNsYXJhdGlvbjogdHJ1ZSB9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZSh0c2QgPyB0c2QoKSA6IGd1bHBUcyh7IGRlY2xhcmF0aW9uOiB0cnVlIH0pKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcHJvY2VzcztcclxuXHR9XHJcbn1cclxuIl19
