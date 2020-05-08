"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBRTdELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2xFO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQTVPTSx1QkFBVyxHQUF5QixFQUFFLENBQUM7SUE2Ty9DLGtCQUFDO0NBOU9ELEFBOE9DLElBQUE7QUE5T1ksa0NBQVciLCJmaWxlIjoiYnVuZGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnRmlsZSwgTWF0ZUNvbmZpZ0J1aWxkIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCBndWxwTGVzcyA9IHJlcXVpcmUoJ2d1bHAtbGVzcycpO1xuY29uc3QgZ3VscFNhc3MgPSByZXF1aXJlKCdndWxwLXNhc3MnKTtcbmNvbnN0IGd1bHBSZW5hbWUgPSByZXF1aXJlKCdndWxwLXJlbmFtZScpO1xuY29uc3QgZ3VscENvbmNhdCA9IHJlcXVpcmUoJ2d1bHAtY29uY2F0Jyk7XG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmNvbnN0IGd1bHBTb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBndWxwTWluaWZ5ID0gcmVxdWlyZSgnZ3VscC1taW5pZnknKTtcbmNvbnN0IG1lcmdlMiA9IHJlcXVpcmUoJ21lcmdlMicpO1xuY29uc3QgZ3VscENsZWFuQ1NTID0gcmVxdWlyZSgnZ3VscC1jbGVhbi1jc3MnKTtcbmNvbnN0IGd1bHBGaWx0ZXIgPSByZXF1aXJlKCdndWxwLWZpbHRlci1lYWNoJyk7XG5jb25zdCB3ZWJDbGVhbiA9IHJlcXVpcmUoJy4vd2ViY2xlYW5qcycpO1xuXG5leHBvcnQgY2xhc3MgTWF0ZUJ1bmRsZXIge1xuXHRzdGF0aWMgYWxsV2F0Y2hlcnM6IGNob2tpZGFyLkZTV2F0Y2hlcltdID0gW107XG5cblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZywgYnVpbGRzPzogc3RyaW5nW10pOiB2b2lkIHtcblxuXHRcdGlmICghY29uZmlnLmZpbGVzKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Y29uc29sZS5sb2coJ2V4ZWN1dGVkIGF0ICcgKyBuZXcgRGF0ZSgpLnRvVGltZVN0cmluZygpKTtcblxuXHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKTogdm9pZCA9PiB7XG5cdFx0XHRNYXRlQnVuZGxlci5ydW5GaWxlcyhjb25maWcsIGZpbGUsIGJ1aWxkcyk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgd2F0Y2goY29uZmlnOiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSkge1xuXG5cdFx0aWYgKCFjb25maWcuZmlsZXMpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRpZiAoYnVpbGRzID09PSB1bmRlZmluZWQgfHwgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMubGVuZ3RoID09PSAwKSkgYnVpbGRzID0gWydkZXYnXTtcblxuXHRcdGNvbnN0IGNvbmZpZ1dhdGNoZXIgPSBjaG9raWRhci53YXRjaChNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlLCB7IHBlcnNpc3RlbnQ6IHRydWUgfSkub24oJ2NoYW5nZScsIChldmVudCwgcGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLmZvckVhY2goKHdhdGNoZXI6IGNob2tpZGFyLkZTV2F0Y2hlcikgPT4ge1xuXHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycyA9IFtdO1xuXG5cdFx0XHR0aGlzLndhdGNoKGNvbmZpZywgYnVpbGRzKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaChjb25maWdXYXRjaGVyKTtcblxuXHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyA9PT0gbnVsbCB8fCBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNvbnN0IGV4dGVuc2lvbnMgPSBbJ2xlc3MnLCAnc2NzcyddO1xuXG5cdFx0XHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcblxuXHRcdFx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xuXHRcdFx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBleHRlbnNpb24gb2YgZXh0ZW5zaW9ucykgaWYgKE1hdGVDb25maWdGaWxlLmhhc0V4dGVuc2lvbihmaWxlLmlucHV0LCBleHRlbnNpb24pKSB3YXRjaFBhdGhzLnB1c2goJy4vKiovKi4nICsgZXh0ZW5zaW9uKTtcblxuXHRcdFx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5ydW5GaWxlcyhjb25maWcsIGZpbGUsIFtidWlsZE5hbWVdKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZywgYnVpbGRzKTtcblx0fVxuXG5cdHN0YXRpYyBydW5GaWxlcyhjb25maWc6IE1hdGVDb25maWcsIGZpbGU6IE1hdGVDb25maWdGaWxlLCBidWlsZHM/OiBzdHJpbmdbXSkge1xuXHRcdGlmIChidWlsZHMgPT09IHVuZGVmaW5lZCB8fCAoYnVpbGRzICE9PSBudWxsICYmIGJ1aWxkcy5sZW5ndGggPT09IDApKSBidWlsZHMgPSBbJ2RldiddO1xuXG5cdFx0ZmlsZS5vdXRwdXQuZm9yRWFjaCgob3V0cHV0KSA9PiB7XG5cdFx0XHRjb25zdCBvdXRwdXRFeHRlbnRpb24gPSBvdXRwdXQuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBvdXRwdXQucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xuXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpOiB2b2lkID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpID09PSAtMSkgcmV0dXJuO1xuXG5cdFx0XHRcdGNvbnN0IGJ1aWxkID0gY29uZmlnLmdldEJ1aWxkKGJ1aWxkTmFtZSk7XG5cblx0XHRcdFx0bGV0IG91dHB1dERpcmVjdG9yeSA9IGJ1aWxkLm91dERpciA/IGJ1aWxkLm91dERpciA6IHBhdGguZGlybmFtZShvdXRwdXQpO1xuXG5cdFx0XHRcdGlmIChidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgY29uZmlnLmdldE91dERpclZlcnNpb24oKTtcblxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyTmFtZSkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJOYW1lKCk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5jc3Mub3V0RGlyU3VmZml4O1xuXG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5qcy5vdXREaXJTdWZmaXg7XG5cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLmRlY2xhcmF0aW9uID09PSB0cnVlKSBNYXRlQnVuZGxlci5jcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZS5pbnB1dCwgb3V0cHV0RGlyZWN0b3J5LCBvdXRwdXRGaWxlTmFtZSwgYnVpbGQpO1xuXG5cdFx0XHRcdGxldCBwcm9jZXNzID0gTWF0ZUJ1bmRsZXIuYnVuZGxlKGZpbGUuaW5wdXQsIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwUmVuYW1lKG91dHB1dEZpbGVOYW1lKSkucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBDbGVhbkNTUygpKVxuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBSZW5hbWUoeyBzdWZmaXg6ICcubWluJyB9KSlcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKFxuXHRcdFx0XHRcdFx0XHRcdFx0Z3VscE1pbmlmeSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGV4dDoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNyYzogJy5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWluOiAnLm1pbi5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgY3JlYXRlVHlwZVNjcmlwdERlY2xhcmF0aW9uKGZpbGVzOiBzdHJpbmdbXSwgb3V0cHV0RGlyZWN0b3J5OiBzdHJpbmcsIG91dHB1dEZpbGVOYW1lOiBzdHJpbmcsIGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcblx0XHRjb25zdCB0eXBlc2NyaXB0RGVjbGFyYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG5cdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRpZiAoZmlsZUV4dGVudGlvbiA9PT0gJ3RzJyAmJiAhZmlsZS50b0xvY2FsZUxvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSB0eXBlc2NyaXB0RGVjbGFyYXRpb25zLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAodHlwZXNjcmlwdERlY2xhcmF0aW9ucy5sZW5ndGggPiAwKVxuXHRcdFx0TWF0ZUJ1bmRsZXIuY29tcGlsZSh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLCAnZC50cycsICd0cycsIGJ1aWxkKVxuXHRcdFx0XHQucGlwZShndWxwRmlsdGVyKChjb250ZW50LCBmaWxlcGF0aDogc3RyaW5nKSA9PiBmaWxlcGF0aC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSlcblx0XHRcdFx0LnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSlcblx0XHRcdFx0LnBpcGUod2ViQ2xlYW4oeyBpc0RlY2xhcmF0aW9uOiB0cnVlIH0pKVxuXHRcdFx0XHQucGlwZShcblx0XHRcdFx0XHRndWxwUmVuYW1lKHtcblx0XHRcdFx0XHRcdGJhc2VuYW1lOiBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKCcuanMnLCAnJyksXG5cdFx0XHRcdFx0XHRzdWZmaXg6ICcuZCcsXG5cdFx0XHRcdFx0XHRleHRuYW1lOiAnLnRzJyxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpXG5cdFx0XHRcdC5waXBlKGd1bHAuZGVzdChvdXRwdXREaXJlY3RvcnkpKTtcblx0fVxuXG5cdHN0YXRpYyBidW5kbGUoZmlsZXM6IHN0cmluZ1tdLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0Y29uc3QgcHJvY2VzczogYW55W10gPSBbXTtcblxuXHRcdGxldCBncm91cEZpbGVzRXh0ZW50aW9uID0gJyc7XG5cdFx0bGV0IGdyb3VwZWRGaWxlczogc3RyaW5nW10gPSBbXTtcblxuXHRcdGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcblxuXHRcdFx0aWYgKGZpbGVFeHRlbnRpb24gIT09IGdyb3VwRmlsZXNFeHRlbnRpb24pIHtcblx0XHRcdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0cHJvY2Vzcy5wdXNoKE1hdGVCdW5kbGVyLmNvbXBpbGUoZ3JvdXBlZEZpbGVzLCBncm91cEZpbGVzRXh0ZW50aW9uLCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKSk7XG5cdFx0XHRcdFx0Z3JvdXBlZEZpbGVzID0gW107XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRncm91cEZpbGVzRXh0ZW50aW9uID0gZmlsZUV4dGVudGlvbjtcblx0XHRcdH1cblxuXHRcdFx0Z3JvdXBlZEZpbGVzLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoZ3JvdXBlZEZpbGVzLmxlbmd0aCA+IDApIHByb2Nlc3MucHVzaChNYXRlQnVuZGxlci5jb21waWxlKGdyb3VwZWRGaWxlcywgZ3JvdXBGaWxlc0V4dGVudGlvbiwgb3V0cHV0RXh0ZW50aW9uLCBidWlsZCkpO1xuXG5cdFx0Y29uc3Qgc3RyZWFtID0gbWVyZ2UyKCk7XG5cblx0XHRwcm9jZXNzLmZvckVhY2goKHApID0+IHtcblx0XHRcdHN0cmVhbS5hZGQocCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc3RyZWFtO1xuXHR9XG5cblx0c3RhdGljIGNvbXBpbGUoZmlsZXM6IHN0cmluZ1tdLCBpbnB1dEV4dGVudGlvbjogc3RyaW5nLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0bGV0IHByb2Nlc3MgPSBndWxwLnNyYyhmaWxlcyk7XG5cblx0XHRpZiAoaW5wdXRFeHRlbnRpb24gPT09IG91dHB1dEV4dGVudGlvbikgcmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdHN3aXRjaCAoaW5wdXRFeHRlbnRpb24pIHtcblx0XHRcdGNhc2UgJ2Nzcyc6XG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2xlc3MnOlxuXHRcdFx0XHRpZiAoYnVpbGQuY3NzLnNvdXJjZU1hcCkgcHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU291cmNlbWFwcy5pbml0KCkpO1xuXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscExlc3MoKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAnc2Nzcyc6XG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLmluaXQoKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU2FzcygpLm9uKCdlcnJvcicsIGd1bHBTYXNzLmxvZ0Vycm9yKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAndHMnOlxuXHRcdFx0XHRpZiAoYnVpbGQuanMuc291cmNlTWFwKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcblxuXHRcdFx0XHRsZXQgdHMgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0cyA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KGJ1aWxkLnRzKTtcblxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKHRzID8gdHMoKSA6IGd1bHBUcygpKTtcblxuXHRcdFx0XHRpZiAob3V0cHV0RXh0ZW50aW9uID09PSAnanMnICYmIGJ1aWxkLmpzLndlYkNsZWFuKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUod2ViQ2xlYW4oKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcblx0XHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xuXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2QudHMnOlxuXG5cdFx0XHRcdGxldCB0c2QgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0c2QgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cywgeyBkZWNsYXJhdGlvbjogdHJ1ZSB9KTtcblxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKHRzZCA/IHRzZCgpIDogZ3VscFRzKHsgZGVjbGFyYXRpb246IHRydWUgfSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBwcm9jZXNzO1xuXHR9XG59XG4iXX0=
