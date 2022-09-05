"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MateConfigFormatterConfig = exports.MateConfigJSConfig = exports.MateConfigCSSConfig = exports.MateConfigBaseConfig = exports.MateConfigBuild = exports.MateConfigImage = exports.MateConfigFile = exports.MateConfig = void 0;
var fs = require("fs");
var glob = require("glob");
var cosmiconfig_1 = require("cosmiconfig");
var ts = __importStar(require("typescript"));
var MateConfig = (function () {
    function MateConfig() {
    }
    Object.defineProperty(MateConfig, "configurationExplorer", {
        get: function () {
            if (this._configurationExplorer !== undefined)
                return this._configurationExplorer;
            this._configurationExplorer = (0, cosmiconfig_1.cosmiconfigSync)('mateconfig', {
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
                        throw new Error("Config is only allowed to be an object, but received ".concat(typeof result.config, " in \"").concat(result.filepath, "\""));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksR0FBRyxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDeEQsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0FUQSxBQVNDLENBVHdDLG9CQUFvQixHQVM1RDtBQVRZLGtEQUFtQjtBQVdoQztJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBZUEsQ0FBQztJQVRPLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBQ3pDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFOUMsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUVwRCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXhELElBQUksRUFBRSxDQUFDLFFBQVEsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDcEQsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FmQSxBQWVDLENBZnVDLG9CQUFvQixHQWUzRDtBQWZZLGdEQUFrQjtBQWlCL0I7SUFBQTtJQUVBLENBQUM7SUFBRCxnQ0FBQztBQUFELENBRkEsQUFFQyxJQUFBO0FBRlksOERBQXlCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xyXG5pbXBvcnQgeyBjb3NtaWNvbmZpZ1N5bmMgfSBmcm9tICdjb3NtaWNvbmZpZyc7XHJcbmltcG9ydCB7IENvc21pY29uZmlnUmVzdWx0IH0gZnJvbSAnY29zbWljb25maWcvZGlzdC90eXBlcyc7XHJcbmltcG9ydCAqIGFzIHRzIGZyb20gXCJ0eXBlc2NyaXB0XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZyB7XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIF9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG5cdG5hbWU/OiBzdHJpbmc7XHJcblx0dmVyc2lvbj86IHN0cmluZztcclxuXHRmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcclxuXHRidWlsZHM6IE1hdGVDb25maWdCdWlsZFtdO1xyXG5cdGltYWdlcz86IE1hdGVDb25maWdJbWFnZVtdO1xyXG5cclxuXHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGdldCBjb25maWd1cmF0aW9uRXhwbG9yZXIoKSB7XHJcblx0XHRpZiAodGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyICE9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG5cdFx0dGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyID0gY29zbWljb25maWdTeW5jKCdtYXRlY29uZmlnJywge1xyXG5cdFx0XHRzZWFyY2hQbGFjZXM6IFtcclxuXHRcdFx0XHQnLm1hdGVjb25maWcnLFxyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy5qc29uJyxcclxuXHRcdFx0XHQnLm1hdGVjb25maWcueWFtbCcsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLnltbCcsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzJyxcclxuXHRcdFx0XHQnbWF0ZWNvbmZpZy5qc29uJywgLy8gRGVwcmVjYXRlZFxyXG5cdFx0XHRcdCdwYWNrYWdlLmpzb24nLFxyXG5cdFx0XHRdLFxyXG5cdFx0XHR0cmFuc2Zvcm06IChyZXN1bHQpID0+IHtcclxuXHJcblx0XHRcdFx0aWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5jb25maWcpXHJcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHRcdFx0XHRpZiAodHlwZW9mIHJlc3VsdC5jb25maWcgIT09ICdvYmplY3QnKVxyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWcgaXMgb25seSBhbGxvd2VkIHRvIGJlIGFuIG9iamVjdCwgYnV0IHJlY2VpdmVkICR7dHlwZW9mIHJlc3VsdC5jb25maWd9IGluIFwiJHtyZXN1bHQuZmlsZXBhdGh9XCJgKTtcclxuXHJcblx0XHRcdFx0aWYgKHJlc3VsdC5jb25maWcuZmlsZXMpXHJcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLm91dHB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5vdXRwdXQgPSBbZmlsZUluZm8ub3V0cHV0XTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8uaW5wdXQgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKCFmaWxlSW5mby5idWlsZHMpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uYnVpbGRzID0gWydkZXYnXTtcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGZpbGVJbmZvLmJ1aWxkcyA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbZmlsZUluZm8uYnVpbGRzXTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRpZiAocmVzdWx0LmNvbmZpZy5pbWFnZXMpXHJcblx0XHRcdFx0XHRyZXN1bHQuY29uZmlnLmltYWdlcy5mb3JFYWNoKChmaWxlSW5mbzogTWF0ZUNvbmZpZ0ltYWdlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLm91dHB1dCA9IFtmaWxlSW5mby5vdXRwdXRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5pbnB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5pbnB1dCA9IFtmaWxlSW5mby5pbnB1dF07XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0ZGVsZXRlIHJlc3VsdC5jb25maWcuJHNjaGVtYTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZ2V0IGF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlKCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBleHBsb3JlciA9IHRoaXMuY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGV4cGxvcmVyLnNlYXJjaCgpO1xyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LmZpbGVwYXRoO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIHdhcyBub3QgZm91bmQuJyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZ2V0KCk6IE1hdGVDb25maWcge1xyXG5cdFx0Y29uc3QgY29uZmlndXJhdGlvbkZpbGUgPSBNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlO1xyXG5cclxuXHRcdGlmICghY29uZmlndXJhdGlvbkZpbGUpXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cclxuXHRcdGxldCBjb25maWdKc29uOiBNYXRlQ29uZmlnO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdDogQ29zbWljb25maWdSZXN1bHQgPSB0aGlzLmNvbmZpZ3VyYXRpb25FeHBsb3Jlci5sb2FkKGNvbmZpZ3VyYXRpb25GaWxlKTtcclxuXHRcdGNvbmZpZ0pzb24gPSByZXN1bHQuY29uZmlnO1xyXG5cclxuXHRcdGlmICghY29uZmlnSnNvbilcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciBwYXJzaW5nIGNvbmZpZ3VyYXRpb24gZmlsZS4nKTtcclxuXHJcblx0XHRsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoKTtcclxuXHJcblx0XHRjb25maWcubmFtZSA9IGNvbmZpZ0pzb24ubmFtZTtcclxuXHRcdGNvbmZpZy52ZXJzaW9uID0gY29uZmlnSnNvbi52ZXJzaW9uO1xyXG5cdFx0Y29uZmlnLmZpbGVzID0gY29uZmlnSnNvbi5maWxlcztcclxuXHRcdGNvbmZpZy5pbWFnZXMgPSBjb25maWdKc29uLmltYWdlcztcclxuXHRcdGNvbmZpZy5idWlsZHMgPSBjb25maWdKc29uLmJ1aWxkcyA/PyBbXTtcclxuXHJcblx0XHQvLyBUUyBDb25maWdcclxuXHJcblx0XHRjb25zdCB0c0NvbmZpZ1BhdGggPSB0cy5maW5kQ29uZmlnRmlsZShcIi4vXCIsIHRzLnN5cy5maWxlRXhpc3RzLCBcInRzY29uZmlnLmpzb25cIik7XHJcblxyXG5cdFx0aWYgKHRzQ29uZmlnUGF0aClcclxuXHRcdFx0Y29uZmlnLmJ1aWxkcy5mb3JFYWNoKChidWlsZCkgPT4ge1xyXG5cdFx0XHRcdGlmICghYnVpbGQudHMpXHJcblx0XHRcdFx0XHRidWlsZC50cyA9IHRzQ29uZmlnUGF0aDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0Y29uZmlnLnNldFVuZGVmaW5lZCgpO1xyXG5cdFx0cmV0dXJuIGNvbmZpZztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcGFja2FnZTogb2JqZWN0O1xyXG5cdHByaXZhdGUgc2V0UGFja2FnZSgpIHtcclxuXHRcdHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0UGFja2FnZUluZm8oaW5mbzogc3RyaW5nKSB7XHJcblxyXG5cdFx0aWYgKCF0aGlzLnBhY2thZ2UpXHJcblx0XHRcdHRoaXMuc2V0UGFja2FnZSgpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLnBhY2thZ2VbaW5mb107XHJcblx0fVxyXG5cclxuXHRnZXRPdXREaXJOYW1lKCk6IHN0cmluZyB7XHJcblxyXG5cdFx0aWYgKHRoaXMubmFtZSlcclxuXHRcdFx0cmV0dXJuIHRoaXMubmFtZTtcclxuXHJcblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpO1xyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XHJcblx0XHRpZiAodGhpcy52ZXJzaW9uKSByZXR1cm4gdGhpcy52ZXJzaW9uO1xyXG5cclxuXHRcdGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJykpIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJyk7XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGdldEJ1aWxkKG5hbWU6IHN0cmluZyk6IE1hdGVDb25maWdCdWlsZCB7XHJcblx0XHRpZiAobmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gJycpIG5hbWUgPSAnZGV2JztcclxuXHJcblx0XHRmb3IgKGNvbnN0IGJ1aWxkIG9mIHRoaXMuYnVpbGRzKSBpZiAoYnVpbGQubmFtZSA9PT0gbmFtZSkgcmV0dXJuIGJ1aWxkO1xyXG5cdH1cclxuXHJcblx0c2V0VW5kZWZpbmVkKCk6IHZvaWQge1xyXG5cdFx0Ly8gQnVpbGRzXHJcblxyXG5cdFx0bGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5idWlsZHMuZm9yRWFjaCgoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCkgPT4ge1xyXG5cdFx0XHRpZiAoYnVpbGQubmFtZSA9PT0gJ2RldicpIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcclxuXHJcblx0XHRcdE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoYnVpbGQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKCFkZXZCdWlsZEV4aXN0cykge1xyXG5cdFx0XHRjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xyXG5cdFx0XHRNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcclxuXHJcblx0XHRcdHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdGaWxlIHtcclxuXHRpbnB1dDogc3RyaW5nW107XHJcblx0b3V0cHV0OiBzdHJpbmdbXTtcclxuXHRidWlsZHM/OiBzdHJpbmdbXTtcclxuXHJcblx0c3RhdGljIGhhc0V4dGVuc2lvbihpbnB1dDogc3RyaW5nW10sIGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBtYXRoRXhwcmVzc2lvbiA9IG5ldyBSZWdFeHAoJ1xcXFwuJyArIGV4dGVuc2lvbiArICckJyk7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBwYXRoIG9mIGlucHV0KVxyXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZ2xvYi5zeW5jKHBhdGgpKSB7XHJcblx0XHRcdFx0aWYgKGZpbGUubWF0Y2gobWF0aEV4cHJlc3Npb24pKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ltYWdlIHtcclxuXHRpbnB1dDogc3RyaW5nW107XHJcblx0b3V0cHV0OiBzdHJpbmdbXTtcclxuXHRtYXhXaWR0aD86IG51bWJlcjtcclxuXHRtYXhIZWlnaHQ/OiBudW1iZXI7XHJcblx0b3V0cHV0Rm9ybWF0Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0J1aWxkIHtcclxuXHRuYW1lOiBzdHJpbmc7XHJcblx0b3V0RGlyPzogc3RyaW5nO1xyXG5cdG91dERpclZlcnNpb25pbmc/OiBib29sZWFuO1xyXG5cdG91dERpck5hbWU/OiBib29sZWFuO1xyXG5cdGNzcz86IE1hdGVDb25maWdDU1NDb25maWc7XHJcblx0anM/OiBNYXRlQ29uZmlnSlNDb25maWc7XHJcblx0dHM/OiBzdHJpbmc7XHJcblxyXG5cdGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMubmFtZSA9IF9uYW1lO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIHNldFVuZGVmaW5lZChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogdm9pZCB7XHJcblx0XHRpZiAoIWJ1aWxkLm91dERpclZlcnNpb25pbmcpIGJ1aWxkLm91dERpclZlcnNpb25pbmcgPSBmYWxzZTtcclxuXHJcblx0XHRpZiAoIWJ1aWxkLm91dERpck5hbWUpIGJ1aWxkLm91dERpck5hbWUgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBDU1NcclxuXHJcblx0XHRpZiAoYnVpbGQuY3NzID09PSB1bmRlZmluZWQpIGJ1aWxkLmNzcyA9IG5ldyBNYXRlQ29uZmlnQ1NTQ29uZmlnKCk7XHJcblxyXG5cdFx0TWF0ZUNvbmZpZ0NTU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuY3NzKTtcclxuXHJcblx0XHQvLyBKU1xyXG5cclxuXHRcdGlmIChidWlsZC5qcyA9PT0gdW5kZWZpbmVkKSBidWlsZC5qcyA9IG5ldyBNYXRlQ29uZmlnSlNDb25maWcoKTtcclxuXHJcblx0XHRNYXRlQ29uZmlnSlNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmpzKTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XHJcblx0b3V0RGlyU3VmZml4Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0NTU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHRtaW5pZnk/OiBib29sZWFuO1xyXG5cdHNvdXJjZU1hcD86IGJvb2xlYW47XHJcblxyXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoY3NzOiBNYXRlQ29uZmlnQ1NTQ29uZmlnKTogdm9pZCB7XHJcblx0XHRpZiAoY3NzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKSBjc3MubWluaWZ5ID0gdHJ1ZTtcclxuXHJcblx0XHRpZiAoY3NzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKSBjc3Muc291cmNlTWFwID0gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0pTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cdG1pbmlmeT86IGJvb2xlYW47XHJcblx0c291cmNlTWFwPzogYm9vbGVhbjtcclxuXHRkZWNsYXJhdGlvbj86IGJvb2xlYW47XHJcblx0d2ViQ2xlYW4/OiBib29sZWFuO1xyXG5cclxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGpzOiBNYXRlQ29uZmlnSlNDb25maWcpOiB2b2lkIHtcclxuXHRcdGlmIChqcy5taW5pZnkgPT09IHVuZGVmaW5lZCkganMubWluaWZ5ID0gdHJ1ZTtcclxuXHJcblx0XHRpZiAoanMuc291cmNlTWFwID09PSB1bmRlZmluZWQpIGpzLnNvdXJjZU1hcCA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGpzLmRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIGpzLmRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuXHJcblx0XHRpZiAoanMud2ViQ2xlYW4gPT09IHVuZGVmaW5lZCkganMud2ViQ2xlYW4gPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRm9ybWF0dGVyQ29uZmlnIHtcclxuXHRwYXRoOiBzdHJpbmcgfCBzdHJpbmdbXTtcclxufSJdfQ==
