"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var glob = require("glob");
var cosmiconfig_1 = require("cosmiconfig");
var ts = require("typescript");
var MateConfig = (function () {
    function MateConfig() {
    }
    Object.defineProperty(MateConfig, "configurationExplorer", {
        get: function () {
            if (this._configurationExplorer !== undefined)
                return this._configurationExplorer;
            this._configurationExplorer = cosmiconfig_1.cosmiconfigSync('mateconfig', {
                searchPlaces: [
                    '.mateconfig',
                    '.mateconfig.json',
                    '.mateconfig.yaml',
                    '.mateconfig.yml',
                    '.mateconfig.js',
                    'mateconfig.json',
                    'package.json',
                ],
                transform: function (result) {
                    if (!result || !result.config)
                        return result;
                    if (typeof result.config !== 'object')
                        throw new Error("Config is only allowed to be an object, but received " + typeof result.config + " in \"" + result.filepath + "\"");
                    if (result.config.files)
                        result.config.files.forEach(function (fileInfo) {
                            if (typeof fileInfo.output === "string")
                                fileInfo.output = [fileInfo.output];
                            if (typeof fileInfo.input === "string")
                                fileInfo.input = [fileInfo.input];
                            if (!fileInfo.builds)
                                fileInfo.builds = ['dev'];
                            else if (typeof fileInfo.builds === "string")
                                fileInfo.builds = [fileInfo.builds];
                        });
                    if (result.config.images)
                        result.config.images.forEach(function (fileInfo) {
                            if (typeof fileInfo.output === "string")
                                fileInfo.output = [fileInfo.output];
                            if (typeof fileInfo.input === "string")
                                fileInfo.input = [fileInfo.input];
                        });
                    delete result.config.$schema;
                    return result;
                },
            });
            return this._configurationExplorer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MateConfig, "availableConfigurationFile", {
        get: function () {
            var explorer = this.configurationExplorer;
            try {
                var result = explorer.search();
                return result.filepath;
            }
            catch (_a) {
                throw new Error('Configuration file was not found.');
            }
        },
        enumerable: true,
        configurable: true
    });
    MateConfig.get = function () {
        var _a;
        var configurationFile = MateConfig.availableConfigurationFile;
        if (!configurationFile)
            return null;
        var configJson;
        var result = this.configurationExplorer.load(configurationFile);
        configJson = result.config;
        if (!configJson)
            throw new Error('Error parsing configuration file.');
        var config = new MateConfig();
        config.name = configJson.name;
        config.version = configJson.version;
        config.files = configJson.files;
        config.images = configJson.images;
        config.builds = (_a = configJson.builds) !== null && _a !== void 0 ? _a : [];
        var tsConfigPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
        if (tsConfigPath)
            config.builds.forEach(function (build) {
                if (!build.ts)
                    build.ts = tsConfigPath;
            });
        config.setUndefined();
        return config;
    };
    MateConfig.prototype.setPackage = function () {
        this.package = JSON.parse(fs.readFileSync('package.json').toString());
    };
    MateConfig.prototype.getPackageInfo = function (info) {
        if (!this.package)
            this.setPackage();
        return this.package[info];
    };
    MateConfig.prototype.getOutDirName = function () {
        if (this.name)
            return this.name;
        if (this.getPackageInfo('name'))
            return this.getPackageInfo('name');
        return undefined;
    };
    MateConfig.prototype.getOutDirVersion = function () {
        if (this.version)
            return this.version;
        if (this.getPackageInfo('version'))
            return this.getPackageInfo('version');
        return undefined;
    };
    MateConfig.prototype.getBuild = function (name) {
        if (name === undefined || name === null || name === '')
            name = 'dev';
        for (var _i = 0, _a = this.builds; _i < _a.length; _i++) {
            var build = _a[_i];
            if (build.name === name)
                return build;
        }
    };
    MateConfig.prototype.setUndefined = function () {
        var devBuildExists = false;
        this.builds.forEach(function (build) {
            if (build.name === 'dev')
                devBuildExists = true;
            MateConfigBuild.setUndefined(build);
        });
        if (!devBuildExists) {
            var devBuild = new MateConfigBuild('dev');
            MateConfigBuild.setUndefined(devBuild);
            this.builds.push(devBuild);
        }
    };
    return MateConfig;
}());
exports.MateConfig = MateConfig;
var MateConfigFile = (function () {
    function MateConfigFile() {
    }
    MateConfigFile.hasExtension = function (input, extension) {
        var mathExpression = new RegExp('\\.' + extension + '$');
        for (var _i = 0, input_1 = input; _i < input_1.length; _i++) {
            var path = input_1[_i];
            for (var _a = 0, _b = glob.sync(path); _a < _b.length; _a++) {
                var file = _b[_a];
                if (file.match(mathExpression))
                    return true;
            }
        }
        return false;
    };
    return MateConfigFile;
}());
exports.MateConfigFile = MateConfigFile;
var MateConfigImage = (function () {
    function MateConfigImage() {
    }
    return MateConfigImage;
}());
exports.MateConfigImage = MateConfigImage;
var MateConfigBuild = (function () {
    function MateConfigBuild(_name) {
        this.name = _name;
    }
    MateConfigBuild.setUndefined = function (build) {
        if (!build.outDirVersioning)
            build.outDirVersioning = false;
        if (!build.outDirName)
            build.outDirName = false;
        if (build.css === undefined)
            build.css = new MateConfigCSSConfig();
        MateConfigCSSConfig.setUndefined(build.css);
        if (build.js === undefined)
            build.js = new MateConfigJSConfig();
        MateConfigJSConfig.setUndefined(build.js);
    };
    return MateConfigBuild;
}());
exports.MateConfigBuild = MateConfigBuild;
var MateConfigBaseConfig = (function () {
    function MateConfigBaseConfig() {
    }
    return MateConfigBaseConfig;
}());
exports.MateConfigBaseConfig = MateConfigBaseConfig;
var MateConfigCSSConfig = (function (_super) {
    __extends(MateConfigCSSConfig, _super);
    function MateConfigCSSConfig() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MateConfigCSSConfig.setUndefined = function (css) {
        if (css.minify === undefined)
            css.minify = true;
        if (css.sourceMap === undefined)
            css.sourceMap = false;
    };
    return MateConfigCSSConfig;
}(MateConfigBaseConfig));
exports.MateConfigCSSConfig = MateConfigCSSConfig;
var MateConfigJSConfig = (function (_super) {
    __extends(MateConfigJSConfig, _super);
    function MateConfigJSConfig() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MateConfigJSConfig.setUndefined = function (js) {
        if (js.minify === undefined)
            js.minify = true;
        if (js.sourceMap === undefined)
            js.sourceMap = true;
        if (js.declaration === undefined)
            js.declaration = true;
        if (js.webClean === undefined)
            js.webClean = false;
    };
    return MateConfigJSConfig;
}(MateConfigBaseConfig));
exports.MateConfigJSConfig = MateConfigJSConfig;
var MateConfigFormatterConfig = (function () {
    function MateConfigFormatterConfig() {
    }
    return MateConfigFormatterConfig;
}());
exports.MateConfigFormatterConfig = MateConfigFormatterConfig;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUN4RCxDQUFDO0lBQ0YsMEJBQUM7QUFBRCxDQVRBLEFBU0MsQ0FUd0Msb0JBQW9CLEdBUzVEO0FBVFksa0RBQW1CO0FBV2hDO0lBQXdDLHNDQUFvQjtJQUE1RDs7SUFlQSxDQUFDO0lBVE8sK0JBQVksR0FBbkIsVUFBb0IsRUFBc0I7UUFDekMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUU5QyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBRXBELElBQUksRUFBRSxDQUFDLFdBQVcsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFeEQsSUFBSSxFQUFFLENBQUMsUUFBUSxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUNwRCxDQUFDO0lBQ0YseUJBQUM7QUFBRCxDQWZBLEFBZUMsQ0FmdUMsb0JBQW9CLEdBZTNEO0FBZlksZ0RBQWtCO0FBaUIvQjtJQUFBO0lBRUEsQ0FBQztJQUFELGdDQUFDO0FBQUQsQ0FGQSxBQUVDLElBQUE7QUFGWSw4REFBeUIiLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xuaW1wb3J0IHsgY29zbWljb25maWdTeW5jIH0gZnJvbSAnY29zbWljb25maWcnO1xuaW1wb3J0IHsgQ29zbWljb25maWdSZXN1bHQgfSBmcm9tICdjb3NtaWNvbmZpZy9kaXN0L3R5cGVzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gXCJ0eXBlc2NyaXB0XCI7XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnIHtcblxuXHRwcml2YXRlIHN0YXRpYyBfY29uZmlndXJhdGlvbkV4cGxvcmVyO1xuXG5cdG5hbWU/OiBzdHJpbmc7XG5cdHZlcnNpb24/OiBzdHJpbmc7XG5cdGZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdO1xuXHRidWlsZHM6IE1hdGVDb25maWdCdWlsZFtdO1xuXHRpbWFnZXM/OiBNYXRlQ29uZmlnSW1hZ2VbXTtcblxuXHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XG5cblx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGNvbmZpZ3VyYXRpb25FeHBsb3JlcigpIHtcblx0XHRpZiAodGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyICE9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XG5cblx0XHR0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXIgPSBjb3NtaWNvbmZpZ1N5bmMoJ21hdGVjb25maWcnLCB7XG5cdFx0XHRzZWFyY2hQbGFjZXM6IFtcblx0XHRcdFx0Jy5tYXRlY29uZmlnJyxcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzb24nLFxuXHRcdFx0XHQnLm1hdGVjb25maWcueWFtbCcsXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy55bWwnLFxuXHRcdFx0XHQnLm1hdGVjb25maWcuanMnLFxuXHRcdFx0XHQnbWF0ZWNvbmZpZy5qc29uJywgLy8gRGVwcmVjYXRlZFxuXHRcdFx0XHQncGFja2FnZS5qc29uJyxcblx0XHRcdF0sXG5cdFx0XHR0cmFuc2Zvcm06IChyZXN1bHQpID0+IHtcblxuXHRcdFx0XHRpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LmNvbmZpZylcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzdWx0LmNvbmZpZyAhPT0gJ29iamVjdCcpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWcgaXMgb25seSBhbGxvd2VkIHRvIGJlIGFuIG9iamVjdCwgYnV0IHJlY2VpdmVkICR7dHlwZW9mIHJlc3VsdC5jb25maWd9IGluIFwiJHtyZXN1bHQuZmlsZXBhdGh9XCJgKTtcblxuXHRcdFx0XHRpZiAocmVzdWx0LmNvbmZpZy5maWxlcylcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5vdXRwdXQgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLm91dHB1dCA9IFtmaWxlSW5mby5vdXRwdXRdO1xuXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLmlucHV0ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5pbnB1dCA9IFtmaWxlSW5mby5pbnB1dF07XG5cblx0XHRcdFx0XHRcdGlmICghZmlsZUluZm8uYnVpbGRzKVxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbJ2RldiddO1xuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGZpbGVJbmZvLmJ1aWxkcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uYnVpbGRzID0gW2ZpbGVJbmZvLmJ1aWxkc107XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYgKHJlc3VsdC5jb25maWcuaW1hZ2VzKVxuXHRcdFx0XHRcdHJlc3VsdC5jb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnSW1hZ2UpID0+IHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5vdXRwdXQgPSBbZmlsZUluZm8ub3V0cHV0XTtcblxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5pbnB1dCA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGRlbGV0ZSByZXN1bHQuY29uZmlnLiRzY2hlbWE7XG5cblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyO1xuXHR9XG5cblx0c3RhdGljIGdldCBhdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZSgpOiBzdHJpbmcge1xuXHRcdGNvbnN0IGV4cGxvcmVyID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXI7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZXhwbG9yZXIuc2VhcmNoKCk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0LmZpbGVwYXRoO1xuXHRcdH0gY2F0Y2gge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZpbGUgd2FzIG5vdCBmb3VuZC4nKTtcblx0XHR9XG5cdH1cblxuXHRzdGF0aWMgZ2V0KCk6IE1hdGVDb25maWcge1xuXHRcdGNvbnN0IGNvbmZpZ3VyYXRpb25GaWxlID0gTWF0ZUNvbmZpZy5hdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZTtcblxuXHRcdGlmICghY29uZmlndXJhdGlvbkZpbGUpXG5cdFx0XHRyZXR1cm4gbnVsbDtcblxuXHRcdGxldCBjb25maWdKc29uOiBNYXRlQ29uZmlnO1xuXG5cdFx0Y29uc3QgcmVzdWx0OiBDb3NtaWNvbmZpZ1Jlc3VsdCA9IHRoaXMuY29uZmlndXJhdGlvbkV4cGxvcmVyLmxvYWQoY29uZmlndXJhdGlvbkZpbGUpO1xuXHRcdGNvbmZpZ0pzb24gPSByZXN1bHQuY29uZmlnO1xuXG5cdFx0aWYgKCFjb25maWdKc29uKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciBwYXJzaW5nIGNvbmZpZ3VyYXRpb24gZmlsZS4nKTtcblxuXHRcdGxldCBjb25maWcgPSBuZXcgTWF0ZUNvbmZpZygpO1xuXG5cdFx0Y29uZmlnLm5hbWUgPSBjb25maWdKc29uLm5hbWU7XG5cdFx0Y29uZmlnLnZlcnNpb24gPSBjb25maWdKc29uLnZlcnNpb247XG5cdFx0Y29uZmlnLmZpbGVzID0gY29uZmlnSnNvbi5maWxlcztcblx0XHRjb25maWcuaW1hZ2VzID0gY29uZmlnSnNvbi5pbWFnZXM7XG5cdFx0Y29uZmlnLmJ1aWxkcyA9IGNvbmZpZ0pzb24uYnVpbGRzID8/IFtdO1xuXG5cdFx0Ly8gVFMgQ29uZmlnXG5cblx0XHRjb25zdCB0c0NvbmZpZ1BhdGggPSB0cy5maW5kQ29uZmlnRmlsZShcIi4vXCIsIHRzLnN5cy5maWxlRXhpc3RzLCBcInRzY29uZmlnLmpzb25cIik7XG5cblx0XHRpZiAodHNDb25maWdQYXRoKVxuXHRcdFx0Y29uZmlnLmJ1aWxkcy5mb3JFYWNoKChidWlsZCkgPT4ge1xuXHRcdFx0XHRpZiAoIWJ1aWxkLnRzKVxuXHRcdFx0XHRcdGJ1aWxkLnRzID0gdHNDb25maWdQYXRoO1xuXHRcdFx0fSk7XG5cblx0XHRjb25maWcuc2V0VW5kZWZpbmVkKCk7XG5cdFx0cmV0dXJuIGNvbmZpZztcblx0fVxuXG5cdHByaXZhdGUgcGFja2FnZTogb2JqZWN0O1xuXHRwcml2YXRlIHNldFBhY2thZ2UoKSB7XG5cdFx0dGhpcy5wYWNrYWdlID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicpLnRvU3RyaW5nKCkpO1xuXHR9XG5cblx0cHJpdmF0ZSBnZXRQYWNrYWdlSW5mbyhpbmZvOiBzdHJpbmcpIHtcblxuXHRcdGlmICghdGhpcy5wYWNrYWdlKVxuXHRcdFx0dGhpcy5zZXRQYWNrYWdlKCk7XG5cblx0XHRyZXR1cm4gdGhpcy5wYWNrYWdlW2luZm9dO1xuXHR9XG5cblx0Z2V0T3V0RGlyTmFtZSgpOiBzdHJpbmcge1xuXG5cdFx0aWYgKHRoaXMubmFtZSlcblx0XHRcdHJldHVybiB0aGlzLm5hbWU7XG5cblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpKVxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKTtcblxuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XG5cdFx0aWYgKHRoaXMudmVyc2lvbikgcmV0dXJuIHRoaXMudmVyc2lvbjtcblxuXHRcdGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJykpIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJyk7XG5cblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Z2V0QnVpbGQobmFtZTogc3RyaW5nKTogTWF0ZUNvbmZpZ0J1aWxkIHtcblx0XHRpZiAobmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gJycpIG5hbWUgPSAnZGV2JztcblxuXHRcdGZvciAoY29uc3QgYnVpbGQgb2YgdGhpcy5idWlsZHMpIGlmIChidWlsZC5uYW1lID09PSBuYW1lKSByZXR1cm4gYnVpbGQ7XG5cdH1cblxuXHRzZXRVbmRlZmluZWQoKTogdm9pZCB7XG5cdFx0Ly8gQnVpbGRzXG5cblx0XHRsZXQgZGV2QnVpbGRFeGlzdHMgPSBmYWxzZTtcblxuXHRcdHRoaXMuYnVpbGRzLmZvckVhY2goKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpID0+IHtcblx0XHRcdGlmIChidWlsZC5uYW1lID09PSAnZGV2JykgZGV2QnVpbGRFeGlzdHMgPSB0cnVlO1xuXG5cdFx0XHRNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGJ1aWxkKTtcblx0XHR9KTtcblxuXHRcdGlmICghZGV2QnVpbGRFeGlzdHMpIHtcblx0XHRcdGNvbnN0IGRldkJ1aWxkID0gbmV3IE1hdGVDb25maWdCdWlsZCgnZGV2Jyk7XG5cdFx0XHRNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcblxuXHRcdFx0dGhpcy5idWlsZHMucHVzaChkZXZCdWlsZCk7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRmlsZSB7XG5cdGlucHV0OiBzdHJpbmdbXTtcblx0b3V0cHV0OiBzdHJpbmdbXTtcblx0YnVpbGRzPzogc3RyaW5nW107XG5cblx0c3RhdGljIGhhc0V4dGVuc2lvbihpbnB1dDogc3RyaW5nW10sIGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbiB7XG5cdFx0Y29uc3QgbWF0aEV4cHJlc3Npb24gPSBuZXcgUmVnRXhwKCdcXFxcLicgKyBleHRlbnNpb24gKyAnJCcpO1xuXG5cdFx0Zm9yIChjb25zdCBwYXRoIG9mIGlucHV0KVxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIGdsb2Iuc3luYyhwYXRoKSkge1xuXHRcdFx0XHRpZiAoZmlsZS5tYXRjaChtYXRoRXhwcmVzc2lvbikpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdJbWFnZSB7XG5cdGlucHV0OiBzdHJpbmdbXTtcblx0b3V0cHV0OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZCB7XG5cdG5hbWU6IHN0cmluZztcblx0b3V0RGlyPzogc3RyaW5nO1xuXHRvdXREaXJWZXJzaW9uaW5nPzogYm9vbGVhbjtcblx0b3V0RGlyTmFtZT86IGJvb2xlYW47XG5cdGNzcz86IE1hdGVDb25maWdDU1NDb25maWc7XG5cdGpzPzogTWF0ZUNvbmZpZ0pTQ29uZmlnO1xuXHR0cz86IHN0cmluZztcblxuXHRjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5uYW1lID0gX25hbWU7XG5cdH1cblxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcblx0XHRpZiAoIWJ1aWxkLm91dERpclZlcnNpb25pbmcpIGJ1aWxkLm91dERpclZlcnNpb25pbmcgPSBmYWxzZTtcblxuXHRcdGlmICghYnVpbGQub3V0RGlyTmFtZSkgYnVpbGQub3V0RGlyTmFtZSA9IGZhbHNlO1xuXG5cdFx0Ly8gQ1NTXG5cblx0XHRpZiAoYnVpbGQuY3NzID09PSB1bmRlZmluZWQpIGJ1aWxkLmNzcyA9IG5ldyBNYXRlQ29uZmlnQ1NTQ29uZmlnKCk7XG5cblx0XHRNYXRlQ29uZmlnQ1NTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5jc3MpO1xuXG5cdFx0Ly8gSlNcblxuXHRcdGlmIChidWlsZC5qcyA9PT0gdW5kZWZpbmVkKSBidWlsZC5qcyA9IG5ldyBNYXRlQ29uZmlnSlNDb25maWcoKTtcblxuXHRcdE1hdGVDb25maWdKU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuanMpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XG5cdG91dERpclN1ZmZpeD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdDU1NDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XG5cdG1pbmlmeT86IGJvb2xlYW47XG5cdHNvdXJjZU1hcD86IGJvb2xlYW47XG5cblx0c3RhdGljIHNldFVuZGVmaW5lZChjc3M6IE1hdGVDb25maWdDU1NDb25maWcpOiB2b2lkIHtcblx0XHRpZiAoY3NzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKSBjc3MubWluaWZ5ID0gdHJ1ZTtcblxuXHRcdGlmIChjc3Muc291cmNlTWFwID09PSB1bmRlZmluZWQpIGNzcy5zb3VyY2VNYXAgPSBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0pTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xuXHRtaW5pZnk/OiBib29sZWFuO1xuXHRzb3VyY2VNYXA/OiBib29sZWFuO1xuXHRkZWNsYXJhdGlvbj86IGJvb2xlYW47XG5cdHdlYkNsZWFuPzogYm9vbGVhbjtcblxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGpzOiBNYXRlQ29uZmlnSlNDb25maWcpOiB2b2lkIHtcblx0XHRpZiAoanMubWluaWZ5ID09PSB1bmRlZmluZWQpIGpzLm1pbmlmeSA9IHRydWU7XG5cblx0XHRpZiAoanMuc291cmNlTWFwID09PSB1bmRlZmluZWQpIGpzLnNvdXJjZU1hcCA9IHRydWU7XG5cblx0XHRpZiAoanMuZGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkganMuZGVjbGFyYXRpb24gPSB0cnVlO1xuXG5cdFx0aWYgKGpzLndlYkNsZWFuID09PSB1bmRlZmluZWQpIGpzLndlYkNsZWFuID0gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdGb3JtYXR0ZXJDb25maWcge1xuXHRwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXTtcbn0iXX0=
