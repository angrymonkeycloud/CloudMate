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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1bmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLG1DQUF1RTtBQUN2RSxtQ0FBc0M7QUFDdEMsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN0QyxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDdkQsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxQyxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNsRCxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDMUMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLElBQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQy9DLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUV6QztJQUFBO0lBOE9BLENBQUM7SUEzT08sbUJBQU8sR0FBZCxVQUFlLE1BQW1CLEVBQUUsTUFBaUI7UUFFcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ2hCLE9BQU87UUFFUixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxJ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RWhELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUUxQyxLQUFLLE1BQU07Z0JBRVYsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDO2dCQUVmLElBQUksS0FBSyxDQUFDLEVBQUU7b0JBQ1gsR0FBRyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUU3RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQTVPTSx1QkFBVyxHQUF5QixFQUFFLENBQUM7SUE2Ty9DLGtCQUFDO0NBQUEsQUE5T0QsSUE4T0M7QUE5T1ksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnRmlsZSwgTWF0ZUNvbmZpZ0J1aWxkIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xyXG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xyXG5jb25zdCBndWxwTGVzcyA9IHJlcXVpcmUoJ2d1bHAtbGVzcycpO1xyXG5jb25zdCBndWxwU2FzcyA9IHJlcXVpcmUoJ2d1bHAtc2FzcycpKHJlcXVpcmUoJ3Nhc3MnKSk7XHJcbmNvbnN0IGd1bHBSZW5hbWUgPSByZXF1aXJlKCdndWxwLXJlbmFtZScpO1xyXG5jb25zdCBndWxwQ29uY2F0ID0gcmVxdWlyZSgnZ3VscC1jb25jYXQnKTtcclxuY29uc3QgZ3VscFRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XHJcbmNvbnN0IGd1bHBTb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XHJcbmNvbnN0IGd1bHBNaW5pZnkgPSByZXF1aXJlKCdndWxwLW1pbmlmeScpO1xyXG5jb25zdCBtZXJnZTIgPSByZXF1aXJlKCdtZXJnZTInKTtcclxuY29uc3QgZ3VscENsZWFuQ1NTID0gcmVxdWlyZSgnZ3VscC1jbGVhbi1jc3MnKTtcclxuY29uc3QgZ3VscEZpbHRlciA9IHJlcXVpcmUoJ2d1bHAtZmlsdGVyLWVhY2gnKTtcclxuY29uc3Qgd2ViQ2xlYW4gPSByZXF1aXJlKCcuL3dlYmNsZWFuanMnKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQnVuZGxlciB7XHJcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xyXG5cclxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSk6IHZvaWQge1xyXG5cclxuXHRcdGlmICghY29uZmlnLmZpbGVzKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uc29sZS5sb2coJ2V4ZWN1dGVkIGF0ICcgKyBuZXcgRGF0ZSgpLnRvVGltZVN0cmluZygpKTtcclxuXHJcblx0XHRjb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRNYXRlQnVuZGxlci5ydW5GaWxlcyhjb25maWcsIGZpbGUsIGJ1aWxkcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcsIGJ1aWxkcz86IHN0cmluZ1tdKSB7XHJcblxyXG5cdFx0aWYgKCFjb25maWcuZmlsZXMpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRpZiAoYnVpbGRzID09PSB1bmRlZmluZWQgfHwgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMubGVuZ3RoID09PSAwKSkgYnVpbGRzID0gWydkZXYnXTtcclxuXHJcblx0XHRjb25zdCBjb25maWdXYXRjaGVyID0gY2hva2lkYXIud2F0Y2goTWF0ZUNvbmZpZy5hdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZSwgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLmZvckVhY2goKHdhdGNoZXI6IGNob2tpZGFyLkZTV2F0Y2hlcikgPT4ge1xyXG5cdFx0XHRcdHdhdGNoZXIuY2xvc2UoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzID0gW107XHJcblxyXG5cdFx0XHR0aGlzLndhdGNoKGNvbmZpZywgYnVpbGRzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaChjb25maWdXYXRjaGVyKTtcclxuXHJcblx0XHRjb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xyXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpID0+IHtcclxuXHRcdFx0XHRpZiAoYnVpbGRzID09PSBudWxsIHx8IGJ1aWxkcy5pbmRleE9mKGJ1aWxkTmFtZSkgIT09IC0xKSB7XHJcblx0XHRcdFx0XHRjb25zdCBleHRlbnNpb25zID0gWydsZXNzJywgJ3Njc3MnXTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCB3YXRjaFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR3YXRjaFBhdGhzLnB1c2gocGF0aCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGV4dGVuc2lvbiBvZiBleHRlbnNpb25zKSBpZiAoTWF0ZUNvbmZpZ0ZpbGUuaGFzRXh0ZW5zaW9uKGZpbGUuaW5wdXQsIGV4dGVuc2lvbikpIHdhdGNoUGF0aHMucHVzaCgnLi8qKi8qLicgKyBleHRlbnNpb24pO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnJ1bkZpbGVzKGNvbmZpZywgZmlsZSwgW2J1aWxkTmFtZV0pO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZywgYnVpbGRzKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBydW5GaWxlcyhjb25maWc6IE1hdGVDb25maWcsIGZpbGU6IE1hdGVDb25maWdGaWxlLCBidWlsZHM/OiBzdHJpbmdbXSkge1xyXG5cdFx0aWYgKGJ1aWxkcyA9PT0gdW5kZWZpbmVkIHx8IChidWlsZHMgIT09IG51bGwgJiYgYnVpbGRzLmxlbmd0aCA9PT0gMCkpIGJ1aWxkcyA9IFsnZGV2J107XHJcblxyXG5cdFx0ZmlsZS5vdXRwdXQuZm9yRWFjaCgob3V0cHV0KSA9PiB7XHJcblx0XHRcdGNvbnN0IG91dHB1dEV4dGVudGlvbiA9IG91dHB1dC5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gb3V0cHV0LnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHJcblx0XHRcdGZpbGUuYnVpbGRzLmZvckVhY2goKGJ1aWxkTmFtZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRcdGlmIChidWlsZHMgIT09IG51bGwgJiYgYnVpbGRzLmluZGV4T2YoYnVpbGROYW1lKSA9PT0gLTEpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Y29uc3QgYnVpbGQgPSBjb25maWcuZ2V0QnVpbGQoYnVpbGROYW1lKTtcclxuXHJcblx0XHRcdFx0bGV0IG91dHB1dERpcmVjdG9yeSA9IGJ1aWxkLm91dERpciA/IGJ1aWxkLm91dERpciA6IHBhdGguZGlybmFtZShvdXRwdXQpO1xyXG5cclxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyVmVyc2lvbmluZykgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJWZXJzaW9uKCk7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC5vdXREaXJOYW1lKSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgY29uZmlnLmdldE91dERpck5hbWUoKTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0XHRcdGNhc2UgJ2Nzcyc6XHJcblx0XHRcdFx0XHRcdGlmIChidWlsZC5jc3Mub3V0RGlyU3VmZml4KSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgYnVpbGQuY3NzLm91dERpclN1ZmZpeDtcclxuXHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcclxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmpzLm91dERpclN1ZmZpeCkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGJ1aWxkLmpzLm91dERpclN1ZmZpeDtcclxuXHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLmRlY2xhcmF0aW9uID09PSB0cnVlKSBNYXRlQnVuZGxlci5jcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZS5pbnB1dCwgb3V0cHV0RGlyZWN0b3J5LCBvdXRwdXRGaWxlTmFtZSwgYnVpbGQpO1xyXG5cclxuXHRcdFx0XHRsZXQgcHJvY2VzcyA9IE1hdGVCdW5kbGVyLmJ1bmRsZShmaWxlLmlucHV0LCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKS5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBSZW5hbWUob3V0cHV0RmlsZU5hbWUpKS5waXBlKGd1bHAuZGVzdChvdXRwdXREaXJlY3RvcnkpKTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0XHRcdGNhc2UgJ2Nzcyc6XHJcblx0XHRcdFx0XHRcdGlmIChidWlsZC5jc3MubWluaWZ5KSB7XHJcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoZ3VscENsZWFuQ1NTKCkpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwUmVuYW1lKHsgc3VmZml4OiAnLm1pbicgfSkpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Y2FzZSAnanMnOlxyXG5cdFx0XHRcdFx0XHRpZiAoYnVpbGQuanMubWluaWZ5KSB7XHJcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xyXG5cdFx0XHRcdFx0XHRcdFx0LnBpcGUoXHJcblx0XHRcdFx0XHRcdFx0XHRcdGd1bHBNaW5pZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGV4dDoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3JjOiAnLmpzJyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1pbjogJy5taW4uanMnLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGNyZWF0ZVR5cGVTY3JpcHREZWNsYXJhdGlvbihmaWxlczogc3RyaW5nW10sIG91dHB1dERpcmVjdG9yeTogc3RyaW5nLCBvdXRwdXRGaWxlTmFtZTogc3RyaW5nLCBidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogdm9pZCB7XHJcblx0XHRjb25zdCB0eXBlc2NyaXB0RGVjbGFyYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdFx0aWYgKGZpbGVFeHRlbnRpb24gPT09ICd0cycgJiYgIWZpbGUudG9Mb2NhbGVMb3dlckNhc2UoKS5lbmRzV2l0aCgnLmQudHMnKSkgdHlwZXNjcmlwdERlY2xhcmF0aW9ucy5wdXNoKGZpbGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKHR5cGVzY3JpcHREZWNsYXJhdGlvbnMubGVuZ3RoID4gMClcclxuXHRcdFx0TWF0ZUJ1bmRsZXIuY29tcGlsZSh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLCAnZC50cycsICd0cycsIGJ1aWxkKVxyXG5cdFx0XHRcdC5waXBlKGd1bHBGaWx0ZXIoKGNvbnRlbnQsIGZpbGVwYXRoOiBzdHJpbmcpID0+IGZpbGVwYXRoLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5kLnRzJykpKVxyXG5cdFx0XHRcdC5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpXHJcblx0XHRcdFx0LnBpcGUod2ViQ2xlYW4oeyBpc0RlY2xhcmF0aW9uOiB0cnVlIH0pKVxyXG5cdFx0XHRcdC5waXBlKFxyXG5cdFx0XHRcdFx0Z3VscFJlbmFtZSh7XHJcblx0XHRcdFx0XHRcdGJhc2VuYW1lOiBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKCcuanMnLCAnJyksXHJcblx0XHRcdFx0XHRcdHN1ZmZpeDogJy5kJyxcclxuXHRcdFx0XHRcdFx0ZXh0bmFtZTogJy50cycsXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYnVuZGxlKGZpbGVzOiBzdHJpbmdbXSwgb3V0cHV0RXh0ZW50aW9uOiBzdHJpbmcsIGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiBhbnkge1xyXG5cdFx0Y29uc3QgcHJvY2VzczogYW55W10gPSBbXTtcclxuXHJcblx0XHRsZXQgZ3JvdXBGaWxlc0V4dGVudGlvbiA9ICcnO1xyXG5cdFx0bGV0IGdyb3VwZWRGaWxlczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdGlmIChmaWxlRXh0ZW50aW9uICE9PSBncm91cEZpbGVzRXh0ZW50aW9uKSB7XHJcblx0XHRcdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHRwcm9jZXNzLnB1c2goTWF0ZUJ1bmRsZXIuY29tcGlsZShncm91cGVkRmlsZXMsIGdyb3VwRmlsZXNFeHRlbnRpb24sIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpKTtcclxuXHRcdFx0XHRcdGdyb3VwZWRGaWxlcyA9IFtdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Z3JvdXBGaWxlc0V4dGVudGlvbiA9IGZpbGVFeHRlbnRpb247XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGdyb3VwZWRGaWxlcy5wdXNoKGZpbGUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSBwcm9jZXNzLnB1c2goTWF0ZUJ1bmRsZXIuY29tcGlsZShncm91cGVkRmlsZXMsIGdyb3VwRmlsZXNFeHRlbnRpb24sIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpKTtcclxuXHJcblx0XHRjb25zdCBzdHJlYW0gPSBtZXJnZTIoKTtcclxuXHJcblx0XHRwcm9jZXNzLmZvckVhY2goKHApID0+IHtcclxuXHRcdFx0c3RyZWFtLmFkZChwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBzdHJlYW07XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY29tcGlsZShmaWxlczogc3RyaW5nW10sIGlucHV0RXh0ZW50aW9uOiBzdHJpbmcsIG91dHB1dEV4dGVudGlvbjogc3RyaW5nLCBidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogYW55IHtcclxuXHRcdGxldCBwcm9jZXNzID0gZ3VscC5zcmMoZmlsZXMpO1xyXG5cclxuXHRcdGlmIChpbnB1dEV4dGVudGlvbiA9PT0gb3V0cHV0RXh0ZW50aW9uKSByZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdHN3aXRjaCAoaW5wdXRFeHRlbnRpb24pIHtcclxuXHRcdFx0Y2FzZSAnY3NzJzpcclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKGd1bHBDb25jYXQoJ2VtcHR5JykpO1xyXG5cclxuXHRcdFx0Y2FzZSAnbGVzcyc6XHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcclxuXHJcblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwTGVzcygpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICdzY3NzJzpcclxuXHRcdFx0XHRpZiAoYnVpbGQuY3NzLnNvdXJjZU1hcCkgcHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU291cmNlbWFwcy5pbml0KCkpO1xyXG5cclxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTYXNzKCkub24oJ2Vycm9yJywgZ3VscFNhc3MubG9nRXJyb3IpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICd0cyc6XHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcclxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcclxuXHJcblx0XHRcdFx0bGV0IHRzID0gbnVsbDtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLnRzKVxyXG5cdFx0XHRcdFx0dHMgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cyk7XHJcblxyXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUodHMgPyB0cygpIDogZ3VscFRzKCkpO1xyXG5cclxuXHRcdFx0XHRpZiAob3V0cHV0RXh0ZW50aW9uID09PSAnanMnICYmIGJ1aWxkLmpzLndlYkNsZWFuKVxyXG5cdFx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZSh3ZWJDbGVhbigpKTtcclxuXHJcblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcclxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XHJcblxyXG5cdFx0XHRjYXNlICdkLnRzJzpcclxuXHJcblx0XHRcdFx0bGV0IHRzZCA9IG51bGw7XHJcblxyXG5cdFx0XHRcdGlmIChidWlsZC50cylcclxuXHRcdFx0XHRcdHRzZCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KGJ1aWxkLnRzLCB7IGRlY2xhcmF0aW9uOiB0cnVlIH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKHRzZCA/IHRzZCgpIDogZ3VscFRzKHsgZGVjbGFyYXRpb246IHRydWUgfSkpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBwcm9jZXNzO1xyXG5cdH1cclxufVxyXG4iXX0=