"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MateConfigFormatterConfig = exports.MateConfigJSConfig = exports.MateConfigCSSConfig = exports.MateConfigBaseConfig = exports.MateConfigBuild = exports.MateConfigImage = exports.MateConfigFile = exports.MateConfig = void 0;
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
        enumerable: false,
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
        enumerable: false,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDeEQsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0FUQSxBQVNDLENBVHdDLG9CQUFvQixHQVM1RDtBQVRZLGtEQUFtQjtBQVdoQztJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBZUEsQ0FBQztJQVRPLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBQ3pDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFOUMsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUVwRCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXhELElBQUksRUFBRSxDQUFDLFFBQVEsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDcEQsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FmQSxBQWVDLENBZnVDLG9CQUFvQixHQWUzRDtBQWZZLGdEQUFrQjtBQWlCL0I7SUFBQTtJQUVBLENBQUM7SUFBRCxnQ0FBQztBQUFELENBRkEsQUFFQyxJQUFBO0FBRlksOERBQXlCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xyXG5pbXBvcnQgeyBjb3NtaWNvbmZpZ1N5bmMgfSBmcm9tICdjb3NtaWNvbmZpZyc7XHJcbmltcG9ydCB7IENvc21pY29uZmlnUmVzdWx0IH0gZnJvbSAnY29zbWljb25maWcvZGlzdC90eXBlcyc7XHJcbmltcG9ydCAqIGFzIHRzIGZyb20gXCJ0eXBlc2NyaXB0XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZyB7XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIF9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG5cdG5hbWU/OiBzdHJpbmc7XHJcblx0dmVyc2lvbj86IHN0cmluZztcclxuXHRmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcclxuXHRidWlsZHM6IE1hdGVDb25maWdCdWlsZFtdO1xyXG5cdGltYWdlcz86IE1hdGVDb25maWdJbWFnZVtdO1xyXG5cclxuXHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGdldCBjb25maWd1cmF0aW9uRXhwbG9yZXIoKSB7XHJcblx0XHRpZiAodGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyICE9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG5cdFx0dGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyID0gY29zbWljb25maWdTeW5jKCdtYXRlY29uZmlnJywge1xyXG5cdFx0XHRzZWFyY2hQbGFjZXM6IFtcclxuXHRcdFx0XHQnLm1hdGVjb25maWcnLFxyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy5qc29uJyxcclxuXHRcdFx0XHQnLm1hdGVjb25maWcueWFtbCcsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLnltbCcsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzJyxcclxuXHRcdFx0XHQnbWF0ZWNvbmZpZy5qc29uJywgLy8gRGVwcmVjYXRlZFxyXG5cdFx0XHRcdCdwYWNrYWdlLmpzb24nLFxyXG5cdFx0XHRdLFxyXG5cdFx0XHR0cmFuc2Zvcm06IChyZXN1bHQpID0+IHtcclxuXHJcblx0XHRcdFx0aWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5jb25maWcpXHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHRcdFx0XHRpZiAodHlwZW9mIHJlc3VsdC5jb25maWcgIT09ICdvYmplY3QnKVxyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWcgaXMgb25seSBhbGxvd2VkIHRvIGJlIGFuIG9iamVjdCwgYnV0IHJlY2VpdmVkICR7dHlwZW9mIHJlc3VsdC5jb25maWd9IGluIFwiJHtyZXN1bHQuZmlsZXBhdGh9XCJgKTtcclxuXHJcblx0XHRcdFx0aWYgKHJlc3VsdC5jb25maWcuZmlsZXMpXHJcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLm91dHB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5vdXRwdXQgPSBbZmlsZUluZm8ub3V0cHV0XTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8uaW5wdXQgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKCFmaWxlSW5mby5idWlsZHMpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uYnVpbGRzID0gWydkZXYnXTtcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGZpbGVJbmZvLmJ1aWxkcyA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbZmlsZUluZm8uYnVpbGRzXTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRpZiAocmVzdWx0LmNvbmZpZy5pbWFnZXMpXHJcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmltYWdlcy5mb3JFYWNoKChmaWxlSW5mbzogTWF0ZUNvbmZpZ0ltYWdlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLm91dHB1dCA9IFtmaWxlSW5mby5vdXRwdXRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5pbnB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5pbnB1dCA9IFtmaWxlSW5mby5pbnB1dF07XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0ZGVsZXRlIHJlc3VsdC5jb25maWcuJHNjaGVtYTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZ2V0IGF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlKCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBleHBsb3JlciA9IHRoaXMuY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGV4cGxvcmVyLnNlYXJjaCgpO1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LmZpbGVwYXRoO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIHdhcyBub3QgZm91bmQuJyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZ2V0KCk6IE1hdGVDb25maWcge1xyXG5cdFx0Y29uc3QgY29uZmlndXJhdGlvbkZpbGUgPSBNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlO1xyXG5cclxuXHRcdGlmICghY29uZmlndXJhdGlvbkZpbGUpXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cclxuXHRcdGxldCBjb25maWdKc29uOiBNYXRlQ29uZmlnO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdDogQ29zbWljb25maWdSZXN1bHQgPSB0aGlzLmNvbmZpZ3VyYXRpb25FeHBsb3Jlci5sb2FkKGNvbmZpZ3VyYXRpb25GaWxlKTtcclxuXHRcdGNvbmZpZ0pzb24gPSByZXN1bHQuY29uZmlnO1xyXG5cclxuXHRcdGlmICghY29uZmlnSnNvbilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciBwYXJzaW5nIGNvbmZpZ3VyYXRpb24gZmlsZS4nKTtcclxuXHJcblx0XHRsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoKTtcclxuXHJcblx0XHRjb25maWcubmFtZSA9IGNvbmZpZ0pzb24ubmFtZTtcclxuXHRcdGNvbmZpZy52ZXJzaW9uID0gY29uZmlnSnNvbi52ZXJzaW9uO1xyXG5cdFx0Y29uZmlnLmZpbGVzID0gY29uZmlnSnNvbi5maWxlcztcclxuXHRcdGNvbmZpZy5pbWFnZXMgPSBjb25maWdKc29uLmltYWdlcztcclxuXHRcdGNvbmZpZy5idWlsZHMgPSBjb25maWdKc29uLmJ1aWxkcyA/PyBbXTtcclxuXHJcblx0XHQvLyBUUyBDb25maWdcclxuXHJcblx0XHRjb25zdCB0c0NvbmZpZ1BhdGggPSB0cy5maW5kQ29uZmlnRmlsZShcIi4vXCIsIHRzLnN5cy5maWxlRXhpc3RzLCBcInRzY29uZmlnLmpzb25cIik7XHJcblxyXG5cdFx0aWYgKHRzQ29uZmlnUGF0aClcclxuXHRcdFx0Y29uZmlnLmJ1aWxkcy5mb3JFYWNoKChidWlsZCkgPT4ge1xyXG5cdFx0XHRcdGlmICghYnVpbGQudHMpXHJcblx0XHRcdFx0XHRidWlsZC50cyA9IHRzQ29uZmlnUGF0aDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNldFVuZGVmaW5lZCgpO1xyXG5cdFx0cmV0dXJuIGNvbmZpZztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGFja2FnZTogb2JqZWN0O1xyXG5cdHByaXZhdGUgc2V0UGFja2FnZSgpIHtcclxuXHRcdHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0UGFja2FnZUluZm8oaW5mbzogc3RyaW5nKSB7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBhY2thZ2UpXHJcblx0XHRcdHRoaXMuc2V0UGFja2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLnBhY2thZ2VbaW5mb107XHJcblx0fVxyXG5cclxuXHRnZXRPdXREaXJOYW1lKCk6IHN0cmluZyB7XHJcblxyXG5cdFx0aWYgKHRoaXMubmFtZSlcclxuXHRcdFx0cmV0dXJuIHRoaXMubmFtZTtcclxuXHJcblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpO1xyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XHJcblx0XHRpZiAodGhpcy52ZXJzaW9uKSByZXR1cm4gdGhpcy52ZXJzaW9uO1xyXG5cclxuXHRcdGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJykpIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJyk7XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGdldEJ1aWxkKG5hbWU6IHN0cmluZyk6IE1hdGVDb25maWdCdWlsZCB7XHJcblx0XHRpZiAobmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gJycpIG5hbWUgPSAnZGV2JztcclxuXHJcblx0XHRmb3IgKGNvbnN0IGJ1aWxkIG9mIHRoaXMuYnVpbGRzKSBpZiAoYnVpbGQubmFtZSA9PT0gbmFtZSkgcmV0dXJuIGJ1aWxkO1xyXG5cdH1cclxuXHJcblx0c2V0VW5kZWZpbmVkKCk6IHZvaWQge1xyXG5cdFx0Ly8gQnVpbGRzXHJcblxyXG5cdFx0bGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5idWlsZHMuZm9yRWFjaCgoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCkgPT4ge1xyXG5cdFx0XHRpZiAoYnVpbGQubmFtZSA9PT0gJ2RldicpIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcclxuXHJcblx0XHRcdE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoYnVpbGQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKCFkZXZCdWlsZEV4aXN0cykge1xyXG5cdFx0XHRjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xyXG5cdFx0XHRNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcclxuXHJcblx0XHRcdHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdGaWxlIHtcclxuXHRpbnB1dDogc3RyaW5nW107XHJcblx0b3V0cHV0OiBzdHJpbmdbXTtcclxuXHRidWlsZHM/OiBzdHJpbmdbXTtcclxuXHJcblx0c3RhdGljIGhhc0V4dGVuc2lvbihpbnB1dDogc3RyaW5nW10sIGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBtYXRoRXhwcmVzc2lvbiA9IG5ldyBSZWdFeHAoJ1xcXFwuJyArIGV4dGVuc2lvbiArICckJyk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBwYXRoIG9mIGlucHV0KVxyXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZ2xvYi5zeW5jKHBhdGgpKSB7XHJcblx0XHRcdFx0aWYgKGZpbGUubWF0Y2gobWF0aEV4cHJlc3Npb24pKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ltYWdlIHtcclxuXHRpbnB1dDogc3RyaW5nW107XHJcblx0b3V0cHV0OiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZCB7XHJcblx0bmFtZTogc3RyaW5nO1xyXG5cdG91dERpcj86IHN0cmluZztcclxuXHRvdXREaXJWZXJzaW9uaW5nPzogYm9vbGVhbjtcclxuXHRvdXREaXJOYW1lPzogYm9vbGVhbjtcclxuXHRjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xyXG5cdGpzPzogTWF0ZUNvbmZpZ0pTQ29uZmlnO1xyXG5cdHRzPzogc3RyaW5nO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLm5hbWUgPSBfbmFtZTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xyXG5cdFx0aWYgKCFidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBidWlsZC5vdXREaXJWZXJzaW9uaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0aWYgKCFidWlsZC5vdXREaXJOYW1lKSBidWlsZC5vdXREaXJOYW1lID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gQ1NTXHJcblxyXG5cdFx0aWYgKGJ1aWxkLmNzcyA9PT0gdW5kZWZpbmVkKSBidWlsZC5jc3MgPSBuZXcgTWF0ZUNvbmZpZ0NTU0NvbmZpZygpO1xyXG5cclxuXHRcdE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XHJcblxyXG5cdFx0Ly8gSlNcclxuXHJcblx0XHRpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZCkgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XHJcblxyXG5cdFx0TWF0ZUNvbmZpZ0pTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5qcyk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cdG91dERpclN1ZmZpeD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdDU1NDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XHJcblx0bWluaWZ5PzogYm9vbGVhbjtcclxuXHRzb3VyY2VNYXA/OiBib29sZWFuO1xyXG5cclxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xyXG5cdFx0aWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZCkgY3NzLm1pbmlmeSA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGNzcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZCkgY3NzLnNvdXJjZU1hcCA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdKU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHRtaW5pZnk/OiBib29sZWFuO1xyXG5cdHNvdXJjZU1hcD86IGJvb2xlYW47XHJcblx0ZGVjbGFyYXRpb24/OiBib29sZWFuO1xyXG5cdHdlYkNsZWFuPzogYm9vbGVhbjtcclxuXHJcblx0c3RhdGljIHNldFVuZGVmaW5lZChqczogTWF0ZUNvbmZpZ0pTQ29uZmlnKTogdm9pZCB7XHJcblx0XHRpZiAoanMubWluaWZ5ID09PSB1bmRlZmluZWQpIGpzLm1pbmlmeSA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGpzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKSBqcy5zb3VyY2VNYXAgPSB0cnVlO1xyXG5cclxuXHRcdGlmIChqcy5kZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBqcy5kZWNsYXJhdGlvbiA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGpzLndlYkNsZWFuID09PSB1bmRlZmluZWQpIGpzLndlYkNsZWFuID0gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Zvcm1hdHRlckNvbmZpZyB7XHJcblx0cGF0aDogc3RyaW5nIHwgc3RyaW5nW107XHJcbn0iXX0=
