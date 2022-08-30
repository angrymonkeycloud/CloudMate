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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEtBQUssU0FBUztZQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ3hELENBQUM7SUFDRiwwQkFBQztBQUFELENBVEEsQUFTQyxDQVR3QyxvQkFBb0IsR0FTNUQ7QUFUWSxrREFBbUI7QUFXaEM7SUFBd0Msc0NBQW9CO0lBQTVEOztJQWVBLENBQUM7SUFUTywrQkFBWSxHQUFuQixVQUFvQixFQUFzQjtRQUN6QyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBRTlDLElBQUksRUFBRSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQUUsRUFBRSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFFcEQsSUFBSSxFQUFFLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFBRSxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUV4RCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEtBQUssU0FBUztZQUFFLEVBQUUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3BELENBQUM7SUFDRix5QkFBQztBQUFELENBZkEsQUFlQyxDQWZ1QyxvQkFBb0IsR0FlM0Q7QUFmWSxnREFBa0I7QUFpQi9CO0lBQUE7SUFFQSxDQUFDO0lBQUQsZ0NBQUM7QUFBRCxDQUZBLEFBRUMsSUFBQTtBQUZZLDhEQUF5QiIsImZpbGUiOiJjb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5pbXBvcnQgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKTtcclxuaW1wb3J0IHsgY29zbWljb25maWdTeW5jIH0gZnJvbSAnY29zbWljb25maWcnO1xyXG5pbXBvcnQgeyBDb3NtaWNvbmZpZ1Jlc3VsdCB9IGZyb20gJ2Nvc21pY29uZmlnL2Rpc3QvdHlwZXMnO1xyXG5pbXBvcnQgKiBhcyB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWcge1xyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBfY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG5cclxuXHRuYW1lPzogc3RyaW5nO1xyXG5cdHZlcnNpb24/OiBzdHJpbmc7XHJcblx0ZmlsZXM6IE1hdGVDb25maWdGaWxlW107XHJcblx0YnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcclxuXHRpbWFnZXM/OiBNYXRlQ29uZmlnSW1hZ2VbXTtcclxuXHJcblx0cHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHsgfVxyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBnZXQgY29uZmlndXJhdGlvbkV4cGxvcmVyKCkge1xyXG5cdFx0aWYgKHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlciAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG5cclxuXHRcdHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlciA9IGNvc21pY29uZmlnU3luYygnbWF0ZWNvbmZpZycsIHtcclxuXHRcdFx0c2VhcmNoUGxhY2VzOiBbXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnJyxcclxuXHRcdFx0XHQnLm1hdGVjb25maWcuanNvbicsXHJcblx0XHRcdFx0Jy5tYXRlY29uZmlnLnlhbWwnLFxyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy55bWwnLFxyXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy5qcycsXHJcblx0XHRcdFx0J21hdGVjb25maWcuanNvbicsIC8vIERlcHJlY2F0ZWRcclxuXHRcdFx0XHQncGFja2FnZS5qc29uJyxcclxuXHRcdFx0XSxcclxuXHRcdFx0dHJhbnNmb3JtOiAocmVzdWx0KSA9PiB7XHJcblxyXG5cdFx0XHRcdGlmICghcmVzdWx0IHx8ICFyZXN1bHQuY29uZmlnKVxyXG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHJcblx0XHRcdFx0aWYgKHR5cGVvZiByZXN1bHQuY29uZmlnICE9PSAnb2JqZWN0JylcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgQ29uZmlnIGlzIG9ubHkgYWxsb3dlZCB0byBiZSBhbiBvYmplY3QsIGJ1dCByZWNlaXZlZCAke3R5cGVvZiByZXN1bHQuY29uZmlnfSBpbiBcIiR7cmVzdWx0LmZpbGVwYXRofVwiYCk7XHJcblxyXG5cdFx0XHRcdGlmIChyZXN1bHQuY29uZmlnLmZpbGVzKVxyXG5cdFx0XHRcdFx0cmVzdWx0LmNvbmZpZy5maWxlcy5mb3JFYWNoKChmaWxlSW5mbzogTWF0ZUNvbmZpZ0ZpbGUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlSW5mby5vdXRwdXQgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8ub3V0cHV0ID0gW2ZpbGVJbmZvLm91dHB1dF07XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLmlucHV0ID09PSBcInN0cmluZ1wiKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmlucHV0ID0gW2ZpbGVJbmZvLmlucHV0XTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICghZmlsZUluZm8uYnVpbGRzKVxyXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmZvLmJ1aWxkcyA9IFsnZGV2J107XHJcblx0XHRcdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBmaWxlSW5mby5idWlsZHMgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uYnVpbGRzID0gW2ZpbGVJbmZvLmJ1aWxkc107XHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYgKHJlc3VsdC5jb25maWcuaW1hZ2VzKVxyXG5cdFx0XHRcdFx0cmVzdWx0LmNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoZmlsZUluZm86IE1hdGVDb25maWdJbWFnZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLm91dHB1dCA9PT0gXCJzdHJpbmdcIilcclxuXHRcdFx0XHRcdFx0XHRmaWxlSW5mby5vdXRwdXQgPSBbZmlsZUluZm8ub3V0cHV0XTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8uaW5wdXQgPT09IFwic3RyaW5nXCIpXHJcblx0XHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGRlbGV0ZSByZXN1bHQuY29uZmlnLiRzY2hlbWE7XHJcblxyXG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGdldCBhdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZSgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZXhwbG9yZXIgPSB0aGlzLmNvbmZpZ3VyYXRpb25FeHBsb3JlcjtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBleHBsb3Jlci5zZWFyY2goKTtcclxuXHRcdFx0cmV0dXJuIHJlc3VsdC5maWxlcGF0aDtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZmlsZSB3YXMgbm90IGZvdW5kLicpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0c3RhdGljIGdldCgpOiBNYXRlQ29uZmlnIHtcclxuXHRcdGNvbnN0IGNvbmZpZ3VyYXRpb25GaWxlID0gTWF0ZUNvbmZpZy5hdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZTtcclxuXHJcblx0XHRpZiAoIWNvbmZpZ3VyYXRpb25GaWxlKVxyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHJcblx0XHRsZXQgY29uZmlnSnNvbjogTWF0ZUNvbmZpZztcclxuXHJcblx0XHRjb25zdCByZXN1bHQ6IENvc21pY29uZmlnUmVzdWx0ID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXIubG9hZChjb25maWd1cmF0aW9uRmlsZSk7XHJcblx0XHRjb25maWdKc29uID0gcmVzdWx0LmNvbmZpZztcclxuXHJcblx0XHRpZiAoIWNvbmZpZ0pzb24pXHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignRXJyb3IgcGFyc2luZyBjb25maWd1cmF0aW9uIGZpbGUuJyk7XHJcblxyXG5cdFx0bGV0IGNvbmZpZyA9IG5ldyBNYXRlQ29uZmlnKCk7XHJcblxyXG5cdFx0Y29uZmlnLm5hbWUgPSBjb25maWdKc29uLm5hbWU7XHJcblx0XHRjb25maWcudmVyc2lvbiA9IGNvbmZpZ0pzb24udmVyc2lvbjtcclxuXHRcdGNvbmZpZy5maWxlcyA9IGNvbmZpZ0pzb24uZmlsZXM7XHJcblx0XHRjb25maWcuaW1hZ2VzID0gY29uZmlnSnNvbi5pbWFnZXM7XHJcblx0XHRjb25maWcuYnVpbGRzID0gY29uZmlnSnNvbi5idWlsZHMgPz8gW107XHJcblxyXG5cdFx0Ly8gVFMgQ29uZmlnXHJcblxyXG5cdFx0Y29uc3QgdHNDb25maWdQYXRoID0gdHMuZmluZENvbmZpZ0ZpbGUoXCIuL1wiLCB0cy5zeXMuZmlsZUV4aXN0cywgXCJ0c2NvbmZpZy5qc29uXCIpO1xyXG5cclxuXHRcdGlmICh0c0NvbmZpZ1BhdGgpXHJcblx0XHRcdGNvbmZpZy5idWlsZHMuZm9yRWFjaCgoYnVpbGQpID0+IHtcclxuXHRcdFx0XHRpZiAoIWJ1aWxkLnRzKVxyXG5cdFx0XHRcdFx0YnVpbGQudHMgPSB0c0NvbmZpZ1BhdGg7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdGNvbmZpZy5zZXRVbmRlZmluZWQoKTtcclxuXHRcdHJldHVybiBjb25maWc7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcclxuXHRwcml2YXRlIHNldFBhY2thZ2UoKSB7XHJcblx0XHR0aGlzLnBhY2thZ2UgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJykudG9TdHJpbmcoKSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFBhY2thZ2VJbmZvKGluZm86IHN0cmluZykge1xyXG5cclxuXHRcdGlmICghdGhpcy5wYWNrYWdlKVxyXG5cdFx0XHR0aGlzLnNldFBhY2thZ2UoKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5wYWNrYWdlW2luZm9dO1xyXG5cdH1cclxuXHJcblx0Z2V0T3V0RGlyTmFtZSgpOiBzdHJpbmcge1xyXG5cclxuXHRcdGlmICh0aGlzLm5hbWUpXHJcblx0XHRcdHJldHVybiB0aGlzLm5hbWU7XHJcblxyXG5cdFx0aWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKTtcclxuXHJcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0Z2V0T3V0RGlyVmVyc2lvbigpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHRoaXMudmVyc2lvbikgcmV0dXJuIHRoaXMudmVyc2lvbjtcclxuXHJcblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpKSByZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpO1xyXG5cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRnZXRCdWlsZChuYW1lOiBzdHJpbmcpOiBNYXRlQ29uZmlnQnVpbGQge1xyXG5cdFx0aWYgKG5hbWUgPT09IHVuZGVmaW5lZCB8fCBuYW1lID09PSBudWxsIHx8IG5hbWUgPT09ICcnKSBuYW1lID0gJ2Rldic7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBidWlsZCBvZiB0aGlzLmJ1aWxkcykgaWYgKGJ1aWxkLm5hbWUgPT09IG5hbWUpIHJldHVybiBidWlsZDtcclxuXHR9XHJcblxyXG5cdHNldFVuZGVmaW5lZCgpOiB2b2lkIHtcclxuXHRcdC8vIEJ1aWxkc1xyXG5cclxuXHRcdGxldCBkZXZCdWlsZEV4aXN0cyA9IGZhbHNlO1xyXG5cclxuXHRcdHRoaXMuYnVpbGRzLmZvckVhY2goKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpID0+IHtcclxuXHRcdFx0aWYgKGJ1aWxkLm5hbWUgPT09ICdkZXYnKSBkZXZCdWlsZEV4aXN0cyA9IHRydWU7XHJcblxyXG5cdFx0XHRNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGJ1aWxkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICghZGV2QnVpbGRFeGlzdHMpIHtcclxuXHRcdFx0Y29uc3QgZGV2QnVpbGQgPSBuZXcgTWF0ZUNvbmZpZ0J1aWxkKCdkZXYnKTtcclxuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChkZXZCdWlsZCk7XHJcblxyXG5cdFx0XHR0aGlzLmJ1aWxkcy5wdXNoKGRldkJ1aWxkKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRmlsZSB7XHJcblx0aW5wdXQ6IHN0cmluZ1tdO1xyXG5cdG91dHB1dDogc3RyaW5nW107XHJcblx0YnVpbGRzPzogc3RyaW5nW107XHJcblxyXG5cdHN0YXRpYyBoYXNFeHRlbnNpb24oaW5wdXQ6IHN0cmluZ1tdLCBleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbWF0aEV4cHJlc3Npb24gPSBuZXcgUmVnRXhwKCdcXFxcLicgKyBleHRlbnNpb24gKyAnJCcpO1xyXG5cclxuXHRcdGZvciAoY29uc3QgcGF0aCBvZiBpbnB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIGdsb2Iuc3luYyhwYXRoKSkge1xyXG5cdFx0XHRcdGlmIChmaWxlLm1hdGNoKG1hdGhFeHByZXNzaW9uKSlcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdJbWFnZSB7XHJcblx0aW5wdXQ6IHN0cmluZ1tdO1xyXG5cdG91dHB1dDogc3RyaW5nW107XHJcblx0bWF4V2lkdGg/OiBudW1iZXI7XHJcblx0bWF4SGVpZ2h0PzogbnVtYmVyO1xyXG5cdG91dHB1dEZvcm1hdD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZCB7XHJcblx0bmFtZTogc3RyaW5nO1xyXG5cdG91dERpcj86IHN0cmluZztcclxuXHRvdXREaXJWZXJzaW9uaW5nPzogYm9vbGVhbjtcclxuXHRvdXREaXJOYW1lPzogYm9vbGVhbjtcclxuXHRjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xyXG5cdGpzPzogTWF0ZUNvbmZpZ0pTQ29uZmlnO1xyXG5cdHRzPzogc3RyaW5nO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcblx0XHR0aGlzLm5hbWUgPSBfbmFtZTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xyXG5cdFx0aWYgKCFidWlsZC5vdXREaXJWZXJzaW9uaW5nKSBidWlsZC5vdXREaXJWZXJzaW9uaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0aWYgKCFidWlsZC5vdXREaXJOYW1lKSBidWlsZC5vdXREaXJOYW1lID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gQ1NTXHJcblxyXG5cdFx0aWYgKGJ1aWxkLmNzcyA9PT0gdW5kZWZpbmVkKSBidWlsZC5jc3MgPSBuZXcgTWF0ZUNvbmZpZ0NTU0NvbmZpZygpO1xyXG5cclxuXHRcdE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XHJcblxyXG5cdFx0Ly8gSlNcclxuXHJcblx0XHRpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZCkgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XHJcblxyXG5cdFx0TWF0ZUNvbmZpZ0pTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5qcyk7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cdG91dERpclN1ZmZpeD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdDU1NDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XHJcblx0bWluaWZ5PzogYm9vbGVhbjtcclxuXHRzb3VyY2VNYXA/OiBib29sZWFuO1xyXG5cclxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xyXG5cdFx0aWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZCkgY3NzLm1pbmlmeSA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGNzcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZCkgY3NzLnNvdXJjZU1hcCA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdKU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHRtaW5pZnk/OiBib29sZWFuO1xyXG5cdHNvdXJjZU1hcD86IGJvb2xlYW47XHJcblx0ZGVjbGFyYXRpb24/OiBib29sZWFuO1xyXG5cdHdlYkNsZWFuPzogYm9vbGVhbjtcclxuXHJcblx0c3RhdGljIHNldFVuZGVmaW5lZChqczogTWF0ZUNvbmZpZ0pTQ29uZmlnKTogdm9pZCB7XHJcblx0XHRpZiAoanMubWluaWZ5ID09PSB1bmRlZmluZWQpIGpzLm1pbmlmeSA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGpzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKSBqcy5zb3VyY2VNYXAgPSB0cnVlO1xyXG5cclxuXHRcdGlmIChqcy5kZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBqcy5kZWNsYXJhdGlvbiA9IHRydWU7XHJcblxyXG5cdFx0aWYgKGpzLndlYkNsZWFuID09PSB1bmRlZmluZWQpIGpzLndlYkNsZWFuID0gZmFsc2U7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Zvcm1hdHRlckNvbmZpZyB7XHJcblx0cGF0aDogc3RyaW5nIHwgc3RyaW5nW107XHJcbn0iXX0=
