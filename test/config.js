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
var MateConfig = (function () {
    function MateConfig(_name, _version, _files, _builds) {
        this.name = _name;
        this.version = _version;
        this.files = _files;
        this.builds = _builds;
        if (this.builds === undefined)
            this.builds = [];
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
                ], transform: function (result) {
                    if (!result || !result.config)
                        return result;
                    if (typeof result.config !== "object")
                        throw new Error("Config is only allowed to be an object, but received " + typeof result.config + " in \"" + result.filepath + "\"");
                    delete result.config.$schema;
                    return result;
                }
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
        var configurationFile = MateConfig.availableConfigurationFile;
        if (!configurationFile)
            return null;
        var configJson;
        var result = this.configurationExplorer.load(configurationFile);
        configJson = result.config;
        if (!configJson)
            throw new Error('Error parsing configuration file.');
        var config = new MateConfig(configJson.name, configJson.version, configJson.files, configJson.builds);
        config.setUndefined();
        return config;
    };
    ;
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
        this.files.forEach(function (file) {
            if (file.builds === undefined) {
                file.builds = [];
                file.builds.push('dev');
            }
        });
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
        if (build.ts === undefined)
            build.ts = new MateConfigTSConfig();
        MateConfigTSConfig.setUndefined(build.ts);
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
var MateConfigTSConfig = (function (_super) {
    __extends(MateConfigTSConfig, _super);
    function MateConfigTSConfig() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MateConfigTSConfig.declarationCompilerOptions = function (compilerOptions) {
        var value = {};
        for (var key in compilerOptions)
            value[key] = compilerOptions[key];
        value.declaration = true;
        return value;
    };
    MateConfigTSConfig.setUndefined = function (ts) {
        if (ts.compilerOptions === undefined)
            ts.compilerOptions = {};
    };
    return MateConfigTSConfig;
}(MateConfigBaseConfig));
exports.MateConfigTSConfig = MateConfigTSConfig;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV0QyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUV6QixPQUFPLEtBQUssQ0FBRTtJQUNsQixDQUFDO0lBRU0sK0JBQVksR0FBbkIsVUFBb0IsRUFBc0I7UUFFdEMsSUFBSSxFQUFFLENBQUMsZUFBZSxLQUFLLFNBQVM7WUFDaEMsRUFBRSxDQUFDLGVBQWUsR0FBRyxFQUFHLENBQUM7SUFDakMsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0FyQkEsQUFxQkMsQ0FyQnVDLG9CQUFvQixHQXFCM0Q7QUFyQlksZ0RBQWtCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZShcImdsb2JcIik7XHJcbmltcG9ydCB7IGNvc21pY29uZmlnU3luYyB9IGZyb20gJ2Nvc21pY29uZmlnJztcclxuaW1wb3J0IHsgQ29zbWljb25maWdSZXN1bHQgfSBmcm9tICdjb3NtaWNvbmZpZy9kaXN0L3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnIHtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBfY29uZmlndXJhdGlvbkV4cGxvcmVyO1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgZ2V0IGNvbmZpZ3VyYXRpb25FeHBsb3JlcigpIHtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5fY29uZmlndXJhdGlvbkV4cGxvcmVyICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcblxyXG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlciA9IGNvc21pY29uZmlnU3luYygnbWF0ZWNvbmZpZycsIHtcclxuICAgICAgICAgICAgc2VhcmNoUGxhY2VzOiBbXHJcbiAgICAgICAgICAgICAgICAnLm1hdGVjb25maWcnLFxyXG4gICAgICAgICAgICAgICAgJy5tYXRlY29uZmlnLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgJy5tYXRlY29uZmlnLnlhbWwnLFxyXG4gICAgICAgICAgICAgICAgJy5tYXRlY29uZmlnLnltbCcsXHJcbiAgICAgICAgICAgICAgICAnLm1hdGVjb25maWcuanMnLFxyXG4gICAgICAgICAgICAgICAgJ21hdGVjb25maWcuanNvbicsIC8vIERlcHJlY2F0ZWRcclxuICAgICAgICAgICAgICAgICdwYWNrYWdlLmpzb24nLFxyXG4gICAgICAgICAgICBdLCB0cmFuc2Zvcm06IChyZXN1bHQpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LmNvbmZpZylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQuY29uZmlnICE9PSBcIm9iamVjdFwiKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmlnIGlzIG9ubHkgYWxsb3dlZCB0byBiZSBhbiBvYmplY3QsIGJ1dCByZWNlaXZlZCAke3R5cGVvZiByZXN1bHQuY29uZmlnfSBpbiBcIiR7cmVzdWx0LmZpbGVwYXRofVwiYCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmNvbmZpZy4kc2NoZW1hO1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZ3VyYXRpb25FeHBsb3JlcjtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0IGF2YWlsYWJsZUNvbmZpZ3VyYXRpb25GaWxlKCk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgIGNvbnN0IGV4cGxvcmVyID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXI7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZXhwbG9yZXIuc2VhcmNoKCk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZmlsZXBhdGg7XHJcbiAgICAgICAgfSBjYXRjaCB7IHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBmaWxlIHdhcyBub3QgZm91bmQuJyk7IH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZ2V0KCk6IE1hdGVDb25maWcge1xyXG5cclxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9uRmlsZSA9IE1hdGVDb25maWcuYXZhaWxhYmxlQ29uZmlndXJhdGlvbkZpbGU7XHJcblxyXG4gICAgICAgIGlmICghY29uZmlndXJhdGlvbkZpbGUpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBsZXQgY29uZmlnSnNvbjogTWF0ZUNvbmZpZztcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCByZXN1bHQ6IENvc21pY29uZmlnUmVzdWx0ID0gdGhpcy5jb25maWd1cmF0aW9uRXhwbG9yZXIubG9hZChjb25maWd1cmF0aW9uRmlsZSk7XHJcbiAgICAgICAgY29uZmlnSnNvbiA9IHJlc3VsdC5jb25maWc7XHJcblxyXG4gICAgICAgIGlmICghY29uZmlnSnNvbilcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciBwYXJzaW5nIGNvbmZpZ3VyYXRpb24gZmlsZS4nKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNYXRlQ29uZmlnKGNvbmZpZ0pzb24ubmFtZSwgY29uZmlnSnNvbi52ZXJzaW9uLCBjb25maWdKc29uLmZpbGVzLCBjb25maWdKc29uLmJ1aWxkcyk7XHJcblxyXG4gICAgICAgIGNvbmZpZy5zZXRVbmRlZmluZWQoKTtcclxuICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKF9uYW1lOnN0cmluZywgX3ZlcnNpb246IHN0cmluZywgX2ZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdLCBfYnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXSl7XHJcblxyXG4gICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgICAgIHRoaXMudmVyc2lvbiA9IF92ZXJzaW9uO1xyXG4gICAgICAgIHRoaXMuZmlsZXMgPSBfZmlsZXM7XHJcbiAgICAgICAgdGhpcy5idWlsZHMgPSBfYnVpbGRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5idWlsZHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhpcy5idWlsZHMgPSBbXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbmFtZT86IHN0cmluZztcclxuICAgIHZlcnNpb24/OiBzdHJpbmc7XHJcbiAgICBmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcclxuICAgIGJ1aWxkczogTWF0ZUNvbmZpZ0J1aWxkW107XHJcblxyXG4gICAgcHJpdmF0ZSBwYWNrYWdlOiBvYmplY3Q7XHJcbiAgICBwcml2YXRlIHNldFBhY2thZ2UoKXtcclxuICAgICAgICB0aGlzLnBhY2thZ2UgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJykudG9TdHJpbmcoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRQYWNrYWdlSW5mbyhpbmZvOiBzdHJpbmcpe1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMucGFja2FnZSlcclxuICAgICAgICAgICAgdGhpcy5zZXRQYWNrYWdlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnBhY2thZ2VbaW5mb107XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3V0RGlyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLm5hbWUpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5hbWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJykpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJyk7XHJcblxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3V0RGlyVmVyc2lvbigpOiBzdHJpbmcge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLnZlcnNpb24pXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlcnNpb247XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJykpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJyk7XHJcblxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QnVpbGQobmFtZTogc3RyaW5nKTogTWF0ZUNvbmZpZ0J1aWxke1xyXG5cclxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gJycpXHJcbiAgICAgICAgICAgIG5hbWUgPSAnZGV2JztcclxuICAgICAgICBcclxuICAgICAgICBmb3IoY29uc3QgYnVpbGQgb2YgdGhpcy5idWlsZHMpXHJcbiAgICAgICAgICAgIGlmIChidWlsZC5uYW1lID09PSBuYW1lKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1aWxkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzZXRVbmRlZmluZWQoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIC8vIEJ1aWxkc1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBkZXZCdWlsZEV4aXN0cyA9IGZhbHNlO1xyXG4gICAgXHJcbiAgICAgICAgdGhpcy5idWlsZHMuZm9yRWFjaCgoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCkgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmIChidWlsZC5uYW1lID09PSAnZGV2JylcclxuICAgICAgICAgICAgICAgIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGJ1aWxkKTtcclxuICAgIFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoIWRldkJ1aWxkRXhpc3RzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgZGV2QnVpbGQgPSBuZXcgTWF0ZUNvbmZpZ0J1aWxkKCdkZXYnKTtcclxuICAgICAgICAgICAgTWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChkZXZCdWlsZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkcy5wdXNoKGRldkJ1aWxkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZpbGVzXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZXMuZm9yRWFjaCgoZmlsZTogTWF0ZUNvbmZpZ0ZpbGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGZpbGUuYnVpbGRzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZpbGUuYnVpbGRzID0gW107XHJcbiAgICAgICAgICAgICAgICBmaWxlLmJ1aWxkcy5wdXNoKCdkZXYnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ZpbGV7XHJcbiAgICBpbnB1dDogc3RyaW5nW107XHJcbiAgICBvdXRwdXQ6IHN0cmluZ1tdO1xyXG4gICAgYnVpbGRzPzogc3RyaW5nW107XHJcblxyXG4gICAgc3RhdGljIGhhc0V4dGVuc2lvbihpbnB1dDogc3RyaW5nW10sIGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbntcclxuXHJcbiAgICAgICAgY29uc3QgbWF0aEV4cHJlc3Npb24gPSBuZXcgUmVnRXhwKCdcXFxcLicgKyBleHRlbnNpb24gKyAnJCcpO1xyXG5cclxuICAgICAgICBmb3IoY29uc3QgcGF0aCBvZiBpbnB1dClcclxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGdsb2Iuc3luYyhwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUubWF0Y2gobWF0aEV4cHJlc3Npb24pKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIG91dERpcj86IHN0cmluZztcclxuICAgIG91dERpclZlcnNpb25pbmc/OiBib29sZWFuO1xyXG4gICAgb3V0RGlyTmFtZT86IGJvb2xlYW47XHJcbiAgICBjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xyXG4gICAganM/OiBNYXRlQ29uZmlnSlNDb25maWc7XHJcbiAgICB0cz86IE1hdGVDb25maWdUU0NvbmZpZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKXtcclxuICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICghYnVpbGQub3V0RGlyVmVyc2lvbmluZylcclxuICAgICAgICAgICAgYnVpbGQub3V0RGlyVmVyc2lvbmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIWJ1aWxkLm91dERpck5hbWUpXHJcbiAgICAgICAgICAgIGJ1aWxkLm91dERpck5hbWUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gQ1NTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC5jc3MgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuY3NzID0gbmV3IE1hdGVDb25maWdDU1NDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XHJcbiAgICBcclxuICAgICAgICAvLyBKU1xyXG5cclxuICAgICAgICBpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XHJcbiAgICBcclxuICAgICAgICBNYXRlQ29uZmlnSlNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmpzKTtcclxuICAgIFxyXG4gICAgICAgIC8vIFRTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC50cyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC50cyA9IG5ldyBNYXRlQ29uZmlnVFNDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdUU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQudHMpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgb3V0RGlyU3VmZml4Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0NTU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgY3NzLm1pbmlmeSA9IHRydWU7XHJcbiAgICBcclxuICAgICAgICBpZiAoY3NzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjc3Muc291cmNlTWFwID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSlNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuICAgIGRlY2xhcmF0aW9uPzogYm9vbGVhbjtcclxuICAgIHdlYkNsZWFuPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGpzOiBNYXRlQ29uZmlnSlNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMubWluaWZ5ID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMuc291cmNlTWFwID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5kZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5kZWNsYXJhdGlvbiA9IHRydWU7XHJcblxyXG4gICAgICAgIGlmIChqcy53ZWJDbGVhbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy53ZWJDbGVhbiA9IGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ1RTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgY29tcGlsZXJPcHRpb25zPzogdHNDb21waWxlck9wdGlvbnM7XHJcblxyXG4gICAgc3RhdGljIGRlY2xhcmF0aW9uQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucz86IHRzQ29tcGlsZXJPcHRpb25zKTogdHNDb21waWxlck9wdGlvbnN7XHJcblxyXG4gICAgICAgIHZhciB2YWx1ZTp0c0NvbXBpbGVyT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjb21waWxlck9wdGlvbnMpXHJcbiAgICAgICAgICAgIHZhbHVlW2tleV0gPSBjb21waWxlck9wdGlvbnNba2V5XTtcclxuICAgIFxyXG4gICAgICAgIHZhbHVlLmRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHZhbHVlIDtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKHRzOiBNYXRlQ29uZmlnVFNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICh0cy5jb21waWxlck9wdGlvbnMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdHMuY29tcGlsZXJPcHRpb25zID0geyB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgdHNDb21waWxlck9wdGlvbnN7XHJcbiAgICAvLyB0byBiZSBpZ25vcmVkXHJcbiAgICBkZWNsYXJhdGlvbj86IGJvb2xlYW4sXHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuLFxyXG4gICAgb3V0RGlyPzogc3RyaW5nLFxyXG4gICAgb3V0RmlsZT86IHN0cmluZ1xyXG59Il19
