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
exports.__esModule = true;
var fs = require("fs");
var MateConfig = /** @class */ (function () {
    function MateConfig(_name, _version, _files, _builds) {
        this.name = _name;
        this.version = _version;
        this.files = _files;
        this.builds = _builds;
        if (this.builds === undefined)
            this.builds = [];
    }
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
        // Builds
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
        // Files
        this.files.forEach(function (file) {
            if (file.builds === undefined) {
                file.builds = [];
                file.builds.push('dev');
            }
        });
    };
    MateConfig.fromFile = function (fileName) {
        var data = fs.readFileSync(fileName);
        var configJson = JSON.parse(data.toString());
        var config = new MateConfig(configJson.name, configJson.version, configJson.files, configJson.builds);
        config.setUndefined();
        return config;
    };
    return MateConfig;
}());
exports.MateConfig = MateConfig;
var MateConfigFile = /** @class */ (function () {
    function MateConfigFile() {
    }
    return MateConfigFile;
}());
exports.MateConfigFile = MateConfigFile;
var MateConfigBuild = /** @class */ (function () {
    function MateConfigBuild(_name) {
        this.name = _name;
    }
    MateConfigBuild.setUndefined = function (build) {
        if (!build.outDirVersioning)
            build.outDirVersioning = false;
        if (!build.outDirName)
            build.outDirName = false;
        // CSS
        if (build.css === undefined)
            build.css = new MateConfigCSSConfig();
        MateConfigCSSConfig.setUndefined(build.css);
        // JS
        if (build.js === undefined)
            build.js = new MateConfigJSConfig();
        MateConfigJSConfig.setUndefined(build.js);
        // TS
        if (build.ts === undefined)
            build.ts = new MateConfigTSConfig();
        MateConfigTSConfig.setUndefined(build.ts);
    };
    return MateConfigBuild;
}());
exports.MateConfigBuild = MateConfigBuild;
var MateConfigBaseConfig = /** @class */ (function () {
    function MateConfigBaseConfig() {
    }
    return MateConfigBaseConfig;
}());
exports.MateConfigBaseConfig = MateConfigBaseConfig;
var MateConfigCSSConfig = /** @class */ (function (_super) {
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
var MateConfigJSConfig = /** @class */ (function (_super) {
    __extends(MateConfigJSConfig, _super);
    function MateConfigJSConfig() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MateConfigJSConfig.setUndefined = function (js) {
        if (js.minify === undefined)
            js.minify = true;
        if (js.sourceMap === undefined)
            js.sourceMap = true;
    };
    return MateConfigJSConfig;
}(MateConfigBaseConfig));
exports.MateConfigJSConfig = MateConfigJSConfig;
var MateConfigTSConfig = /** @class */ (function (_super) {
    __extends(MateConfigTSConfig, _super);
    function MateConfigTSConfig() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MateConfigTSConfig.setUndefined = function (ts) {
        if (ts.compilerOptions === undefined)
            ts.compilerOptions = { declaration: true };
    };
    return MateConfigTSConfig;
}(MateConfigBaseConfig));
exports.MateConfigTSConfig = MateConfigTSConfig;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDMUIsRUFBRSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0FiQSxBQWFDLENBYnVDLG9CQUFvQixHQWEzRDtBQWJZLGdEQUFrQjtBQWUvQjtJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBVUEsQ0FBQztJQUxVLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBRXRDLElBQUksRUFBRSxDQUFDLGVBQWUsS0FBSyxTQUFTO1lBQ2hDLEVBQUUsQ0FBQyxlQUFlLEdBQUcsRUFBRyxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDcEQsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0FWQSxBQVVDLENBVnVDLG9CQUFvQixHQVUzRDtBQVZZLGdEQUFrQiIsImZpbGUiOiJjb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWd7XHJcblxyXG4gICAgc3RhdGljIGZyb21GaWxlID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZyk6IE1hdGVDb25maWcge1xyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGZpbGVOYW1lKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29uZmlnSnNvbjogTWF0ZUNvbmZpZyA9IEpTT04ucGFyc2UoZGF0YS50b1N0cmluZygpKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoY29uZmlnSnNvbi5uYW1lLCBjb25maWdKc29uLnZlcnNpb24sIGNvbmZpZ0pzb24uZmlsZXMsIGNvbmZpZ0pzb24uYnVpbGRzKTtcclxuXHJcbiAgICAgICAgY29uZmlnLnNldFVuZGVmaW5lZCgpO1xyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoX25hbWU6c3RyaW5nLCBfdmVyc2lvbjogc3RyaW5nLCBfZmlsZXM6IE1hdGVDb25maWdGaWxlW10sIF9idWlsZHM6IE1hdGVDb25maWdCdWlsZFtdKXtcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gX25hbWU7XHJcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gX3ZlcnNpb247XHJcbiAgICAgICAgdGhpcy5maWxlcyA9IF9maWxlcztcclxuICAgICAgICB0aGlzLmJ1aWxkcyA9IF9idWlsZHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmJ1aWxkcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBuYW1lPzogc3RyaW5nO1xyXG4gICAgdmVyc2lvbj86IHN0cmluZztcclxuICAgIGZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdO1xyXG4gICAgYnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcclxuXHJcbiAgICBwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcclxuICAgIHByaXZhdGUgc2V0UGFja2FnZSgpe1xyXG4gICAgICAgIHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFBhY2thZ2VJbmZvKGluZm86IHN0cmluZyl7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wYWNrYWdlKVxyXG4gICAgICAgICAgICB0aGlzLnNldFBhY2thZ2UoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJOYW1lKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMubmFtZSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMudmVyc2lvbilcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmVyc2lvbjtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRCdWlsZChuYW1lOiBzdHJpbmcpOiBNYXRlQ29uZmlnQnVpbGR7XHJcblxyXG4gICAgICAgIGlmIChuYW1lID09PSB1bmRlZmluZWQgfHwgbmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSAnJylcclxuICAgICAgICAgICAgbmFtZSA9ICdkZXYnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcihjb25zdCBidWlsZCBvZiB0aGlzLmJ1aWxkcylcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09IG5hbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVpbGQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNldFVuZGVmaW5lZCgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgLy8gQnVpbGRzXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XHJcbiAgICBcclxuICAgICAgICB0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XHJcbiAgICBcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09ICdkZXYnKVxyXG4gICAgICAgICAgICAgICAgZGV2QnVpbGRFeGlzdHMgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoYnVpbGQpO1xyXG4gICAgXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghZGV2QnVpbGRFeGlzdHMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xyXG4gICAgICAgICAgICBNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmlsZXNcclxuXHJcbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKChmaWxlOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5idWlsZHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5idWlsZHMgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZpbGUuYnVpbGRzLnB1c2goJ2RldicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRmlsZXtcclxuICAgIGlucHV0OiBzdHJpbmdbXTtcclxuICAgIG91dHB1dDogc3RyaW5nW107XHJcbiAgICBidWlsZHM/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIG91dERpcj86IHN0cmluZztcclxuICAgIG91dERpclZlcnNpb25pbmc/OiBib29sZWFuO1xyXG4gICAgb3V0RGlyTmFtZT86IGJvb2xlYW47XHJcbiAgICBjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xyXG4gICAganM/OiBNYXRlQ29uZmlnSlNDb25maWc7XHJcbiAgICB0cz86IE1hdGVDb25maWdUU0NvbmZpZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKXtcclxuICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICghYnVpbGQub3V0RGlyVmVyc2lvbmluZylcclxuICAgICAgICAgICAgYnVpbGQub3V0RGlyVmVyc2lvbmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIWJ1aWxkLm91dERpck5hbWUpXHJcbiAgICAgICAgICAgIGJ1aWxkLm91dERpck5hbWUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gQ1NTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC5jc3MgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuY3NzID0gbmV3IE1hdGVDb25maWdDU1NDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XHJcbiAgICBcclxuICAgICAgICAvLyBKU1xyXG5cclxuICAgICAgICBpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XHJcbiAgICBcclxuICAgICAgICBNYXRlQ29uZmlnSlNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmpzKTtcclxuICAgIFxyXG4gICAgICAgIC8vIFRTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC50cyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC50cyA9IG5ldyBNYXRlQ29uZmlnVFNDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdUU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQudHMpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgb3V0RGlyU3VmZml4Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0NTU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgY3NzLm1pbmlmeSA9IHRydWU7XHJcbiAgICBcclxuICAgICAgICBpZiAoY3NzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjc3Muc291cmNlTWFwID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSlNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGpzOiBNYXRlQ29uZmlnSlNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMubWluaWZ5ID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMuc291cmNlTWFwID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdUU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlne1xyXG5cclxuICAgIGNvbXBpbGVyT3B0aW9ucz86IHRzQ29tcGlsZXJPcHRpb25zO1xyXG5cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKHRzOiBNYXRlQ29uZmlnVFNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICh0cy5jb21waWxlck9wdGlvbnMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdHMuY29tcGlsZXJPcHRpb25zID0geyAgZGVjbGFyYXRpb246IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIHRzQ29tcGlsZXJPcHRpb25ze1xyXG4gICAgZGVjbGFyYXRpb24/OiBib29sZWFuO1xyXG59Il19
