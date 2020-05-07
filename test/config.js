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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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O0FBQUQsQ0FmQSxBQWVDLENBZnVDLG9CQUFvQixHQWUzRDtBQWZZLGdEQUFrQjtBQWlCL0I7SUFBQTtJQUVBLENBQUM7SUFBRCxnQ0FBQztBQUFELENBRkEsQUFFQyxJQUFBO0FBRlksOERBQXlCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKTtcbmltcG9ydCB7IGNvc21pY29uZmlnU3luYyB9IGZyb20gJ2Nvc21pY29uZmlnJztcbmltcG9ydCB7IENvc21pY29uZmlnUmVzdWx0IH0gZnJvbSAnY29zbWljb25maWcvZGlzdC90eXBlcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZyB7XG5cblx0cHJpdmF0ZSBzdGF0aWMgX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcblxuXHRuYW1lPzogc3RyaW5nO1xuXHR2ZXJzaW9uPzogc3RyaW5nO1xuXHRmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcblx0YnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcblxuXHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XG5cblx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGNvbmZpZ3VyYXRpb25FeHBsb3JlcigpIHtcblx0XHRpZiAodGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyICE9PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XG5cblx0XHR0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXIgPSBjb3NtaWNvbmZpZ1N5bmMoJ21hdGVjb25maWcnLCB7XG5cdFx0XHRzZWFyY2hQbGFjZXM6IFtcblx0XHRcdFx0Jy5tYXRlY29uZmlnJyxcblx0XHRcdFx0Jy5tYXRlY29uZmlnLmpzb24nLFxuXHRcdFx0XHQnLm1hdGVjb25maWcueWFtbCcsXG5cdFx0XHRcdCcubWF0ZWNvbmZpZy55bWwnLFxuXHRcdFx0XHQnLm1hdGVjb25maWcuanMnLFxuXHRcdFx0XHQnbWF0ZWNvbmZpZy5qc29uJywgLy8gRGVwcmVjYXRlZFxuXHRcdFx0XHQncGFja2FnZS5qc29uJyxcblx0XHRcdF0sXG5cdFx0XHR0cmFuc2Zvcm06IChyZXN1bHQpID0+IHtcblxuXHRcdFx0XHRpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LmNvbmZpZylcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzdWx0LmNvbmZpZyAhPT0gJ29iamVjdCcpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBDb25maWcgaXMgb25seSBhbGxvd2VkIHRvIGJlIGFuIG9iamVjdCwgYnV0IHJlY2VpdmVkICR7dHlwZW9mIHJlc3VsdC5jb25maWd9IGluIFwiJHtyZXN1bHQuZmlsZXBhdGh9XCJgKTtcblxuXHRcdFx0XHRyZXN1bHQuY29uZmlnLmZpbGVzLmZvckVhY2goKGZpbGVJbmZvOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgZmlsZUluZm8ub3V0cHV0ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0ZmlsZUluZm8ub3V0cHV0ID0gW2ZpbGVJbmZvLm91dHB1dF07XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIGZpbGVJbmZvLmlucHV0ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0ZmlsZUluZm8uaW5wdXQgPSBbZmlsZUluZm8uaW5wdXRdO1xuXG5cdFx0XHRcdFx0aWYgKCFmaWxlSW5mby5idWlsZHMpXG5cdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbJ2RldiddO1xuXHRcdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBmaWxlSW5mby5idWlsZHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRmaWxlSW5mby5idWlsZHMgPSBbZmlsZUluZm8uYnVpbGRzXTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0ZGVsZXRlIHJlc3VsdC5jb25maWcuJHNjaGVtYTtcblxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XG5cdH1cblxuXHRzdGF0aWMgZ2V0IGF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlKCk6IHN0cmluZyB7XG5cdFx0Y29uc3QgZXhwbG9yZXIgPSB0aGlzLmNvbmZpZ3VyYXRpb25FeHBsb3JlcjtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBleHBsb3Jlci5zZWFyY2goKTtcblx0XHRcdHJldHVybiByZXN1bHQuZmlsZXBhdGg7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gZmlsZSB3YXMgbm90IGZvdW5kLicpO1xuXHRcdH1cblx0fVxuXG5cdHN0YXRpYyBnZXQoKTogTWF0ZUNvbmZpZyB7XG5cdFx0Y29uc3QgY29uZmlndXJhdGlvbkZpbGUgPSBNYXRlQ29uZmlnLmF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlO1xuXG5cdFx0aWYgKCFjb25maWd1cmF0aW9uRmlsZSlcblx0XHRcdHJldHVybiBudWxsO1xuXG5cdFx0bGV0IGNvbmZpZ0pzb246IE1hdGVDb25maWc7XG5cblx0XHRjb25zdCByZXN1bHQ6IENvc21pY29uZmlnUmVzdWx0ID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXIubG9hZChjb25maWd1cmF0aW9uRmlsZSk7XG5cdFx0Y29uZmlnSnNvbiA9IHJlc3VsdC5jb25maWc7XG5cblx0XHRpZiAoIWNvbmZpZ0pzb24pXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yIHBhcnNpbmcgY29uZmlndXJhdGlvbiBmaWxlLicpO1xuXG5cdFx0bGV0IGNvbmZpZyA9IG5ldyBNYXRlQ29uZmlnKCk7XG5cblx0XHRjb25maWcubmFtZSA9IGNvbmZpZ0pzb24ubmFtZTtcblx0XHRjb25maWcudmVyc2lvbiA9IGNvbmZpZ0pzb24udmVyc2lvbjtcblx0XHRjb25maWcuZmlsZXMgPSBjb25maWdKc29uLmZpbGVzO1xuXHRcdGNvbmZpZy5idWlsZHMgPSBjb25maWdKc29uLmJ1aWxkcyA/PyBbXTtcblxuXHRcdC8vIFRTIENvbmZpZ1xuXG5cdFx0Y29uc3QgdHNDb25maWdQYXRoID0gdHMuZmluZENvbmZpZ0ZpbGUoXCIuL1wiLCB0cy5zeXMuZmlsZUV4aXN0cywgXCJ0c2NvbmZpZy5qc29uXCIpO1xuXG5cdFx0aWYgKHRzQ29uZmlnUGF0aClcblx0XHRcdGNvbmZpZy5idWlsZHMuZm9yRWFjaCgoYnVpbGQpID0+IHtcblx0XHRcdFx0aWYgKCFidWlsZC50cylcblx0XHRcdFx0XHRidWlsZC50cyA9IHRzQ29uZmlnUGF0aDtcblx0XHRcdH0pO1xuXG5cdFx0Y29uZmlnLnNldFVuZGVmaW5lZCgpO1xuXHRcdHJldHVybiBjb25maWc7XG5cdH1cblxuXHRwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcblx0cHJpdmF0ZSBzZXRQYWNrYWdlKCkge1xuXHRcdHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcblx0fVxuXG5cdHByaXZhdGUgZ2V0UGFja2FnZUluZm8oaW5mbzogc3RyaW5nKSB7XG5cblx0XHRpZiAoIXRoaXMucGFja2FnZSlcblx0XHRcdHRoaXMuc2V0UGFja2FnZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcblx0fVxuXG5cdGdldE91dERpck5hbWUoKTogc3RyaW5nIHtcblxuXHRcdGlmICh0aGlzLm5hbWUpXG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lO1xuXG5cdFx0aWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcblx0XHRcdHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJyk7XG5cblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Z2V0T3V0RGlyVmVyc2lvbigpOiBzdHJpbmcge1xuXHRcdGlmICh0aGlzLnZlcnNpb24pIHJldHVybiB0aGlzLnZlcnNpb247XG5cblx0XHRpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpKSByZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpO1xuXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdGdldEJ1aWxkKG5hbWU6IHN0cmluZyk6IE1hdGVDb25maWdCdWlsZCB7XG5cdFx0aWYgKG5hbWUgPT09IHVuZGVmaW5lZCB8fCBuYW1lID09PSBudWxsIHx8IG5hbWUgPT09ICcnKSBuYW1lID0gJ2Rldic7XG5cblx0XHRmb3IgKGNvbnN0IGJ1aWxkIG9mIHRoaXMuYnVpbGRzKSBpZiAoYnVpbGQubmFtZSA9PT0gbmFtZSkgcmV0dXJuIGJ1aWxkO1xuXHR9XG5cblx0c2V0VW5kZWZpbmVkKCk6IHZvaWQge1xuXHRcdC8vIEJ1aWxkc1xuXG5cdFx0bGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XG5cblx0XHR0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XG5cdFx0XHRpZiAoYnVpbGQubmFtZSA9PT0gJ2RldicpIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcblxuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChidWlsZCk7XG5cdFx0fSk7XG5cblx0XHRpZiAoIWRldkJ1aWxkRXhpc3RzKSB7XG5cdFx0XHRjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xuXHRcdFx0TWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChkZXZCdWlsZCk7XG5cblx0XHRcdHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ZpbGUge1xuXHRpbnB1dDogc3RyaW5nW107XG5cdG91dHB1dDogc3RyaW5nW107XG5cdGJ1aWxkcz86IHN0cmluZ1tdO1xuXG5cdHN0YXRpYyBoYXNFeHRlbnNpb24oaW5wdXQ6IHN0cmluZ1tdLCBleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IG1hdGhFeHByZXNzaW9uID0gbmV3IFJlZ0V4cCgnXFxcXC4nICsgZXh0ZW5zaW9uICsgJyQnKTtcblxuXHRcdGZvciAoY29uc3QgcGF0aCBvZiBpbnB1dClcblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBnbG9iLnN5bmMocGF0aCkpIHtcblx0XHRcdFx0aWYgKGZpbGUubWF0Y2gobWF0aEV4cHJlc3Npb24pKSByZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0J1aWxkIHtcblx0bmFtZTogc3RyaW5nO1xuXHRvdXREaXI/OiBzdHJpbmc7XG5cdG91dERpclZlcnNpb25pbmc/OiBib29sZWFuO1xuXHRvdXREaXJOYW1lPzogYm9vbGVhbjtcblx0Y3NzPzogTWF0ZUNvbmZpZ0NTU0NvbmZpZztcblx0anM/OiBNYXRlQ29uZmlnSlNDb25maWc7XG5cdHRzPzogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcblx0XHR0aGlzLm5hbWUgPSBfbmFtZTtcblx0fVxuXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xuXHRcdGlmICghYnVpbGQub3V0RGlyVmVyc2lvbmluZykgYnVpbGQub3V0RGlyVmVyc2lvbmluZyA9IGZhbHNlO1xuXG5cdFx0aWYgKCFidWlsZC5vdXREaXJOYW1lKSBidWlsZC5vdXREaXJOYW1lID0gZmFsc2U7XG5cblx0XHQvLyBDU1NcblxuXHRcdGlmIChidWlsZC5jc3MgPT09IHVuZGVmaW5lZCkgYnVpbGQuY3NzID0gbmV3IE1hdGVDb25maWdDU1NDb25maWcoKTtcblxuXHRcdE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XG5cblx0XHQvLyBKU1xuXG5cdFx0aWYgKGJ1aWxkLmpzID09PSB1bmRlZmluZWQpIGJ1aWxkLmpzID0gbmV3IE1hdGVDb25maWdKU0NvbmZpZygpO1xuXG5cdFx0TWF0ZUNvbmZpZ0pTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5qcyk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcblx0b3V0RGlyU3VmZml4Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0NTU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcblx0bWluaWZ5PzogYm9vbGVhbjtcblx0c291cmNlTWFwPzogYm9vbGVhbjtcblxuXHRzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xuXHRcdGlmIChjc3MubWluaWZ5ID09PSB1bmRlZmluZWQpIGNzcy5taW5pZnkgPSB0cnVlO1xuXG5cdFx0aWYgKGNzcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZCkgY3NzLnNvdXJjZU1hcCA9IGZhbHNlO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSlNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XG5cdG1pbmlmeT86IGJvb2xlYW47XG5cdHNvdXJjZU1hcD86IGJvb2xlYW47XG5cdGRlY2xhcmF0aW9uPzogYm9vbGVhbjtcblx0d2ViQ2xlYW4/OiBib29sZWFuO1xuXG5cdHN0YXRpYyBzZXRVbmRlZmluZWQoanM6IE1hdGVDb25maWdKU0NvbmZpZyk6IHZvaWQge1xuXHRcdGlmIChqcy5taW5pZnkgPT09IHVuZGVmaW5lZCkganMubWluaWZ5ID0gdHJ1ZTtcblxuXHRcdGlmIChqcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZCkganMuc291cmNlTWFwID0gdHJ1ZTtcblxuXHRcdGlmIChqcy5kZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBqcy5kZWNsYXJhdGlvbiA9IHRydWU7XG5cblx0XHRpZiAoanMud2ViQ2xlYW4gPT09IHVuZGVmaW5lZCkganMud2ViQ2xlYW4gPSBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Zvcm1hdHRlckNvbmZpZyB7XG5cdHBhdGg6IHN0cmluZyB8IHN0cmluZ1tdO1xufSJdfQ==
