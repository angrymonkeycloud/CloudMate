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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDeEQsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0FUQSxBQVNDLENBVHdDLG9CQUFvQixHQVM1RDtBQVRZLGtEQUFtQjtBQVdoQztJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBZUEsQ0FBQztJQVRPLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBQ3pDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFOUMsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUVwRCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXhELElBQUksRUFBRSxDQUFDLFFBQVEsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDcEQsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FmQSxBQWVDLENBZnVDLG9CQUFvQixHQWUzRDtBQWZZLGdEQUFrQjtBQWlCL0I7SUFBQTtJQUVBLENBQUM7SUFBRCxnQ0FBQztBQUFELENBRkEsQUFFQyxJQUFBO0FBRlksOERBQXlCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKTtcbmltcG9ydCB7IGNvc21pY29uZmlnU3luYyB9IGZyb20gJ2Nvc21pY29uZmlnJztcbmltcG9ydCB7IENvc21pY29uZmlnUmVzdWx0IH0gZnJvbSAnY29zbWljb25maWcvZGlzdC90eXBlcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZyB7XG5cblx0cHJpdmF0ZSBzdGF0aWMgX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcblxuXHRuYW1lPzogc3RyaW5nO1xuXHR2ZXJzaW9uPzogc3RyaW5nO1xuXHRmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcblx0YnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcblx0aW1hZ2VzPzogTWF0ZUNvbmZpZ0ltYWdlW107XG5cblx0cHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHsgfVxuXG5cdHByaXZhdGUgc3RhdGljIGdldCBjb25maWd1cmF0aW9uRXhwbG9yZXIoKSB7XG5cdFx0aWYgKHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlciAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyO1xuXG5cdFx0dGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyID0gY29zbWljb25maWdTeW5jKCdtYXRlY29uZmlnJywge1xuXHRcdFx0c2VhcmNoUGxhY2VzOiBbXG5cdFx0XHRcdCcubWF0ZWNvbmZpZycsXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy5qc29uJyxcblx0XHRcdFx0Jy5tYXRlY29uZmlnLnlhbWwnLFxuXHRcdFx0XHQnLm1hdGVjb25maWcueW1sJyxcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzJyxcblx0XHRcdFx0J21hdGVjb25maWcuanNvbicsIC8vIERlcHJlY2F0ZWRcblx0XHRcdFx0J3BhY2thZ2UuanNvbicsXG5cdFx0XHRdLFxuXHRcdFx0dHJhbnNmb3JtOiAocmVzdWx0KSA9PiB7XG5cblx0XHRcdFx0aWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5jb25maWcpXG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblxuXHRcdFx0XHRpZiAodHlwZW9mIHJlc3VsdC5jb25maWcgIT09ICdvYmplY3QnKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ29uZmlnIGlzIG9ubHkgYWxsb3dlZCB0byBiZSBhbiBvYmplY3QsIGJ1dCByZWNlaXZlZCAke3R5cGVvZiByZXN1bHQuY29uZmlnfSBpbiBcIiR7cmVzdWx0LmZpbGVwYXRofVwiYCk7XG5cblx0XHRcdFx0aWYgKHJlc3VsdC5jb25maWcuZmlsZXMpXG5cdFx0XHRcdFx0cmVzdWx0LmNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlSW5mbzogTWF0ZUNvbmZpZ0ZpbGUpID0+IHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5vdXRwdXQgPSBbZmlsZUluZm8ub3V0cHV0XTtcblxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5pbnB1dCA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xuXG5cdFx0XHRcdFx0XHRpZiAoIWZpbGVJbmZvLmJ1aWxkcylcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uYnVpbGRzID0gWydkZXYnXTtcblx0XHRcdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBmaWxlSW5mby5idWlsZHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmJ1aWxkcyA9IFtmaWxlSW5mby5idWlsZHNdO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmIChyZXN1bHQuY29uZmlnLmltYWdlcylcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmltYWdlcy5mb3JFYWNoKChmaWxlSW5mbzogTWF0ZUNvbmZpZ0ltYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLm91dHB1dCA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8ub3V0cHV0ID0gW2ZpbGVJbmZvLm91dHB1dF07XG5cblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8uaW5wdXQgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmlucHV0ID0gW2ZpbGVJbmZvLmlucHV0XTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRkZWxldGUgcmVzdWx0LmNvbmZpZy4kc2NoZW1hO1xuXG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3Jlcjtcblx0fVxuXG5cdHN0YXRpYyBnZXQgYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGUoKTogc3RyaW5nIHtcblx0XHRjb25zdCBleHBsb3JlciA9IHRoaXMuY29uZmlndXJhdGlvbkV4cGxvcmVyO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGV4cGxvcmVyLnNlYXJjaCgpO1xuXHRcdFx0cmV0dXJuIHJlc3VsdC5maWxlcGF0aDtcblx0XHR9IGNhdGNoIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIHdhcyBub3QgZm91bmQuJyk7XG5cdFx0fVxuXHR9XG5cblx0c3RhdGljIGdldCgpOiBNYXRlQ29uZmlnIHtcblx0XHRjb25zdCBjb25maWd1cmF0aW9uRmlsZSA9IE1hdGVDb25maWcuYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGU7XG5cblx0XHRpZiAoIWNvbmZpZ3VyYXRpb25GaWxlKVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cblx0XHRsZXQgY29uZmlnSnNvbjogTWF0ZUNvbmZpZztcblxuXHRcdGNvbnN0IHJlc3VsdDogQ29zbWljb25maWdSZXN1bHQgPSB0aGlzLmNvbmZpZ3VyYXRpb25FeHBsb3Jlci5sb2FkKGNvbmZpZ3VyYXRpb25GaWxlKTtcblx0XHRjb25maWdKc29uID0gcmVzdWx0LmNvbmZpZztcblxuXHRcdGlmICghY29uZmlnSnNvbilcblx0XHRcdHRocm93IG5ldyBFcnJvcignRXJyb3IgcGFyc2luZyBjb25maWd1cmF0aW9uIGZpbGUuJyk7XG5cblx0XHRsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoKTtcblxuXHRcdGNvbmZpZy5uYW1lID0gY29uZmlnSnNvbi5uYW1lO1xuXHRcdGNvbmZpZy52ZXJzaW9uID0gY29uZmlnSnNvbi52ZXJzaW9uO1xuXHRcdGNvbmZpZy5maWxlcyA9IGNvbmZpZ0pzb24uZmlsZXM7XG5cdFx0Y29uZmlnLmltYWdlcyA9IGNvbmZpZ0pzb24uaW1hZ2VzO1xuXHRcdGNvbmZpZy5idWlsZHMgPSBjb25maWdKc29uLmJ1aWxkcyA/PyBbXTtcblxuXHRcdC8vIFRTIENvbmZpZ1xuXG5cdFx0Y29uc3QgdHNDb25maWdQYXRoID0gdHMuZmluZENvbmZpZ0ZpbGUoXCIuL1wiLCB0cy5zeXMuZmlsZUV4aXN0cywgXCJ0c2NvbmZpZy5qc29uXCIpO1xuXG5cdFx0aWYgKHRzQ29uZmlnUGF0aClcblx0XHRcdGNvbmZpZy5idWlsZHMuZm9yRWFjaCgoYnVpbGQpID0+IHtcblx0XHRcdFx0aWYgKCFidWlsZC50cylcblx0XHRcdFx0XHRidWlsZC50cyA9IHRzQ29uZmlnUGF0aDtcblx0XHRcdH0pO1xuXG5cdFx0Y29uZmlnLnNldFVuZGVmaW5lZCgpO1xuXHRcdHJldHVybiBjb25maWc7XG5cdH1cblxuXHRwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcblx0cHJpdmF0ZSBzZXRQYWNrYWdlKCkge1xuXHRcdHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcblx0fVxuXG5cdHByaXZhdGUgZ2V0UGFja2FnZUluZm8oaW5mbzogc3RyaW5nKSB7XG5cblx0XHRpZiAoIXRoaXMucGFja2FnZSlcblx0XHRcdHRoaXMuc2V0UGFja2FnZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcblx0fVxuXG5cdGdldE91dERpck5hbWUoKTogc3RyaW5nIHtcblxuXHRcdGlmICh0aGlzLm5hbWUpXG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lO1xuXG5cdFx0aWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcblx0XHRcdHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJyk7XG5cblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Z2V0T3V0RGlyVmVyc2lvbigpOiBzdHJpbmcge1xuXHRcdGlmICh0aGlzLnZlcnNpb24pIHJldHVybiB0aGlzLnZlcnNpb247XG5cblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpKSByZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpO1xuXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdGdldEJ1aWxkKG5hbWU6IHN0cmluZyk6IE1hdGVDb25maWdCdWlsZCB7XG5cdFx0aWYgKG5hbWUgPT09IHVuZGVmaW5lZCB8fCBuYW1lID09PSBudWxsIHx8IG5hbWUgPT09ICcnKSBuYW1lID0gJ2Rldic7XG5cblx0XHRmb3IgKGNvbnN0IGJ1aWxkIG9mIHRoaXMuYnVpbGRzKSBpZiAoYnVpbGQubmFtZSA9PT0gbmFtZSkgcmV0dXJuIGJ1aWxkO1xuXHR9XG5cblx0c2V0VW5kZWZpbmVkKCk6IHZvaWQge1xuXHRcdC8vIEJ1aWxkc1xuXG5cdFx0bGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XG5cblx0XHR0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XG5cdFx0XHRpZiAoYnVpbGQubmFtZSA9PT0gJ2RldicpIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcblxuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChidWlsZCk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIWRldkJ1aWxkRXhpc3RzKSB7XG5cdFx0XHRjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChkZXZCdWlsZCk7XG5cblx0XHRcdHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ZpbGUge1xuXHRpbnB1dDogc3RyaW5nW107XG5cdG91dHB1dDogc3RyaW5nW107XG5cdGJ1aWxkcz86IHN0cmluZ1tdO1xuXG5cdHN0YXRpYyBoYXNFeHRlbnNpb24oaW5wdXQ6IHN0cmluZ1tdLCBleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IG1hdGhFeHByZXNzaW9uID0gbmV3IFJlZ0V4cCgnXFxcXC4nICsgZXh0ZW5zaW9uICsgJyQnKTtcblxuXHRcdGZvciAoY29uc3QgcGF0aCBvZiBpbnB1dClcblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBnbG9iLnN5bmMocGF0aCkpIHtcblx0XHRcdFx0aWYgKGZpbGUubWF0Y2gobWF0aEV4cHJlc3Npb24pKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSW1hZ2Uge1xuXHRpbnB1dDogc3RyaW5nW107XG5cdG91dHB1dDogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQnVpbGQge1xuXHRuYW1lOiBzdHJpbmc7XG5cdG91dERpcj86IHN0cmluZztcblx0b3V0RGlyVmVyc2lvbmluZz86IGJvb2xlYW47XG5cdG91dERpck5hbWU/OiBib29sZWFuO1xuXHRjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xuXHRqcz86IE1hdGVDb25maWdKU0NvbmZpZztcblx0dHM/OiBzdHJpbmc7XG5cblx0Y29uc3RydWN0b3IoX25hbWU6IHN0cmluZykge1xuXHRcdHRoaXMubmFtZSA9IF9uYW1lO1xuXHR9XG5cblx0c3RhdGljIHNldFVuZGVmaW5lZChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogdm9pZCB7XG5cdFx0aWYgKCFidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBidWlsZC5vdXREaXJWZXJzaW9uaW5nID0gZmFsc2U7XG5cblx0XHRpZiAoIWJ1aWxkLm91dERpck5hbWUpIGJ1aWxkLm91dERpck5hbWUgPSBmYWxzZTtcblxuXHRcdC8vIENTU1xuXG5cdFx0aWYgKGJ1aWxkLmNzcyA9PT0gdW5kZWZpbmVkKSBidWlsZC5jc3MgPSBuZXcgTWF0ZUNvbmZpZ0NTU0NvbmZpZygpO1xuXG5cdFx0TWF0ZUNvbmZpZ0NTU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuY3NzKTtcblxuXHRcdC8vIEpTXG5cblx0XHRpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZCkgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XG5cblx0XHRNYXRlQ29uZmlnSlNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmpzKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xuXHRvdXREaXJTdWZmaXg/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQ1NTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xuXHRtaW5pZnk/OiBib29sZWFuO1xuXHRzb3VyY2VNYXA/OiBib29sZWFuO1xuXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoY3NzOiBNYXRlQ29uZmlnQ1NTQ29uZmlnKTogdm9pZCB7XG5cdFx0aWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZCkgY3NzLm1pbmlmeSA9IHRydWU7XG5cblx0XHRpZiAoY3NzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKSBjc3Muc291cmNlTWFwID0gZmFsc2U7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdKU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcblx0bWluaWZ5PzogYm9vbGVhbjtcblx0c291cmNlTWFwPzogYm9vbGVhbjtcblx0ZGVjbGFyYXRpb24/OiBib29sZWFuO1xuXHR3ZWJDbGVhbj86IGJvb2xlYW47XG5cblx0c3RhdGljIHNldFVuZGVmaW5lZChqczogTWF0ZUNvbmZpZ0pTQ29uZmlnKTogdm9pZCB7XG5cdFx0aWYgKGpzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKSBqcy5taW5pZnkgPSB0cnVlO1xuXG5cdFx0aWYgKGpzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKSBqcy5zb3VyY2VNYXAgPSB0cnVlO1xuXG5cdFx0aWYgKGpzLmRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIGpzLmRlY2xhcmF0aW9uID0gdHJ1ZTtcblxuXHRcdGlmIChqcy53ZWJDbGVhbiA9PT0gdW5kZWZpbmVkKSBqcy53ZWJDbGVhbiA9IGZhbHNlO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRm9ybWF0dGVyQ29uZmlnIHtcblx0cGF0aDogc3RyaW5nIHwgc3RyaW5nW107XG59Il19
