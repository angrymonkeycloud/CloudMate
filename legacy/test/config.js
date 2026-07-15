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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        if (config.files) {
            config.files.forEach(function (file) {
                if (typeof file.input === 'string')
                    file.input = [file.input];
                if (typeof file.output === 'string')
                    file.output = [file.output];
                if (!file.output)
                    file.output = [];
                if (!file.input)
                    file.input = [];
                if (typeof file.builds === 'string')
                    file.builds = [file.builds];
                if (!file.builds)
                    file.builds = ['dev'];
            });
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVCQUEwQjtBQUMxQiwyQkFBOEI7QUFDOUIsMkNBQThDO0FBRTlDLDZDQUFpQztBQUVqQztJQVVDO0lBQXdCLENBQUM7SUFFekIsc0JBQW1CLG1DQUFxQjthQUF4QztZQUNDLElBQUksSUFBSSxDQUFDLHNCQUFzQixLQUFLLFNBQVM7Z0JBQUUsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUM7WUFFbEYsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUEsNkJBQWUsRUFBQyxZQUFZLEVBQUU7Z0JBQzNELFlBQVksRUFBRTtvQkFDYixhQUFhO29CQUNiLGtCQUFrQjtvQkFDbEIsa0JBQWtCO29CQUNsQixpQkFBaUI7b0JBQ2pCLGdCQUFnQjtvQkFDaEIsaUJBQWlCO29CQUNqQixjQUFjO2lCQUNkO2dCQUNELFNBQVMsRUFBRSxVQUFDLE1BQU07b0JBRWpCLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTt3QkFDNUIsT0FBTyxNQUFNLENBQUM7b0JBRWYsSUFBSSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEtBQUssUUFBUTt3QkFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQywrREFBd0QsT0FBTyxNQUFNLENBQUMsTUFBTSxtQkFBUSxNQUFNLENBQUMsUUFBUSxPQUFHLENBQUMsQ0FBQztvQkFFekgsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUs7d0JBQ3RCLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFDLFFBQXdCOzRCQUNwRCxJQUFJLE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxRQUFRO2dDQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxD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O1FBQ3pDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFOUMsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUVwRCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBRXhELElBQUksRUFBRSxDQUFDLFFBQVEsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDcEQsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FBQyxBQWZELENBQXdDLG9CQUFvQixHQWUzRDtBQWZZLGdEQUFrQjtBQWlCL0I7SUFBQTtJQUVBLENBQUM7SUFBRCxnQ0FBQztBQUFELENBQUMsQUFGRCxJQUVDO0FBRlksOERBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XHJcbmltcG9ydCB7IGNvc21pY29uZmlnU3luYyB9IGZyb20gJ2Nvc21pY29uZmlnJztcclxuaW1wb3J0IHsgQ29zbWljb25maWdSZXN1bHQgfSBmcm9tICdjb3NtaWNvbmZpZy9kaXN0L3R5cGVzJztcclxuaW1wb3J0ICogYXMgdHMgZnJvbSBcInR5cGVzY3JpcHRcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnIHtcclxuXHJcblx0cHJpdmF0ZSBzdGF0aWMgX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcclxuXHJcblx0bmFtZT86IHN0cmluZztcclxuXHR2ZXJzaW9uPzogc3RyaW5nO1xyXG5cdGZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdO1xyXG5cdGJ1aWxkczogTWF0ZUNvbmZpZ0J1aWxkW107XHJcblx0aW1hZ2VzPzogTWF0ZUNvbmZpZ0ltYWdlW107XHJcblxyXG5cdHByaXZhdGUgY29uc3RydWN0b3IoKSB7IH1cclxuXHJcblx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGNvbmZpZ3VyYXRpb25FeHBsb3JlcigpIHtcclxuXHRcdGlmICh0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXIgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcclxuXHJcblx0XHR0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXIgPSBjb3NtaWNvbmZpZ1N5bmMoJ21hdGVjb25maWcnLCB7XHJcblx0XHRcdHNlYXJjaFBsYWNlczogW1xyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZycsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzb24nLFxyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy55YW1sJyxcclxuXHRcdFx0XHQnLm1hdGVjb25maWcueW1sJyxcclxuXHRcdFx0XHQnLm1hdGVjb25maWcuanMnLFxyXG5cdFx0XHRcdCdtYXRlY29uZmlnLmpzb24nLCAvLyBEZXByZWNhdGVkXHJcblx0XHRcdFx0J3BhY2thZ2UuanNvbicsXHJcblx0XHRcdF0sXHJcblx0XHRcdHRyYW5zZm9ybTogKHJlc3VsdCkgPT4ge1xyXG5cclxuXHRcdFx0XHRpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LmNvbmZpZylcclxuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XHJcblxyXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzdWx0LmNvbmZpZyAhPT0gJ29iamVjdCcpXHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENvbmZpZyBpcyBvbmx5IGFsbG93ZWQgdG8gYmUgYW4gb2JqZWN0LCBidXQgcmVjZWl2ZWQgJHt0eXBlb2YgcmVzdWx0LmNvbmZpZ30gaW4gXCIke3Jlc3VsdC5maWxlcGF0aH1cImApO1xyXG5cclxuXHRcdFx0XHRpZiAocmVzdWx0LmNvbmZpZy5maWxlcylcclxuXHRcdFx0XHRcdHJlc3VsdC5jb25maWcuZmlsZXMuZm9yRWFjaCgoZmlsZUluZm86IE1hdGVDb25maWdGaWxlKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLm91dHB1dCA9IFtmaWxlSW5mby5vdXRwdXRdO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5pbnB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5pbnB1dCA9IFtmaWxlSW5mby5pbnB1dF07XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoIWZpbGVJbmZvLmJ1aWxkcylcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbJ2RldiddO1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgZmlsZUluZm8uYnVpbGRzID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmJ1aWxkcyA9IFtmaWxlSW5mby5idWlsZHNdO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGlmIChyZXN1bHQuY29uZmlnLmltYWdlcylcclxuXHRcdFx0XHRcdHJlc3VsdC5jb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnSW1hZ2UpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5vdXRwdXQgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8ub3V0cHV0ID0gW2ZpbGVJbmZvLm91dHB1dF07XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLmlucHV0ID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmlucHV0ID0gW2ZpbGVJbmZvLmlucHV0XTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRkZWxldGUgcmVzdWx0LmNvbmZpZy4kc2NoZW1hO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBnZXQgYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGUoKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGV4cGxvcmVyID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZXhwbG9yZXIuc2VhcmNoKCk7XHJcblx0XHRcdHJldHVybiByZXN1bHQuZmlsZXBhdGg7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIGZpbGUgd2FzIG5vdCBmb3VuZC4nKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHN0YXRpYyBnZXQoKTogTWF0ZUNvbmZpZyB7XHJcblx0XHRjb25zdCBjb25maWd1cmF0aW9uRmlsZSA9IE1hdGVDb25maWcuYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGU7XHJcblxyXG5cdFx0aWYgKCFjb25maWd1cmF0aW9uRmlsZSlcclxuXHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0bGV0IGNvbmZpZ0pzb246IE1hdGVDb25maWc7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0OiBDb3NtaWNvbmZpZ1Jlc3VsdCA9IHRoaXMuY29uZmlndXJhdGlvbkV4cGxvcmVyLmxvYWQoY29uZmlndXJhdGlvbkZpbGUpO1xyXG5cdFx0Y29uZmlnSnNvbiA9IHJlc3VsdC5jb25maWc7XHJcblxyXG5cdFx0aWYgKCFjb25maWdKc29uKVxyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yIHBhcnNpbmcgY29uZmlndXJhdGlvbiBmaWxlLicpO1xyXG5cclxuXHRcdGxldCBjb25maWcgPSBuZXcgTWF0ZUNvbmZpZygpO1xyXG5cclxuXHRcdGNvbmZpZy5uYW1lID0gY29uZmlnSnNvbi5uYW1lO1xyXG5cdFx0Y29uZmlnLnZlcnNpb24gPSBjb25maWdKc29uLnZlcnNpb247XHJcblx0XHRjb25maWcuZmlsZXMgPSBjb25maWdKc29uLmZpbGVzO1xyXG5cdFx0Y29uZmlnLmltYWdlcyA9IGNvbmZpZ0pzb24uaW1hZ2VzO1xyXG5cdFx0Y29uZmlnLmJ1aWxkcyA9IGNvbmZpZ0pzb24uYnVpbGRzID8/IFtdO1xyXG5cclxuXHRcdC8vIE5vcm1hbGl6ZSBmaWxlIGVudHJpZXM6IGlucHV0L291dHB1dC9idWlsZHMgbWF5IGJlIGEgc2luZ2xlIHN0cmluZyBpbiB0aGUgSlNPTlxyXG5cdFx0Ly8gKHRoZSBzaW5nbGUtb3ItYXJyYXkgc2hvcnRoYW5kKS4gV2l0aG91dCB0aGlzLCAuZm9yRWFjaCBvbiBhIHN0cmluZyBjcmFzaGVzIGF0IHJ1bnRpbWUuXHJcblx0XHRpZiAoY29uZmlnLmZpbGVzKSB7XHJcblx0XHRcdGNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblx0XHRcdFx0aWYgKHR5cGVvZiAoZmlsZS5pbnB1dCBhcyBhbnkpID09PSAnc3RyaW5nJykgZmlsZS5pbnB1dCA9IFtmaWxlLmlucHV0IGFzIGFueV07XHJcblx0XHRcdFx0aWYgKHR5cGVvZiAoZmlsZS5vdXRwdXQgYXMgYW55KSA9PT0gJ3N0cmluZycpIGZpbGUub3V0cHV0ID0gW2ZpbGUub3V0cHV0IGFzIGFueV07XHJcblx0XHRcdFx0aWYgKCFmaWxlLm91dHB1dCkgZmlsZS5vdXRwdXQgPSBbXTtcclxuXHRcdFx0XHRpZiAoIWZpbGUuaW5wdXQpIGZpbGUuaW5wdXQgPSBbXTtcclxuXHRcdFx0XHRpZiAodHlwZW9mIChmaWxlLmJ1aWxkcyBhcyBhbnkpID09PSAnc3RyaW5nJykgZmlsZS5idWlsZHMgPSBbZmlsZS5idWlsZHMgYXMgYW55XTtcclxuXHRcdFx0XHRpZiAoIWZpbGUuYnVpbGRzKSBmaWxlLmJ1aWxkcyA9IFsnZGV2J107XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRTIENvbmZpZ1xyXG5cclxuXHRcdGNvbnN0IHRzQ29uZmlnUGF0aCA9IHRzLmZpbmRDb25maWdGaWxlKFwiLi9cIiwgdHMuc3lzLmZpbGVFeGlzdHMsIFwidHNjb25maWcuanNvblwiKTtcclxuXHJcblx0XHRpZiAodHNDb25maWdQYXRoKVxyXG5cdFx0XHRjb25maWcuYnVpbGRzLmZvckVhY2goKGJ1aWxkKSA9PiB7XHJcblx0XHRcdFx0aWYgKCFidWlsZC50cylcclxuXHRcdFx0XHRcdGJ1aWxkLnRzID0gdHNDb25maWdQYXRoO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRjb25maWcuc2V0VW5kZWZpbmVkKCk7XHJcblx0XHRyZXR1cm4gY29uZmlnO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBwYWNrYWdlOiBvYmplY3Q7XHJcblx0cHJpdmF0ZSBzZXRQYWNrYWdlKCkge1xyXG5cdFx0dGhpcy5wYWNrYWdlID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicpLnRvU3RyaW5nKCkpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRQYWNrYWdlSW5mbyhpbmZvOiBzdHJpbmcpIHtcclxuXHJcblx0XHRpZiAoIXRoaXMucGFja2FnZSlcclxuXHRcdFx0dGhpcy5zZXRQYWNrYWdlKCk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcclxuXHR9XHJcblxyXG5cdGdldE91dERpck5hbWUoKTogc3RyaW5nIHtcclxuXHJcblx0XHRpZiAodGhpcy5uYW1lKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lO1xyXG5cclxuXHRcdGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJykpXHJcblx0XHRcdHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJyk7XHJcblxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdGdldE91dERpclZlcnNpb24oKTogc3RyaW5nIHtcclxuXHRcdGlmICh0aGlzLnZlcnNpb24pIHJldHVybiB0aGlzLnZlcnNpb247XHJcblxyXG5cdFx0aWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKSkgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKTtcclxuXHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0Z2V0QnVpbGQobmFtZTogc3RyaW5nKTogTWF0ZUNvbmZpZ0J1aWxkIHtcclxuXHRcdGlmIChuYW1lID09PSB1bmRlZmluZWQgfHwgbmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSAnJykgbmFtZSA9ICdkZXYnO1xyXG5cclxuXHRcdGZvciAoY29uc3QgYnVpbGQgb2YgdGhpcy5idWlsZHMpIGlmIChidWlsZC5uYW1lID09PSBuYW1lKSByZXR1cm4gYnVpbGQ7XHJcblx0fVxyXG5cclxuXHRzZXRVbmRlZmluZWQoKTogdm9pZCB7XHJcblx0XHQvLyBCdWlsZHNcclxuXHJcblx0XHRsZXQgZGV2QnVpbGRFeGlzdHMgPSBmYWxzZTtcclxuXHJcblx0XHR0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XHJcblx0XHRcdGlmIChidWlsZC5uYW1lID09PSAnZGV2JykgZGV2QnVpbGRFeGlzdHMgPSB0cnVlO1xyXG5cclxuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChidWlsZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoIWRldkJ1aWxkRXhpc3RzKSB7XHJcblx0XHRcdGNvbnN0IGRldkJ1aWxkID0gbmV3IE1hdGVDb25maWdCdWlsZCgnZGV2Jyk7XHJcblx0XHRcdE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoZGV2QnVpbGQpO1xyXG5cclxuXHRcdFx0dGhpcy5idWlsZHMucHVzaChkZXZCdWlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ZpbGUge1xyXG5cdGlucHV0OiBzdHJpbmdbXTtcclxuXHRvdXRwdXQ6IHN0cmluZ1tdO1xyXG5cdGJ1aWxkcz86IHN0cmluZ1tdO1xyXG5cclxuXHRzdGF0aWMgaGFzRXh0ZW5zaW9uKGlucHV0OiBzdHJpbmdbXSwgZXh0ZW5zaW9uOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdGNvbnN0IG1hdGhFeHByZXNzaW9uID0gbmV3IFJlZ0V4cCgnXFxcXC4nICsgZXh0ZW5zaW9uICsgJyQnKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHBhdGggb2YgaW5wdXQpXHJcblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBnbG9iLnN5bmMocGF0aCkpIHtcclxuXHRcdFx0XHRpZiAoZmlsZS5tYXRjaChtYXRoRXhwcmVzc2lvbikpXHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSW1hZ2Uge1xyXG5cdGlucHV0OiBzdHJpbmdbXTtcclxuXHRvdXRwdXQ6IHN0cmluZ1tdO1xyXG5cdG1heFdpZHRoPzogbnVtYmVyO1xyXG5cdG1heEhlaWdodD86IG51bWJlcjtcclxuXHRvdXRwdXRGb3JtYXQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQnVpbGQge1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRvdXREaXI/OiBzdHJpbmc7XHJcblx0b3V0RGlyVmVyc2lvbmluZz86IGJvb2xlYW47XHJcblx0b3V0RGlyTmFtZT86IGJvb2xlYW47XHJcblx0Y3NzPzogTWF0ZUNvbmZpZ0NTU0NvbmZpZztcclxuXHRqcz86IE1hdGVDb25maWdKU0NvbmZpZztcclxuXHR0cz86IHN0cmluZztcclxuXHJcblx0Y29uc3RydWN0b3IoX25hbWU6IHN0cmluZykge1xyXG5cdFx0dGhpcy5uYW1lID0gX25hbWU7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcclxuXHRcdGlmICghYnVpbGQub3V0RGlyVmVyc2lvbmluZykgYnVpbGQub3V0RGlyVmVyc2lvbmluZyA9IGZhbHNlO1xyXG5cclxuXHRcdGlmICghYnVpbGQub3V0RGlyTmFtZSkgYnVpbGQub3V0RGlyTmFtZSA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIENTU1xyXG5cclxuXHRcdGlmIChidWlsZC5jc3MgPT09IHVuZGVmaW5lZCkgYnVpbGQuY3NzID0gbmV3IE1hdGVDb25maWdDU1NDb25maWcoKTtcclxuXHJcblx0XHRNYXRlQ29uZmlnQ1NTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5jc3MpO1xyXG5cclxuXHRcdC8vIEpTXHJcblxyXG5cdFx0aWYgKGJ1aWxkLmpzID09PSB1bmRlZmluZWQpIGJ1aWxkLmpzID0gbmV3IE1hdGVDb25maWdKU0NvbmZpZygpO1xyXG5cclxuXHRcdE1hdGVDb25maWdKU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuanMpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHRvdXREaXJTdWZmaXg/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQ1NTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cdG1pbmlmeT86IGJvb2xlYW47XHJcblx0c291cmNlTWFwPzogYm9vbGVhbjtcclxuXHJcblx0c3RhdGljIHNldFVuZGVmaW5lZChjc3M6IE1hdGVDb25maWdDU1NDb25maWcpOiB2b2lkIHtcclxuXHRcdGlmIChjc3MubWluaWZ5ID09PSB1bmRlZmluZWQpIGNzcy5taW5pZnkgPSB0cnVlO1xyXG5cclxuXHRcdGlmIChjc3Muc291cmNlTWFwID09PSB1bmRlZmluZWQpIGNzcy5zb3VyY2VNYXAgPSBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSlNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XHJcblx0bWluaWZ5PzogYm9vbGVhbjtcclxuXHRzb3VyY2VNYXA/OiBib29sZWFuO1xyXG5cdGRlY2xhcmF0aW9uPzogYm9vbGVhbjtcclxuXHR3ZWJDbGVhbj86IGJvb2xlYW47XHJcblxyXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoanM6IE1hdGVDb25maWdKU0NvbmZpZyk6IHZvaWQge1xyXG5cdFx0aWYgKGpzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKSBqcy5taW5pZnkgPSB0cnVlO1xyXG5cclxuXHRcdGlmIChqcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZCkganMuc291cmNlTWFwID0gdHJ1ZTtcclxuXHJcblx0XHRpZiAoanMuZGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkganMuZGVjbGFyYXRpb24gPSB0cnVlO1xyXG5cclxuXHRcdGlmIChqcy53ZWJDbGVhbiA9PT0gdW5kZWZpbmVkKSBqcy53ZWJDbGVhbiA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdGb3JtYXR0ZXJDb25maWcge1xyXG5cdHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdO1xyXG59Il19