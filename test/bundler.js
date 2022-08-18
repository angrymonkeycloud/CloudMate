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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ1gsR0FBRyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUU3RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNsRTtRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUE1T00sdUJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBNk8vQyxrQkFBQztDQTlPRCxBQThPQyxJQUFBO0FBOU9ZLGtDQUFXIiwiZmlsZSI6ImJ1bmRsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnRmlsZSwgTWF0ZUNvbmZpZ0J1aWxkIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xyXG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xyXG5jb25zdCBndWxwTGVzcyA9IHJlcXVpcmUoJ2d1bHAtbGVzcycpO1xyXG5jb25zdCBndWxwU2FzcyA9IHJlcXVpcmUoJ2d1bHAtc2FzcycpKHJlcXVpcmUoJ3Nhc3MnKSk7XHJcbmNvbnN0IGd1bHBSZW5hbWUgPSByZXF1aXJlKCdndWxwLXJlbmFtZScpO1xyXG5jb25zdCBndWxwQ29uY2F0ID0gcmVxdWlyZSgnZ3VscC1jb25jYXQnKTtcclxuY29uc3QgZ3VscFRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XHJcbmNvbnN0IGd1bHBTb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XHJcbmNvbnN0IGd1bHBNaW5pZnkgPSByZXF1aXJlKCdndWxwLW1pbmlmeScpO1xyXG5jb25zdCBtZXJnZTIgPSByZXF1aXJlKCdtZXJnZTInKTtcclxuY29uc3QgZ3VscENsZWFuQ1NTID0gcmVxdWlyZSgnZ3VscC1jbGVhbi1jc3MnKTtcclxuY29uc3QgZ3VscEZpbHRlciA9IHJlcXVpcmUoJ2d1bHAtZmlsdGVyLWVhY2gnKTtcclxuY29uc3Qgd2ViQ2xlYW4gPSByZXF1aXJlKCcuL3dlYmNsZWFuanMnKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQnVuZGxlciB7XHJcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xyXG5cclxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSk6IHZvaWQge1xyXG5cclxuXHRcdGlmICghY29uZmlnLmZpbGVzKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uc29sZS5sb2coJ2V4ZWN1dGVkIGF0ICcgKyBuZXcgRGF0ZSgpLnRvVGltZVN0cmluZygpKTtcclxuXHJcblx0XHRjb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRNYXRlQnVuZGxlci5ydW5GaWxlcyhjb25maWcsIGZpbGUsIGJ1aWxkcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcsIGJ1aWxkcz86IHN0cmluZ1tdKSB7XHJcblxyXG5cdFx0aWYgKCFjb25maWcuZmlsZXMpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRpZiAoYnVpbGRzID09PSB1bmRlZmluZWQgfHwgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMubGVuZ3RoID09PSAwKSkgYnVpbGRzID0gWydkZXYnXTtcclxuXHJcblx0XHRjb25zdCBjb25maWdXYXRjaGVyID0gY2hva2lkYXIud2F0Y2goTWF0ZUNvbmZpZy5hdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZSwgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLmZvckVhY2goKHdhdGNoZXI6IGNob2tpZGFyLkZTV2F0Y2hlcikgPT4ge1xyXG5cdFx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzID0gW107XHJcblxyXG5cdFx0XHR0aGlzLndhdGNoKGNvbmZpZywgYnVpbGRzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaChjb25maWdXYXRjaGVyKTtcclxuXHJcblx0XHRjb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xyXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpID0+IHtcclxuXHRcdFx0XHRpZiAoYnVpbGRzID09PSBudWxsIHx8IGJ1aWxkcy5pbmRleE9mKGJ1aWxkTmFtZSkgIT09IC0xKSB7XHJcblx0XHRcdFx0XHRjb25zdCBleHRlbnNpb25zID0gWydsZXNzJywgJ3Njc3MnXTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCB3YXRjaFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR3YXRjaFBhdGhzLnB1c2gocGF0aCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGV4dGVuc2lvbiBvZiBleHRlbnNpb25zKSBpZiAoTWF0ZUNvbmZpZ0ZpbGUuaGFzRXh0ZW5zaW9uKGZpbGUuaW5wdXQsIGV4dGVuc2lvbikpIHdhdGNoUGF0aHMucHVzaCgnLi8qKi8qLicgKyBleHRlbnNpb24pO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bkZpbGVzKGNvbmZpZywgZmlsZSwgW2J1aWxkTmFtZV0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZywgYnVpbGRzKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBydW5GaWxlcyhjb25maWc6IE1hdGVDb25maWcsIGZpbGU6IE1hdGVDb25maWdGaWxlLCBidWlsZHM/OiBzdHJpbmdbXSkge1xyXG5cdFx0aWYgKGJ1aWxkcyA9PT0gdW5kZWZpbmVkIHx8IChidWlsZHMgIT09IG51bGwgJiYgYnVpbGRzLmxlbmd0aCA9PT0gMCkpIGJ1aWxkcyA9IFsnZGV2J107XHJcblxyXG5cdFx0ZmlsZS5vdXRwdXQuZm9yRWFjaCgob3V0cHV0KSA9PiB7XHJcblx0XHRcdGNvbnN0IG91dHB1dEV4dGVudGlvbiA9IG91dHB1dC5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gb3V0cHV0LnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHJcblx0XHRcdGZpbGUuYnVpbGRzLmZvckVhY2goKGJ1aWxkTmFtZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRcdGlmIChidWlsZHMgIT09IG51bGwgJiYgYnVpbGRzLmluZGV4T2YoYnVpbGROYW1lKSA9PT0gLTEpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Y29uc3QgYnVpbGQgPSBjb25maWcuZ2V0QnVpbGQoYnVpbGROYW1lKTtcclxuXHJcblx0XHRcdFx0bGV0IG91dHB1dERpcmVjdG9yeSA9IGJ1aWxkLm91dERpciA/IGJ1aWxkLm91dERpciA6IHBhdGguZGlybmFtZShvdXRwdXQpO1xyXG5cclxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyVmVyc2lvbmluZykgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJWZXJzaW9uKCk7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5vdXREaXJOYW1lKSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgY29uZmlnLmdldE91dERpck5hbWUoKTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0XHRcdGNhc2UgJ2Nzcyc6XHJcblx0XHRcdFx0XHRcdGlmIChidWlsZC5jc3Mub3V0RGlyU3VmZml4KSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgYnVpbGQuY3NzLm91dERpclN1ZmZpeDtcclxuXHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcclxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmpzLm91dERpclN1ZmZpeCkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGJ1aWxkLmpzLm91dERpclN1ZmZpeDtcclxuXHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLmRlY2xhcmF0aW9uID09PSB0cnVlKSBNYXRlQnVuZGxlci5jcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZS5pbnB1dCwgb3V0cHV0RGlyZWN0b3J5LCBvdXRwdXRGaWxlTmFtZSwgYnVpbGQpO1xyXG5cclxuXHRcdFx0XHRsZXQgcHJvY2VzcyA9IE1hdGVCdW5kbGVyLmJ1bmRsZShmaWxlLmlucHV0LCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKS5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBSZW5hbWUob3V0cHV0RmlsZU5hbWUpKS5waXBlKGd1bHAuZGVzdChvdXRwdXREaXJlY3RvcnkpKTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0XHRcdGNhc2UgJ2Nzcyc6XHJcblx0XHRcdFx0XHRcdGlmIChidWlsZC5jc3MubWluaWZ5KSB7XHJcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoZ3VscENsZWFuQ1NTKCkpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwUmVuYW1lKHsgc3VmZml4OiAnLm1pbicgfSkpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Y2FzZSAnanMnOlxyXG5cdFx0XHRcdFx0XHRpZiAoYnVpbGQuanMubWluaWZ5KSB7XHJcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGd1bHBNaW5pZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGV4dDoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3JjOiAnLmpzJyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1pbjogJy5taW4uanMnLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGNyZWF0ZVR5cGVTY3JpcHREZWNsYXJhdGlvbihmaWxlczogc3RyaW5nW10sIG91dHB1dERpcmVjdG9yeTogc3RyaW5nLCBvdXRwdXRGaWxlTmFtZTogc3RyaW5nLCBidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogdm9pZCB7XHJcblx0XHRjb25zdCB0eXBlc2NyaXB0RGVjbGFyYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdFx0aWYgKGZpbGVFeHRlbnRpb24gPT09ICd0cycgJiYgIWZpbGUudG9Mb2NhbGVMb3dlckNhc2UoKS5lbmRzV2l0aCgnLmQudHMnKSkgdHlwZXNjcmlwdERlY2xhcmF0aW9ucy5wdXNoKGZpbGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKHR5cGVzY3JpcHREZWNsYXJhdGlvbnMubGVuZ3RoID4gMClcclxuXHRcdFx0TWF0ZUJ1bmRsZXIuY29tcGlsZSh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLCAnZC50cycsICd0cycsIGJ1aWxkKVxyXG5cdFx0XHRcdC5waXBlKGd1bHBGaWx0ZXIoKGNvbnRlbnQsIGZpbGVwYXRoOiBzdHJpbmcpID0+IGZpbGVwYXRoLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5kLnRzJykpKVxyXG5cdFx0XHRcdC5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpXHJcblx0XHRcdFx0LnBpcGUod2ViQ2xlYW4oeyBpc0RlY2xhcmF0aW9uOiB0cnVlIH0pKVxyXG5cdFx0XHRcdC5waXBlKFxyXG5cdFx0XHRcdFx0Z3VscFJlbmFtZSh7XHJcblx0XHRcdFx0XHRcdGJhc2VuYW1lOiBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKCcuanMnLCAnJyksXHJcblx0XHRcdFx0XHRcdHN1ZmZpeDogJy5kJyxcclxuXHRcdFx0XHRcdFx0ZXh0bmFtZTogJy50cycsXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYnVuZGxlKGZpbGVzOiBzdHJpbmdbXSwgb3V0cHV0RXh0ZW50aW9uOiBzdHJpbmcsIGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiBhbnkge1xyXG5cdFx0Y29uc3QgcHJvY2VzczogYW55W10gPSBbXTtcclxuXHJcblx0XHRsZXQgZ3JvdXBGaWxlc0V4dGVudGlvbiA9ICcnO1xyXG5cdFx0bGV0IGdyb3VwZWRGaWxlczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdGlmIChmaWxlRXh0ZW50aW9uICE9PSBncm91cEZpbGVzRXh0ZW50aW9uKSB7XHJcblx0XHRcdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRwcm9jZXNzLnB1c2goTWF0ZUJ1bmRsZXIuY29tcGlsZShncm91cGVkRmlsZXMsIGdyb3VwRmlsZXNFeHRlbnRpb24sIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpKTtcclxuXHRcdFx0XHRcdGdyb3VwZWRGaWxlcyA9IFtdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Z3JvdXBGaWxlc0V4dGVudGlvbiA9IGZpbGVFeHRlbnRpb247XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGdyb3VwZWRGaWxlcy5wdXNoKGZpbGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSBwcm9jZXNzLnB1c2goTWF0ZUJ1bmRsZXIuY29tcGlsZShncm91cGVkRmlsZXMsIGdyb3VwRmlsZXNFeHRlbnRpb24sIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpKTtcclxuXHJcblx0XHRjb25zdCBzdHJlYW0gPSBtZXJnZTIoKTtcclxuXHJcblx0XHRwcm9jZXNzLmZvckVhY2goKHApID0+IHtcclxuXHRcdFx0c3RyZWFtLmFkZChwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBzdHJlYW07XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY29tcGlsZShmaWxlczogc3RyaW5nW10sIGlucHV0RXh0ZW50aW9uOiBzdHJpbmcsIG91dHB1dEV4dGVudGlvbjogc3RyaW5nLCBidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogYW55IHtcclxuXHRcdGxldCBwcm9jZXNzID0gZ3VscC5zcmMoZmlsZXMpO1xyXG5cclxuXHRcdGlmIChpbnB1dEV4dGVudGlvbiA9PT0gb3V0cHV0RXh0ZW50aW9uKSByZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdHN3aXRjaCAoaW5wdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0Y2FzZSAnY3NzJzpcclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0Y2FzZSAnbGVzcyc6XHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcclxuXHJcblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwTGVzcygpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICdzY3NzJzpcclxuXHRcdFx0XHRpZiAoYnVpbGQuY3NzLnNvdXJjZU1hcCkgcHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU291cmNlbWFwcy5pbml0KCkpO1xyXG5cclxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTYXNzKCkub24oJ2Vycm9yJywgZ3VscFNhc3MubG9nRXJyb3IpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICd0cyc6XHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcclxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcclxuXHJcblx0XHRcdFx0bGV0IHRzID0gbnVsbDtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLnRzKVxyXG5cdFx0XHRcdFx0dHMgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cyk7XHJcblxyXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUodHMgPyB0cygpIDogZ3VscFRzKCkpO1xyXG5cclxuXHRcdFx0XHRpZiAob3V0cHV0RXh0ZW50aW9uID09PSAnanMnICYmIGJ1aWxkLmpzLndlYkNsZWFuKVxyXG5cdFx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZSh3ZWJDbGVhbigpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcclxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICdkLnRzJzpcclxuXHJcblx0XHRcdFx0bGV0IHRzZCA9IG51bGw7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC50cylcclxuXHRcdFx0XHRcdHRzZCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KGJ1aWxkLnRzLCB7IGRlY2xhcmF0aW9uOiB0cnVlIH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKHRzZCA/IHRzZCgpIDogZ3VscFRzKHsgZGVjbGFyYXRpb246IHRydWUgfSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBwcm9jZXNzO1xyXG5cdH1cclxufVxyXG4iXX0=
