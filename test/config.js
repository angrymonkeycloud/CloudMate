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
var MateConfig = (function () {
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
    MateConfig.get = function () {
        var data = fs.readFileSync('mateconfig.json');
        var configJson = JSON.parse(data.toString());
        var config = new MateConfig(configJson.name, configJson.version, configJson.files, configJson.builds);
        config.setUndefined();
        return config;
    };
    return MateConfig;
}());
exports.MateConfig = MateConfig;
var MateConfigFile = (function () {
    function MateConfigFile() {
    }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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eEIsSUFBSSxFQUFFLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFDNUIsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFMUIsSUFBSSxFQUFFLENBQUMsUUFBUSxLQUFLLFNBQVM7WUFDekIsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0FyQkEsQUFxQkMsQ0FyQnVDLG9CQUFvQixHQXFCM0Q7QUFyQlksZ0RBQWtCO0FBdUIvQjtJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBcUJBLENBQUM7SUFqQlUsNkNBQTBCLEdBQWpDLFVBQWtDLGVBQW1DO1FBRWpFLElBQUksS0FBSyxHQUFxQixFQUFFLENBQUM7UUFFakMsS0FBSyxJQUFNLEdBQUcsSUFBSSxlQUFlO1lBQzdCLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdEMsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFekIsT0FBTyxLQUFLLENBQUU7SUFDbEIsQ0FBQztJQUVNLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBRXRDLElBQUksRUFBRSxDQUFDLGVBQWUsS0FBSyxTQUFTO1lBQ2hDLEVBQUUsQ0FBQyxlQUFlLEdBQUcsRUFBRyxDQUFDO0lBQ2pDLENBQUM7SUFDTCx5QkFBQztBQUFELENBckJBLEFBcUJDLENBckJ1QyxvQkFBb0IsR0FxQjNEO0FBckJZLGdEQUFrQiIsImZpbGUiOiJjb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWd7XHJcblxyXG4gICAgc3RhdGljIGdldCA9IGZ1bmN0aW9uKCk6IE1hdGVDb25maWcge1xyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKCdtYXRlY29uZmlnLmpzb24nKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29uZmlnSnNvbjogTWF0ZUNvbmZpZyA9IEpTT04ucGFyc2UoZGF0YS50b1N0cmluZygpKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoY29uZmlnSnNvbi5uYW1lLCBjb25maWdKc29uLnZlcnNpb24sIGNvbmZpZ0pzb24uZmlsZXMsIGNvbmZpZ0pzb24uYnVpbGRzKTtcclxuXHJcbiAgICAgICAgY29uZmlnLnNldFVuZGVmaW5lZCgpO1xyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoX25hbWU6c3RyaW5nLCBfdmVyc2lvbjogc3RyaW5nLCBfZmlsZXM6IE1hdGVDb25maWdGaWxlW10sIF9idWlsZHM6IE1hdGVDb25maWdCdWlsZFtdKXtcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gX25hbWU7XHJcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gX3ZlcnNpb247XHJcbiAgICAgICAgdGhpcy5maWxlcyA9IF9maWxlcztcclxuICAgICAgICB0aGlzLmJ1aWxkcyA9IF9idWlsZHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmJ1aWxkcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBuYW1lPzogc3RyaW5nO1xyXG4gICAgdmVyc2lvbj86IHN0cmluZztcclxuICAgIGZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdO1xyXG4gICAgYnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcclxuXHJcbiAgICBwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcclxuICAgIHByaXZhdGUgc2V0UGFja2FnZSgpe1xyXG4gICAgICAgIHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFBhY2thZ2VJbmZvKGluZm86IHN0cmluZyl7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wYWNrYWdlKVxyXG4gICAgICAgICAgICB0aGlzLnNldFBhY2thZ2UoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJOYW1lKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMubmFtZSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMudmVyc2lvbilcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmVyc2lvbjtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRCdWlsZChuYW1lOiBzdHJpbmcpOiBNYXRlQ29uZmlnQnVpbGR7XHJcblxyXG4gICAgICAgIGlmIChuYW1lID09PSB1bmRlZmluZWQgfHwgbmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSAnJylcclxuICAgICAgICAgICAgbmFtZSA9ICdkZXYnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcihjb25zdCBidWlsZCBvZiB0aGlzLmJ1aWxkcylcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09IG5hbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVpbGQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNldFVuZGVmaW5lZCgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgLy8gQnVpbGRzXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XHJcbiAgICBcclxuICAgICAgICB0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XHJcbiAgICBcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09ICdkZXYnKVxyXG4gICAgICAgICAgICAgICAgZGV2QnVpbGRFeGlzdHMgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoYnVpbGQpO1xyXG4gICAgXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghZGV2QnVpbGRFeGlzdHMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xyXG4gICAgICAgICAgICBNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmlsZXNcclxuXHJcbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKChmaWxlOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5idWlsZHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5idWlsZHMgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZpbGUuYnVpbGRzLnB1c2goJ2RldicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRmlsZXtcclxuICAgIGlucHV0OiBzdHJpbmdbXTtcclxuICAgIG91dHB1dDogc3RyaW5nW107XHJcbiAgICBidWlsZHM/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCdWlsZHtcclxuICAgIG5hbWU6IHN0cmluZztcclxuICAgIG91dERpcj86IHN0cmluZztcclxuICAgIG91dERpclZlcnNpb25pbmc/OiBib29sZWFuO1xyXG4gICAgb3V0RGlyTmFtZT86IGJvb2xlYW47XHJcbiAgICBjc3M/OiBNYXRlQ29uZmlnQ1NTQ29uZmlnO1xyXG4gICAganM/OiBNYXRlQ29uZmlnSlNDb25maWc7XHJcbiAgICB0cz86IE1hdGVDb25maWdUU0NvbmZpZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKXtcclxuICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICghYnVpbGQub3V0RGlyVmVyc2lvbmluZylcclxuICAgICAgICAgICAgYnVpbGQub3V0RGlyVmVyc2lvbmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIWJ1aWxkLm91dERpck5hbWUpXHJcbiAgICAgICAgICAgIGJ1aWxkLm91dERpck5hbWUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gQ1NTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC5jc3MgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuY3NzID0gbmV3IE1hdGVDb25maWdDU1NDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdDU1NDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmNzcyk7XHJcbiAgICBcclxuICAgICAgICAvLyBKU1xyXG5cclxuICAgICAgICBpZiAoYnVpbGQuanMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQuanMgPSBuZXcgTWF0ZUNvbmZpZ0pTQ29uZmlnKCk7XHJcbiAgICBcclxuICAgICAgICBNYXRlQ29uZmlnSlNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLmpzKTtcclxuICAgIFxyXG4gICAgICAgIC8vIFRTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC50cyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC50cyA9IG5ldyBNYXRlQ29uZmlnVFNDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdUU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQudHMpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgb3V0RGlyU3VmZml4Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0NTU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlnIHtcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGNzczogTWF0ZUNvbmZpZ0NTU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGNzcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgY3NzLm1pbmlmeSA9IHRydWU7XHJcbiAgICBcclxuICAgICAgICBpZiAoY3NzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjc3Muc291cmNlTWFwID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnSlNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBtaW5pZnk/OiBib29sZWFuO1xyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbjtcclxuICAgIGRlY2xhcmF0aW9uPzogYm9vbGVhbjtcclxuICAgIHdlYkNsZWFuPzogYm9vbGVhbjtcclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKGpzOiBNYXRlQ29uZmlnSlNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5taW5pZnkgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMubWluaWZ5ID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAganMuc291cmNlTWFwID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChqcy5kZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5kZWNsYXJhdGlvbiA9IHRydWU7XHJcblxyXG4gICAgICAgIGlmIChqcy53ZWJDbGVhbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy53ZWJDbGVhbiA9IGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ1RTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgY29tcGlsZXJPcHRpb25zPzogdHNDb21waWxlck9wdGlvbnM7XHJcblxyXG4gICAgc3RhdGljIGRlY2xhcmF0aW9uQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucz86IHRzQ29tcGlsZXJPcHRpb25zKTogdHNDb21waWxlck9wdGlvbnN7XHJcblxyXG4gICAgICAgIHZhciB2YWx1ZTp0c0NvbXBpbGVyT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjb21waWxlck9wdGlvbnMpXHJcbiAgICAgICAgICAgIHZhbHVlW2tleV0gPSBjb21waWxlck9wdGlvbnNba2V5XTtcclxuICAgIFxyXG4gICAgICAgIHZhbHVlLmRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHZhbHVlIDtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc2V0VW5kZWZpbmVkKHRzOiBNYXRlQ29uZmlnVFNDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmICh0cy5jb21waWxlck9wdGlvbnMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdHMuY29tcGlsZXJPcHRpb25zID0geyB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgdHNDb21waWxlck9wdGlvbnN7XHJcbiAgICAvLyB0byBiZSBpZ25vcmVkXHJcbiAgICBkZWNsYXJhdGlvbj86IGJvb2xlYW4sXHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuLFxyXG4gICAgb3V0RGlyPzogc3RyaW5nLFxyXG4gICAgb3V0RmlsZT86IHN0cmluZ1xyXG59Il19
