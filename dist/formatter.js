"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prettier = require("prettier");
var fs = require("fs");
var glob = require("glob");
var config_1 = require("./config");
var chokidar = require("chokidar");
var MateFormatter = (function () {
    function MateFormatter() {
    }
    MateFormatter.execute = function (config) {
        var _this = this;
        if (!config || !config.format || !config.format.path)
            return;
        prettier.resolveConfigFile().then(function (configPath) {
            prettier.resolveConfig(configPath).then(function (options) {
                _this.configPaths(config).forEach(function (path) {
                    _this.formatPath(config, path, options);
                });
            });
        });
    };
    MateFormatter.formatPath = function (config, path, options) {
        var _this = this;
        glob(path, function (error, files) {
            if (error)
                throw new Error(error.message);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                _this.formatFile(file, options);
            }
        });
    };
    MateFormatter.formatFile = function (file, options) {
        if (file.toLocaleLowerCase().indexOf('.min.') !== -1)
            return;
        fs.readFile(file, function (error, content) {
            switch (file.split('.').pop().toLocaleLowerCase()) {
                case 'js':
                    options.parser = 'babel';
                    break;
                case 'ts':
                    options.parser = 'typescript';
                    break;
                case 'css':
                    options.parser = 'css';
                    break;
                case 'less':
                    options.parser = 'less';
                    break;
                case 'scss':
                    options.parser = 'scss';
                    break;
                case 'html':
                    options.parser = 'html';
                    break;
                case 'md':
                    options.parser = 'markdown';
                    break;
                case 'json':
                    options.parser = 'json';
                    break;
                case 'yaml':
                case 'yml':
                    options.parser = 'yaml';
                    break;
                default:
                    if (file.startsWith('.'))
                        options.parser = 'json';
                    else
                        return;
            }
            try {
                var formattedContent = prettier.format(content.toString(), options);
                if (formattedContent !== content.toString())
                    fs.writeFile(file, formattedContent, function () { });
            }
            catch (_a) { }
        });
    };
    MateFormatter.watch = function (config) {
        var _this = this;
        var configWatcher = chokidar.watch(config_1.MateConfig.availableConfigurationFile, { persistent: true })
            .on('change', function (event, path) {
            _this.allWatchers.forEach(function (watcher) {
                watcher.close();
            });
            _this.allWatchers = [];
            _this.watch(config);
        });
        this.allWatchers.push(configWatcher);
        prettier.resolveConfigFile().then(function (configPath) {
            prettier.resolveConfig(configPath).then(function (options) {
                var watch = chokidar.watch(_this.configPaths(config), { persistent: true }).on('change', function (path) {
                    _this.formatPath(config, path, options);
                });
                _this.allWatchers.push(watch);
            });
        });
        this.execute(config);
    };
    MateFormatter.configPaths = function (config) {
        var paths;
        if (typeof config.format.path == 'string')
            paths = [config.format.path];
        else
            paths = config.format.path;
        return paths;
    };
    MateFormatter.allWatchers = [];
    return MateFormatter;
}());
exports.MateFormatter = MateFormatter;
