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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1QkFBMEI7QUFDMUIsMkJBQThCO0FBRTlCO0lBY0ksb0JBQW9CLEtBQVksRUFBRSxRQUFnQixFQUFFLE1BQXdCLEVBQUUsT0FBMEI7UUFFcEcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7UUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFFdEIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVM7WUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDekIsQ0FBQztJQVFPLCtCQUFVLEdBQWxCO1FBQ0ksSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU8sbUNBQWMsR0FBdEIsVUFBdUIsSUFBWTtRQUUvQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU87WUFDYixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFdEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxrQ0FBYSxHQUFiO1FBRUksSUFBSSxJQUFJLENBQUMsSUFBSTtZQUNULE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUVyQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV2QyxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBRUQscUNBQWdCLEdBQWhCO1FBRUksSUFBSSxJQUFJLENBQUMsT0FBTztZQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUV4QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUxQyxPQUFPLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBRUQsNkJBQVEsR0FBUixVQUFTLElBQVk7UUFFakIsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDbEQsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUVqQixLQUFtQixVQUFXLEVBQVgsS0FBQSxJQUFJLENBQUMsTUFBTSxFQUFYLGNBQVcsRUFBWCxJQUFXO1lBQTFCLElBQU0sS0FBSyxTQUFBO1lBQ1gsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUk7Z0JBQ25CLE9BQU8sS0FBSyxDQUFDO1NBQUE7SUFDekIsQ0FBQztJQUVELGlDQUFZLEdBQVo7UUFJSSxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFFM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFzQjtZQUV2QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSztnQkFDcEIsY0FBYyxHQUFHLElBQUksQ0FBQztZQUV0QixlQUFlLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGNBQWMsRUFDbkI7WUFDSSxJQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxlQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzlCO1FBSUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFvQjtZQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUM3QjtnQkFDSSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDM0I7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUF6R00sY0FBRyxHQUFHO1FBRVQsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRWhELElBQU0sVUFBVSxHQUFlLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFM0QsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXRHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QixPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDLENBQUM7SUFnR04saUJBQUM7Q0E1R0QsQUE0R0MsSUFBQTtBQTVHWSxnQ0FBVTtBQThHdkI7SUFBQTtJQWlCQSxDQUFDO0lBWlUsMkJBQVksR0FBbkIsVUFBb0IsS0FBZSxFQUFFLFNBQWlCO1FBRWxELElBQU0sY0FBYyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFFM0QsS0FBa0IsVUFBSyxFQUFMLGVBQUssRUFBTCxtQkFBSyxFQUFMLElBQUs7WUFBbkIsSUFBTSxJQUFJLGNBQUE7WUFDVixLQUFtQixVQUFlLEVBQWYsS0FBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFmLGNBQWUsRUFBZixJQUFlLEVBQUU7Z0JBQS9CLElBQU0sSUFBSSxTQUFBO2dCQUNYLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUM7b0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ25CO1NBQUE7UUFFTCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBQ0wscUJBQUM7QUFBRCxDQWpCQSxBQWlCQyxJQUFBO0FBakJZLHdDQUFjO0FBbUIzQjtJQVNJLHlCQUFZLEtBQWE7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFDdEIsQ0FBQztJQUVNLDRCQUFZLEdBQW5CLFVBQW9CLEtBQXNCO1FBRXRDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCO1lBQ3ZCLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVO1lBQ2pCLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBSTdCLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTO1lBQ3ZCLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBRTFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFJNUMsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLFNBQVM7WUFDdEIsS0FBSyxDQUFDLEVBQUUsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFFeEMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUkxQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssU0FBUztZQUN0QixLQUFLLENBQUMsRUFBRSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUV4QyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDTCxzQkFBQztBQUFELENBMUNBLEFBMENDLElBQUE7QUExQ1ksMENBQWU7QUE0QzVCO0lBQUE7SUFHQSxDQUFDO0lBQUQsMkJBQUM7QUFBRCxDQUhBLEFBR0MsSUFBQTtBQUhZLG9EQUFvQjtBQUtqQztJQUF5Qyx1Q0FBb0I7SUFBN0Q7O0lBYUEsQ0FBQztJQVJVLGdDQUFZLEdBQW5CLFVBQW9CLEdBQXdCO1FBRXhDLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQ3hCLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBRXRCLElBQUksR0FBRyxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQzNCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQzlCLENBQUM7SUFDTCwwQkFBQztBQUFELENBYkEsQUFhQyxDQWJ3QyxvQkFBb0IsR0FhNUQ7QUFiWSxrREFBbUI7QUFlaEM7SUFBd0Msc0NBQW9CO0lBQTVEOztJQXFCQSxDQUFDO0lBZFUsK0JBQVksR0FBbkIsVUFBb0IsRUFBc0I7UUFFdEMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVM7WUFDdkIsRUFBRSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFckIsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDMUIsRUFBRSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFFeEIsSUFBSSxFQUFFLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFDNUIsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFMUIsSUFBSSxFQUFFLENBQUMsUUFBUSxLQUFLLFNBQVM7WUFDekIsRUFBRSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0FyQkEsQUFxQkMsQ0FyQnVDLG9CQUFvQixHQXFCM0Q7QUFyQlksZ0RBQWtCO0FBdUIvQjtJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBcUJBLENBQUM7SUFqQlUsNkNBQTBCLEdBQWpDLFVBQWtDLGVBQW1DO1FBRWpFLElBQUksS0FBSyxHQUFxQixFQUFFLENBQUM7UUFFakMsS0FBSyxJQUFNLEdBQUcsSUFBSSxlQUFlO1lBQzdCLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdEMsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFekIsT0FBTyxLQUFLLENBQUU7SUFDbEIsQ0FBQztJQUVNLCtCQUFZLEdBQW5CLFVBQW9CLEVBQXNCO1FBRXRDLElBQUksRUFBRSxDQUFDLGVBQWUsS0FBSyxTQUFTO1lBQ2hDLEVBQUUsQ0FBQyxlQUFlLEdBQUcsRUFBRyxDQUFDO0lBQ2pDLENBQUM7SUFDTCx5QkFBQztBQUFELENBckJBLEFBcUJDLENBckJ1QyxvQkFBb0IsR0FxQjNEO0FBckJZLGdEQUFrQiIsImZpbGUiOiJjb25maWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5pbXBvcnQgZ2xvYiA9IHJlcXVpcmUoXCJnbG9iXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWd7XHJcblxyXG4gICAgc3RhdGljIGdldCA9IGZ1bmN0aW9uKCk6IE1hdGVDb25maWcge1xyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKCdtYXRlY29uZmlnLmpzb24nKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29uZmlnSnNvbjogTWF0ZUNvbmZpZyA9IEpTT04ucGFyc2UoZGF0YS50b1N0cmluZygpKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgY29uZmlnID0gbmV3IE1hdGVDb25maWcoY29uZmlnSnNvbi5uYW1lLCBjb25maWdKc29uLnZlcnNpb24sIGNvbmZpZ0pzb24uZmlsZXMsIGNvbmZpZ0pzb24uYnVpbGRzKTtcclxuXHJcbiAgICAgICAgY29uZmlnLnNldFVuZGVmaW5lZCgpO1xyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoX25hbWU6c3RyaW5nLCBfdmVyc2lvbjogc3RyaW5nLCBfZmlsZXM6IE1hdGVDb25maWdGaWxlW10sIF9idWlsZHM6IE1hdGVDb25maWdCdWlsZFtdKXtcclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gX25hbWU7XHJcbiAgICAgICAgdGhpcy52ZXJzaW9uID0gX3ZlcnNpb247XHJcbiAgICAgICAgdGhpcy5maWxlcyA9IF9maWxlcztcclxuICAgICAgICB0aGlzLmJ1aWxkcyA9IF9idWlsZHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmJ1aWxkcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBuYW1lPzogc3RyaW5nO1xyXG4gICAgdmVyc2lvbj86IHN0cmluZztcclxuICAgIGZpbGVzOiBNYXRlQ29uZmlnRmlsZVtdO1xyXG4gICAgYnVpbGRzOiBNYXRlQ29uZmlnQnVpbGRbXTtcclxuXHJcbiAgICBwcml2YXRlIHBhY2thZ2U6IG9iamVjdDtcclxuICAgIHByaXZhdGUgc2V0UGFja2FnZSgpe1xyXG4gICAgICAgIHRoaXMucGFja2FnZSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nKS50b1N0cmluZygpKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFBhY2thZ2VJbmZvKGluZm86IHN0cmluZyl7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wYWNrYWdlKVxyXG4gICAgICAgICAgICB0aGlzLnNldFBhY2thZ2UoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFja2FnZVtpbmZvXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJOYW1lKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMubmFtZSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ25hbWUnKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPdXREaXJWZXJzaW9uKCk6IHN0cmluZyB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMudmVyc2lvbilcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmVyc2lvbjtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGFja2FnZUluZm8oJ3ZlcnNpb24nKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRCdWlsZChuYW1lOiBzdHJpbmcpOiBNYXRlQ29uZmlnQnVpbGR7XHJcblxyXG4gICAgICAgIGlmIChuYW1lID09PSB1bmRlZmluZWQgfHwgbmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSAnJylcclxuICAgICAgICAgICAgbmFtZSA9ICdkZXYnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcihjb25zdCBidWlsZCBvZiB0aGlzLmJ1aWxkcylcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09IG5hbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVpbGQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNldFVuZGVmaW5lZCgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgLy8gQnVpbGRzXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGRldkJ1aWxkRXhpc3RzID0gZmFsc2U7XHJcbiAgICBcclxuICAgICAgICB0aGlzLmJ1aWxkcy5mb3JFYWNoKChidWlsZDogTWF0ZUNvbmZpZ0J1aWxkKSA9PiB7XHJcbiAgICBcclxuICAgICAgICAgICAgaWYgKGJ1aWxkLm5hbWUgPT09ICdkZXYnKVxyXG4gICAgICAgICAgICAgICAgZGV2QnVpbGRFeGlzdHMgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoYnVpbGQpO1xyXG4gICAgXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmICghZGV2QnVpbGRFeGlzdHMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBkZXZCdWlsZCA9IG5ldyBNYXRlQ29uZmlnQnVpbGQoJ2RldicpO1xyXG4gICAgICAgICAgICBNYXRlQ29uZmlnQnVpbGQuc2V0VW5kZWZpbmVkKGRldkJ1aWxkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRzLnB1c2goZGV2QnVpbGQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmlsZXNcclxuXHJcbiAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKChmaWxlOiBNYXRlQ29uZmlnRmlsZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5idWlsZHMgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5idWlsZHMgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZpbGUuYnVpbGRzLnB1c2goJ2RldicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnRmlsZXtcclxuICAgIGlucHV0OiBzdHJpbmdbXTtcclxuICAgIG91dHB1dDogc3RyaW5nW107XHJcbiAgICBidWlsZHM/OiBzdHJpbmdbXTtcclxuXHJcbiAgICBzdGF0aWMgaGFzRXh0ZW5zaW9uKGlucHV0OiBzdHJpbmdbXSwgZXh0ZW5zaW9uOiBzdHJpbmcpOiBib29sZWFue1xyXG5cclxuICAgICAgICBjb25zdCBtYXRoRXhwcmVzc2lvbiA9IG5ldyBSZWdFeHAoJ1xcXFwuJyArIGV4dGVuc2lvbiArICckJyk7XHJcblxyXG4gICAgICAgIGZvcihjb25zdCBwYXRoIG9mIGlucHV0KVxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZ2xvYi5zeW5jKHBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5tYXRjaChtYXRoRXhwcmVzc2lvbikpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0J1aWxke1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3V0RGlyPzogc3RyaW5nO1xyXG4gICAgb3V0RGlyVmVyc2lvbmluZz86IGJvb2xlYW47XHJcbiAgICBvdXREaXJOYW1lPzogYm9vbGVhbjtcclxuICAgIGNzcz86IE1hdGVDb25maWdDU1NDb25maWc7XHJcbiAgICBqcz86IE1hdGVDb25maWdKU0NvbmZpZztcclxuICAgIHRzPzogTWF0ZUNvbmZpZ1RTQ29uZmlnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpe1xyXG4gICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKCFidWlsZC5vdXREaXJWZXJzaW9uaW5nKVxyXG4gICAgICAgICAgICBidWlsZC5vdXREaXJWZXJzaW9uaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICghYnVpbGQub3V0RGlyTmFtZSlcclxuICAgICAgICAgICAgYnVpbGQub3V0RGlyTmFtZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvLyBDU1NcclxuXHJcbiAgICAgICAgaWYgKGJ1aWxkLmNzcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC5jc3MgPSBuZXcgTWF0ZUNvbmZpZ0NTU0NvbmZpZygpO1xyXG4gICAgXHJcbiAgICAgICAgTWF0ZUNvbmZpZ0NTU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuY3NzKTtcclxuICAgIFxyXG4gICAgICAgIC8vIEpTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC5qcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC5qcyA9IG5ldyBNYXRlQ29uZmlnSlNDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdKU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuanMpO1xyXG4gICAgXHJcbiAgICAgICAgLy8gVFNcclxuXHJcbiAgICAgICAgaWYgKGJ1aWxkLnRzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGJ1aWxkLnRzID0gbmV3IE1hdGVDb25maWdUU0NvbmZpZygpO1xyXG4gICAgXHJcbiAgICAgICAgTWF0ZUNvbmZpZ1RTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC50cyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBvdXREaXJTdWZmaXg/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQ1NTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cclxuICAgIG1pbmlmeT86IGJvb2xlYW47XHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuO1xyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoY3NzOiBNYXRlQ29uZmlnQ1NTQ29uZmlnKTogdm9pZCB7XHJcbiAgICBcclxuICAgICAgICBpZiAoY3NzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjc3MubWluaWZ5ID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChjc3Muc291cmNlTWFwID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGNzcy5zb3VyY2VNYXAgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdKU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlne1xyXG5cclxuICAgIG1pbmlmeT86IGJvb2xlYW47XHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuO1xyXG4gICAgZGVjbGFyYXRpb24/OiBib29sZWFuO1xyXG4gICAgd2ViQ2xlYW4/OiBib29sZWFuO1xyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoanM6IE1hdGVDb25maWdKU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5taW5pZnkgPSB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5zb3VyY2VNYXAgPSB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLmRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGpzLmRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYgKGpzLndlYkNsZWFuID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGpzLndlYkNsZWFuID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnVFNDb25maWcgZXh0ZW5kcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBjb21waWxlck9wdGlvbnM/OiB0c0NvbXBpbGVyT3B0aW9ucztcclxuXHJcbiAgICBzdGF0aWMgZGVjbGFyYXRpb25Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zPzogdHNDb21waWxlck9wdGlvbnMpOiB0c0NvbXBpbGVyT3B0aW9uc3tcclxuXHJcbiAgICAgICAgdmFyIHZhbHVlOnRzQ29tcGlsZXJPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGNvbXBpbGVyT3B0aW9ucylcclxuICAgICAgICAgICAgdmFsdWVba2V5XSA9IGNvbXBpbGVyT3B0aW9uc1trZXldO1xyXG4gICAgXHJcbiAgICAgICAgdmFsdWUuZGVjbGFyYXRpb24gPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICByZXR1cm4gdmFsdWUgO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQodHM6IE1hdGVDb25maWdUU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKHRzLmNvbXBpbGVyT3B0aW9ucyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0cy5jb21waWxlck9wdGlvbnMgPSB7IH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSB0c0NvbXBpbGVyT3B0aW9uc3tcclxuICAgIC8vIHRvIGJlIGlnbm9yZWRcclxuICAgIGRlY2xhcmF0aW9uPzogYm9vbGVhbixcclxuICAgIHNvdXJjZU1hcD86IGJvb2xlYW4sXHJcbiAgICBvdXREaXI/OiBzdHJpbmcsXHJcbiAgICBvdXRGaWxlPzogc3RyaW5nXHJcbn0iXX0=
