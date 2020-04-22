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
        console.log('executed at ' + new Date().toTimeString());
        config.files.forEach(function (file) {
            MateBundler.runFiles(config, file, builds);
        });
    };
    MateBundler.watch = function (config, builds) {
        var _this = this;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QkFFN0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDbEU7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBcE9NLHVCQUFXLEdBQXlCLEVBQUUsQ0FBQztJQXFPL0Msa0JBQUM7Q0F0T0QsQUFzT0MsSUFBQTtBQXRPWSxrQ0FBVyIsImZpbGUiOiJidW5kbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmltcG9ydCB7IE1hdGVDb25maWcsIE1hdGVDb25maWdGaWxlLCBNYXRlQ29uZmlnQnVpbGQgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmNvbnN0IGd1bHBMZXNzID0gcmVxdWlyZSgnZ3VscC1sZXNzJyk7XG5jb25zdCBndWxwU2FzcyA9IHJlcXVpcmUoJ2d1bHAtc2FzcycpO1xuY29uc3QgZ3VscFJlbmFtZSA9IHJlcXVpcmUoJ2d1bHAtcmVuYW1lJyk7XG5jb25zdCBndWxwQ29uY2F0ID0gcmVxdWlyZSgnZ3VscC1jb25jYXQnKTtcbmNvbnN0IGd1bHBUcyA9IHJlcXVpcmUoJ2d1bHAtdHlwZXNjcmlwdCcpO1xuY29uc3QgZ3VscFNvdXJjZW1hcHMgPSByZXF1aXJlKCdndWxwLXNvdXJjZW1hcHMnKTtcbmNvbnN0IGd1bHBNaW5pZnkgPSByZXF1aXJlKCdndWxwLW1pbmlmeScpO1xuY29uc3QgbWVyZ2UyID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBndWxwQ2xlYW5DU1MgPSByZXF1aXJlKCdndWxwLWNsZWFuLWNzcycpO1xuY29uc3QgZ3VscEZpbHRlciA9IHJlcXVpcmUoJ2d1bHAtZmlsdGVyLWVhY2gnKTtcbmNvbnN0IHdlYkNsZWFuID0gcmVxdWlyZSgnLi93ZWJjbGVhbmpzJyk7XG5cbmV4cG9ydCBjbGFzcyBNYXRlQnVuZGxlciB7XG5cdHN0YXRpYyBhbGxXYXRjaGVyczogY2hva2lkYXIuRlNXYXRjaGVyW10gPSBbXTtcblxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnLCBidWlsZHM/OiBzdHJpbmdbXSk6IHZvaWQge1xuXHRcdGNvbnNvbGUubG9nKCdleGVjdXRlZCBhdCAnICsgbmV3IERhdGUoKS50b1RpbWVTdHJpbmcoKSk7XG5cblx0XHRjb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZSk6IHZvaWQgPT4ge1xuXHRcdFx0TWF0ZUJ1bmRsZXIucnVuRmlsZXMoY29uZmlnLCBmaWxlLCBidWlsZHMpO1xuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIHdhdGNoKGNvbmZpZzogTWF0ZUNvbmZpZywgYnVpbGRzPzogc3RyaW5nW10pIHtcblx0XHRpZiAoYnVpbGRzID09PSB1bmRlZmluZWQgfHwgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMubGVuZ3RoID09PSAwKSkgYnVpbGRzID0gWydkZXYnXTtcblxuXHRcdGNvbnN0IGNvbmZpZ1dhdGNoZXIgPSBjaG9raWRhci53YXRjaChNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlLCB7IHBlcnNpc3RlbnQ6IHRydWUgfSkub24oJ2NoYW5nZScsIChldmVudCwgcGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLmZvckVhY2goKHdhdGNoZXI6IGNob2tpZGFyLkZTV2F0Y2hlcikgPT4ge1xuXHRcdFx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycyA9IFtdO1xuXG5cdFx0XHR0aGlzLndhdGNoKGNvbmZpZywgYnVpbGRzKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaChjb25maWdXYXRjaGVyKTtcblxuXHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyA9PT0gbnVsbCB8fCBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpICE9PSAtMSkge1xuXHRcdFx0XHRcdGNvbnN0IGV4dGVuc2lvbnMgPSBbJ2xlc3MnLCAnc2NzcyddO1xuXG5cdFx0XHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcblxuXHRcdFx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xuXHRcdFx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBleHRlbnNpb24gb2YgZXh0ZW5zaW9ucykgaWYgKE1hdGVDb25maWdGaWxlLmhhc0V4dGVuc2lvbihmaWxlLmlucHV0LCBleHRlbnNpb24pKSB3YXRjaFBhdGhzLnB1c2goJy4vKiovKi4nICsgZXh0ZW5zaW9uKTtcblxuXHRcdFx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5ydW5GaWxlcyhjb25maWcsIGZpbGUsIFtidWlsZE5hbWVdKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZywgYnVpbGRzKTtcblx0fVxuXG5cdHN0YXRpYyBydW5GaWxlcyhjb25maWc6IE1hdGVDb25maWcsIGZpbGU6IE1hdGVDb25maWdGaWxlLCBidWlsZHM/OiBzdHJpbmdbXSkge1xuXHRcdGlmIChidWlsZHMgPT09IHVuZGVmaW5lZCB8fCAoYnVpbGRzICE9PSBudWxsICYmIGJ1aWxkcy5sZW5ndGggPT09IDApKSBidWlsZHMgPSBbJ2RldiddO1xuXG5cdFx0ZmlsZS5vdXRwdXQuZm9yRWFjaCgob3V0cHV0KSA9PiB7XG5cdFx0XHRjb25zdCBvdXRwdXRFeHRlbnRpb24gPSBvdXRwdXQuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBvdXRwdXQucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xuXG5cdFx0XHRmaWxlLmJ1aWxkcy5mb3JFYWNoKChidWlsZE5hbWUpOiB2b2lkID0+IHtcblx0XHRcdFx0aWYgKGJ1aWxkcyAhPT0gbnVsbCAmJiBidWlsZHMuaW5kZXhPZihidWlsZE5hbWUpID09PSAtMSkgcmV0dXJuO1xuXG5cdFx0XHRcdGNvbnN0IGJ1aWxkID0gY29uZmlnLmdldEJ1aWxkKGJ1aWxkTmFtZSk7XG5cblx0XHRcdFx0bGV0IG91dHB1dERpcmVjdG9yeSA9IGJ1aWxkLm91dERpciA/IGJ1aWxkLm91dERpciA6IHBhdGguZGlybmFtZShvdXRwdXQpO1xuXG5cdFx0XHRcdGlmIChidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBvdXRwdXREaXJlY3RvcnkgKz0gJy8nICsgY29uZmlnLmdldE91dERpclZlcnNpb24oKTtcblxuXHRcdFx0XHRpZiAoYnVpbGQub3V0RGlyTmFtZSkgb3V0cHV0RGlyZWN0b3J5ICs9ICcvJyArIGNvbmZpZy5nZXRPdXREaXJOYW1lKCk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5jc3Mub3V0RGlyU3VmZml4O1xuXG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5vdXREaXJTdWZmaXgpIG91dHB1dERpcmVjdG9yeSArPSAnLycgKyBidWlsZC5qcy5vdXREaXJTdWZmaXg7XG5cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLmRlY2xhcmF0aW9uID09PSB0cnVlKSBNYXRlQnVuZGxlci5jcmVhdGVUeXBlU2NyaXB0RGVjbGFyYXRpb24oZmlsZS5pbnB1dCwgb3V0cHV0RGlyZWN0b3J5LCBvdXRwdXRGaWxlTmFtZSwgYnVpbGQpO1xuXG5cdFx0XHRcdGxldCBwcm9jZXNzID0gTWF0ZUJ1bmRsZXIuYnVuZGxlKGZpbGUuaW5wdXQsIG91dHB1dEV4dGVudGlvbiwgYnVpbGQpLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwUmVuYW1lKG91dHB1dEZpbGVOYW1lKSkucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cblx0XHRcdFx0c3dpdGNoIChvdXRwdXRFeHRlbnRpb24pIHtcblx0XHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBDbGVhbkNTUygpKVxuXHRcdFx0XHRcdFx0XHRcdC5waXBlKGd1bHBSZW5hbWUoeyBzdWZmaXg6ICcubWluJyB9KSlcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRcdGlmIChidWlsZC5qcy5taW5pZnkpIHtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdC5waXBlKFxuXHRcdFx0XHRcdFx0XHRcdFx0Z3VscE1pbmlmeSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGV4dDoge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNyYzogJy5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWluOiAnLm1pbi5qcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyZWN0b3J5KSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgY3JlYXRlVHlwZVNjcmlwdERlY2xhcmF0aW9uKGZpbGVzOiBzdHJpbmdbXSwgb3V0cHV0RGlyZWN0b3J5OiBzdHJpbmcsIG91dHB1dEZpbGVOYW1lOiBzdHJpbmcsIGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcblx0XHRjb25zdCB0eXBlc2NyaXB0RGVjbGFyYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuXG5cdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRpZiAoZmlsZUV4dGVudGlvbiA9PT0gJ3RzJyAmJiAhZmlsZS50b0xvY2FsZUxvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSB0eXBlc2NyaXB0RGVjbGFyYXRpb25zLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAodHlwZXNjcmlwdERlY2xhcmF0aW9ucy5sZW5ndGggPiAwKVxuXHRcdFx0TWF0ZUJ1bmRsZXIuY29tcGlsZSh0eXBlc2NyaXB0RGVjbGFyYXRpb25zLCAnZC50cycsICd0cycsIGJ1aWxkKVxuXHRcdFx0XHQucGlwZShndWxwRmlsdGVyKChjb250ZW50LCBmaWxlcGF0aDogc3RyaW5nKSA9PiBmaWxlcGF0aC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuZC50cycpKSlcblx0XHRcdFx0LnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSlcblx0XHRcdFx0LnBpcGUod2ViQ2xlYW4oeyBpc0RlY2xhcmF0aW9uOiB0cnVlIH0pKVxuXHRcdFx0XHQucGlwZShcblx0XHRcdFx0XHRndWxwUmVuYW1lKHtcblx0XHRcdFx0XHRcdGJhc2VuYW1lOiBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKCcuanMnLCAnJyksXG5cdFx0XHRcdFx0XHRzdWZmaXg6ICcuZCcsXG5cdFx0XHRcdFx0XHRleHRuYW1lOiAnLnRzJyxcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpXG5cdFx0XHRcdC5waXBlKGd1bHAuZGVzdChvdXRwdXREaXJlY3RvcnkpKTtcblx0fVxuXG5cdHN0YXRpYyBidW5kbGUoZmlsZXM6IHN0cmluZ1tdLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0Y29uc3QgcHJvY2VzczogYW55W10gPSBbXTtcblxuXHRcdGxldCBncm91cEZpbGVzRXh0ZW50aW9uID0gJyc7XG5cdFx0bGV0IGdyb3VwZWRGaWxlczogc3RyaW5nW10gPSBbXTtcblxuXHRcdGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcblx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcblxuXHRcdFx0aWYgKGZpbGVFeHRlbnRpb24gIT09IGdyb3VwRmlsZXNFeHRlbnRpb24pIHtcblx0XHRcdFx0aWYgKGdyb3VwZWRGaWxlcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0cHJvY2Vzcy5wdXNoKE1hdGVCdW5kbGVyLmNvbXBpbGUoZ3JvdXBlZEZpbGVzLCBncm91cEZpbGVzRXh0ZW50aW9uLCBvdXRwdXRFeHRlbnRpb24sIGJ1aWxkKSk7XG5cdFx0XHRcdFx0Z3JvdXBlZEZpbGVzID0gW107XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRncm91cEZpbGVzRXh0ZW50aW9uID0gZmlsZUV4dGVudGlvbjtcblx0XHRcdH1cblxuXHRcdFx0Z3JvdXBlZEZpbGVzLnB1c2goZmlsZSk7XG5cdFx0fSk7XG5cblx0XHRpZiAoZ3JvdXBlZEZpbGVzLmxlbmd0aCA+IDApIHByb2Nlc3MucHVzaChNYXRlQnVuZGxlci5jb21waWxlKGdyb3VwZWRGaWxlcywgZ3JvdXBGaWxlc0V4dGVudGlvbiwgb3V0cHV0RXh0ZW50aW9uLCBidWlsZCkpO1xuXG5cdFx0Y29uc3Qgc3RyZWFtID0gbWVyZ2UyKCk7XG5cblx0XHRwcm9jZXNzLmZvckVhY2goKHApID0+IHtcblx0XHRcdHN0cmVhbS5hZGQocCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gc3RyZWFtO1xuXHR9XG5cblx0c3RhdGljIGNvbXBpbGUoZmlsZXM6IHN0cmluZ1tdLCBpbnB1dEV4dGVudGlvbjogc3RyaW5nLCBvdXRwdXRFeHRlbnRpb246IHN0cmluZywgYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IGFueSB7XG5cdFx0bGV0IHByb2Nlc3MgPSBndWxwLnNyYyhmaWxlcyk7XG5cblx0XHRpZiAoaW5wdXRFeHRlbnRpb24gPT09IG91dHB1dEV4dGVudGlvbikgcmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdHN3aXRjaCAoaW5wdXRFeHRlbnRpb24pIHtcblx0XHRcdGNhc2UgJ2Nzcyc6XG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2xlc3MnOlxuXHRcdFx0XHRpZiAoYnVpbGQuY3NzLnNvdXJjZU1hcCkgcHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU291cmNlbWFwcy5pbml0KCkpO1xuXG5cdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscExlc3MoKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAnc2Nzcyc6XG5cdFx0XHRcdGlmIChidWlsZC5jc3Muc291cmNlTWFwKSBwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLmluaXQoKSk7XG5cblx0XHRcdFx0cHJvY2VzcyA9IHByb2Nlc3MucGlwZShndWxwU2FzcygpLm9uKCdlcnJvcicsIGd1bHBTYXNzLmxvZ0Vycm9yKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmNzcy5zb3VyY2VNYXApIHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMud3JpdGUoKSk7XG5cblx0XHRcdFx0cmV0dXJuIHByb2Nlc3MucGlwZShndWxwQ29uY2F0KCdlbXB0eScpKTtcblxuXHRcdFx0Y2FzZSAndHMnOlxuXHRcdFx0XHRpZiAoYnVpbGQuanMuc291cmNlTWFwKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUoZ3VscFNvdXJjZW1hcHMuaW5pdCgpKTtcblxuXHRcdFx0XHRsZXQgdHMgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0cyA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KGJ1aWxkLnRzKTtcblxuXHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKHRzID8gdHMoKSA6IGd1bHBUcygpKTtcblxuXHRcdFx0XHRpZiAob3V0cHV0RXh0ZW50aW9uID09PSAnanMnICYmIGJ1aWxkLmpzLndlYkNsZWFuKVxuXHRcdFx0XHRcdHByb2Nlc3MgPSBwcm9jZXNzLnBpcGUod2ViQ2xlYW4oKSk7XG5cblx0XHRcdFx0aWYgKGJ1aWxkLmpzLnNvdXJjZU1hcClcblx0XHRcdFx0XHRwcm9jZXNzID0gcHJvY2Vzcy5waXBlKGd1bHBTb3VyY2VtYXBzLndyaXRlKCkpO1xuXG5cdFx0XHRcdHJldHVybiBwcm9jZXNzLnBpcGUoZ3VscENvbmNhdCgnZW1wdHknKSk7XG5cblx0XHRcdGNhc2UgJ2QudHMnOlxuXG5cdFx0XHRcdGxldCB0c2QgPSBudWxsO1xuXG5cdFx0XHRcdGlmIChidWlsZC50cylcblx0XHRcdFx0XHR0c2QgPSBndWxwVHMuY3JlYXRlUHJvamVjdChidWlsZC50cywgeyBkZWNsYXJhdGlvbjogdHJ1ZSB9KTtcblxuXHRcdFx0XHRyZXR1cm4gcHJvY2Vzcy5waXBlKHRzZCA/IHRzZCgpIDogZ3VscFRzKHsgZGVjbGFyYXRpb246IHRydWUgfSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBwcm9jZXNzO1xuXHR9XG59XG4iXX0=
