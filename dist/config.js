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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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S0FBSyxTQUFTO1lBQzFCLEVBQUUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFDTCx5QkFBQztBQUFELENBYkEsQUFhQyxDQWJ1QyxvQkFBb0IsR0FhM0Q7QUFiWSxnREFBa0I7QUFlL0I7SUFBd0Msc0NBQW9CO0lBQTVEOztJQVVBLENBQUM7SUFMVSwrQkFBWSxHQUFuQixVQUFvQixFQUFzQjtRQUV0QyxJQUFJLEVBQUUsQ0FBQyxlQUFlLEtBQUssU0FBUztZQUNoQyxFQUFFLENBQUMsZUFBZSxHQUFHLEVBQUcsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFDTCx5QkFBQztBQUFELENBVkEsQUFVQyxDQVZ1QyxvQkFBb0IsR0FVM0Q7QUFWWSxnREFBa0IiLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlne1xyXG5cclxuICAgIHN0YXRpYyBnZXQgPSBmdW5jdGlvbigpOiBNYXRlQ29uZmlnIHtcclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGZzLnJlYWRGaWxlU3luYygnbWF0ZWNvbmZpZy5qc29uJyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbmZpZ0pzb246IE1hdGVDb25maWcgPSBKU09OLnBhcnNlKGRhdGEudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNYXRlQ29uZmlnKGNvbmZpZ0pzb24ubmFtZSwgY29uZmlnSnNvbi52ZXJzaW9uLCBjb25maWdKc29uLmZpbGVzLCBjb25maWdKc29uLmJ1aWxkcyk7XHJcblxyXG4gICAgICAgIGNvbmZpZy5zZXRVbmRlZmluZWQoKTtcclxuICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKF9uYW1lOnN0cmluZywgX3ZlcnNpb246IHN0cmluZywgX2ZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdLCBfYnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXSl7XHJcblxyXG4gICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgICAgIHRoaXMudmVyc2lvbiA9IF92ZXJzaW9uO1xyXG4gICAgICAgIHRoaXMuZmlsZXMgPSBfZmlsZXM7XHJcbiAgICAgICAgdGhpcy5idWlsZHMgPSBfYnVpbGRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5idWlsZHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgdGhpcy5idWlsZHMgPSBbXTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbmFtZT86IHN0cmluZztcclxuICAgIHZlcnNpb24/OiBzdHJpbmc7XHJcbiAgICBmaWxlczogTWF0ZUNvbmZpZ0ZpbGVbXTtcclxuICAgIGJ1aWxkczogTWF0ZUNvbmZpZ0J1aWxkW107XHJcblxyXG4gICAgcHJpdmF0ZSBwYWNrYWdlOiBvYmplY3Q7XHJcbiAgICBwcml2YXRlIHNldFBhY2thZ2UoKXtcclxuICAgICAgICB0aGlzLnBhY2thZ2UgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJykudG9TdHJpbmcoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRQYWNrYWdlSW5mbyhpbmZvOiBzdHJpbmcpe1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMucGFja2FnZSlcclxuICAgICAgICAgICAgdGhpcy5zZXRQYWNrYWdlKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnBhY2thZ2VbaW5mb107XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3V0RGlyTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLm5hbWUpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5hbWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJykpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCduYW1lJyk7XHJcblxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3V0RGlyVmVyc2lvbigpOiBzdHJpbmcge1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLnZlcnNpb24pXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlcnNpb247XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJykpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFBhY2thZ2VJbmZvKCd2ZXJzaW9uJyk7XHJcblxyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QnVpbGQobmFtZTogc3RyaW5nKTogTWF0ZUNvbmZpZ0J1aWxke1xyXG5cclxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkIHx8IG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gJycpXHJcbiAgICAgICAgICAgIG5hbWUgPSAnZGV2JztcclxuICAgICAgICBcclxuICAgICAgICBmb3IoY29uc3QgYnVpbGQgb2YgdGhpcy5idWlsZHMpXHJcbiAgICAgICAgICAgIGlmIChidWlsZC5uYW1lID09PSBuYW1lKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1aWxkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzZXRVbmRlZmluZWQoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIC8vIEJ1aWxkc1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBkZXZCdWlsZEV4aXN0cyA9IGZhbHNlO1xyXG4gICAgXHJcbiAgICAgICAgdGhpcy5idWlsZHMuZm9yRWFjaCgoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCkgPT4ge1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmIChidWlsZC5uYW1lID09PSAnZGV2JylcclxuICAgICAgICAgICAgICAgIGRldkJ1aWxkRXhpc3RzID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGJ1aWxkKTtcclxuICAgIFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoIWRldkJ1aWxkRXhpc3RzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgZGV2QnVpbGQgPSBuZXcgTWF0ZUNvbmZpZ0J1aWxkKCdkZXYnKTtcclxuICAgICAgICAgICAgTWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChkZXZCdWlsZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkcy5wdXNoKGRldkJ1aWxkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZpbGVzXHJcblxyXG4gICAgICAgIHRoaXMuZmlsZXMuZm9yRWFjaCgoZmlsZTogTWF0ZUNvbmZpZ0ZpbGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGZpbGUuYnVpbGRzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGZpbGUuYnVpbGRzID0gW107XHJcbiAgICAgICAgICAgICAgICBmaWxlLmJ1aWxkcy5wdXNoKCdkZXYnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0ZpbGV7XHJcbiAgICBpbnB1dDogc3RyaW5nW107XHJcbiAgICBvdXRwdXQ6IHN0cmluZ1tdO1xyXG4gICAgYnVpbGRzPzogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQnVpbGR7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBvdXREaXI/OiBzdHJpbmc7XHJcbiAgICBvdXREaXJWZXJzaW9uaW5nPzogYm9vbGVhbjtcclxuICAgIG91dERpck5hbWU/OiBib29sZWFuO1xyXG4gICAgY3NzPzogTWF0ZUNvbmZpZ0NTU0NvbmZpZztcclxuICAgIGpzPzogTWF0ZUNvbmZpZ0pTQ29uZmlnO1xyXG4gICAgdHM/OiBNYXRlQ29uZmlnVFNDb25maWc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZyl7XHJcbiAgICAgICAgdGhpcy5uYW1lID0gX25hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNldFVuZGVmaW5lZChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKTogdm9pZCB7XHJcbiAgICBcclxuICAgICAgICBpZiAoIWJ1aWxkLm91dERpclZlcnNpb25pbmcpXHJcbiAgICAgICAgICAgIGJ1aWxkLm91dERpclZlcnNpb25pbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKCFidWlsZC5vdXREaXJOYW1lKVxyXG4gICAgICAgICAgICBidWlsZC5vdXREaXJOYW1lID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIENTU1xyXG5cclxuICAgICAgICBpZiAoYnVpbGQuY3NzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGJ1aWxkLmNzcyA9IG5ldyBNYXRlQ29uZmlnQ1NTQ29uZmlnKCk7XHJcbiAgICBcclxuICAgICAgICBNYXRlQ29uZmlnQ1NTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5jc3MpO1xyXG4gICAgXHJcbiAgICAgICAgLy8gSlNcclxuXHJcbiAgICAgICAgaWYgKGJ1aWxkLmpzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGJ1aWxkLmpzID0gbmV3IE1hdGVDb25maWdKU0NvbmZpZygpO1xyXG4gICAgXHJcbiAgICAgICAgTWF0ZUNvbmZpZ0pTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC5qcyk7XHJcbiAgICBcclxuICAgICAgICAvLyBUU1xyXG5cclxuICAgICAgICBpZiAoYnVpbGQudHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgYnVpbGQudHMgPSBuZXcgTWF0ZUNvbmZpZ1RTQ29uZmlnKCk7XHJcbiAgICBcclxuICAgICAgICBNYXRlQ29uZmlnVFNDb25maWcuc2V0VW5kZWZpbmVkKGJ1aWxkLnRzKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdCYXNlQ29uZmlne1xyXG5cclxuICAgIG91dERpclN1ZmZpeD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdDU1NDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZyB7XHJcblxyXG4gICAgbWluaWZ5PzogYm9vbGVhbjtcclxuICAgIHNvdXJjZU1hcD86IGJvb2xlYW47XHJcblxyXG4gICAgc3RhdGljIHNldFVuZGVmaW5lZChjc3M6IE1hdGVDb25maWdDU1NDb25maWcpOiB2b2lkIHtcclxuICAgIFxyXG4gICAgICAgIGlmIChjc3MubWluaWZ5ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGNzcy5taW5pZnkgPSB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGNzcy5zb3VyY2VNYXAgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgY3NzLnNvdXJjZU1hcCA9IGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0pTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWd7XHJcblxyXG4gICAgbWluaWZ5PzogYm9vbGVhbjtcclxuICAgIHNvdXJjZU1hcD86IGJvb2xlYW47XHJcblxyXG4gICAgc3RhdGljIHNldFVuZGVmaW5lZChqczogTWF0ZUNvbmZpZ0pTQ29uZmlnKTogdm9pZCB7XHJcbiAgICBcclxuICAgICAgICBpZiAoanMubWluaWZ5ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGpzLm1pbmlmeSA9IHRydWU7XHJcbiAgICBcclxuICAgICAgICBpZiAoanMuc291cmNlTWFwID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGpzLnNvdXJjZU1hcCA9IHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnVFNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBjb21waWxlck9wdGlvbnM/OiB0c0NvbXBpbGVyT3B0aW9ucztcclxuXHJcblxyXG4gICAgc3RhdGljIHNldFVuZGVmaW5lZCh0czogTWF0ZUNvbmZpZ1RTQ29uZmlnKTogdm9pZCB7XHJcbiAgICBcclxuICAgICAgICBpZiAodHMuY29tcGlsZXJPcHRpb25zID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHRzLmNvbXBpbGVyT3B0aW9ucyA9IHsgIGRlY2xhcmF0aW9uOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSB0c0NvbXBpbGVyT3B0aW9uc3tcclxuICAgIGRlY2xhcmF0aW9uPzogYm9vbGVhbjtcclxufSJdfQ==
