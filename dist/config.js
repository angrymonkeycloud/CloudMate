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
        if (js.declaration === undefined)
            js.declaration = true;
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
            ts.compilerOptions = {};
        // ignore values
        // ts.compilerOptions.declaration = false;
        // ts.compilerOptions.sourceMap = false;
        // ts.compilerOptions.outDir = undefined;
        // ts.compilerOptions.outFile = undefined;
    };
    return MateConfigTSConfig;
}(MateConfigBaseConfig));
exports.MateConfigTSConfig = MateConfigTSConfig;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1QkFBMEI7QUFFMUI7SUFjSSxvQkFBb0IsS0FBWSxFQUFFLFFBQWdCLEVBQUUsTUFBd0IsRUFBRSxPQUEwQjtRQUVwRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUV0QixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUztZQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBUU8sK0JBQVUsR0FBbEI7UUFDSSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFTyxtQ0FBYyxHQUF0QixVQUF1QixJQUFZO1FBRS9CLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTztZQUNiLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUV0QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELGtDQUFhLEdBQWI7UUFFSSxJQUFJLElBQUksQ0FBQyxJQUFJO1lBQ1QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRXJCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZDLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxxQ0FBZ0IsR0FBaEI7UUFFSSxJQUFJLElBQUksQ0FBQyxPQUFPO1lBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRXhCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTFDLE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7SUFFRCw2QkFBUSxHQUFSLFVBQVMsSUFBWTtRQUVqQixJQUFJLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtZQUNsRCxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBRWpCLEtBQW1CLFVBQVcsRUFBWCxLQUFBLElBQUksQ0FBQyxNQUFNLEVBQVgsY0FBVyxFQUFYLElBQVc7WUFBMUIsSUFBTSxLQUFLLFNBQUE7WUFDWCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSTtnQkFDbkIsT0FBTyxLQUFLLENBQUM7U0FBQTtJQUN6QixDQUFDO0lBRUQsaUNBQVksR0FBWjtRQUVJLFNBQVM7UUFFVCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFFM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFzQjtZQUV2QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSztnQkFDcEIsY0FBYyxHQUFHLElBQUksQ0FBQztZQUV0QixlQUFlLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGNBQWMsRUFDbkI7WUFDSSxJQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxlQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzlCO1FBRUQsUUFBUTtRQUVSLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBb0I7WUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFDN0I7Z0JBQ0ksSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzNCO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBekdNLGNBQUcsR0FBRztRQUVULElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVoRCxJQUFNLFVBQVUsR0FBZSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRTNELElBQUksTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0RyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEIsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQyxDQUFDO0lBZ0dOLGlCQUFDO0NBNUdELEFBNEdDLElBQUE7QUE1R1ksZ0NBQVU7QUE4R3ZCO0lBQUE7SUFJQSxDQUFDO0lBQUQscUJBQUM7QUFBRCxDQUpBLEFBSUMsSUFBQTtBQUpZLHdDQUFjO0FBTTNCO0lBU0kseUJBQVksS0FBYTtRQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUN0QixDQUFDO0lBRU0sNEJBQVksR0FBbkIsVUFBb0IsS0FBc0I7UUFFdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0I7WUFDdkIsS0FBSyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUVuQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVU7WUFDakIsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFN0IsTUFBTTtRQUVOLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxTQUFTO1lBQ3ZCLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBRTFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFNUMsS0FBSztRQUVMLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxTQUFTO1lBQ3RCLEtBQUssQ0FBQyxFQUFFLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBRXhDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFMUMsS0FBSztRQUVMLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxTQUFTO1lBQ3RCLEtBQUssQ0FBQyxFQUFFLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBRXhDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUNMLHNCQUFDO0FBQUQsQ0ExQ0EsQUEwQ0MsSUFBQTtBQTFDWSwwQ0FBZTtBQTRDNUI7SUFBQTtJQUdBLENBQUM7SUFBRCwyQkFBQztBQUFELENBSEEsQUFHQyxJQUFBO0FBSFksb0RBQW9CO0FBS2pDO0lBQXlDLHVDQUFvQjtJQUE3RDs7SUFhQSxDQUFDO0lBUlUsZ0NBQVksR0FBbkIsVUFBb0IsR0FBd0I7UUFFeEMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFNBQVM7WUFDeEIsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFFdEIsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDM0IsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUNMLDBCQUFDO0FBQUQsQ0FiQSxBQWFDLENBYndDLG9CQUFvQixHQWE1RDtBQWJZLGtEQUFtQjtBQWVoQztJQUF3QyxzQ0FBb0I7SUFBNUQ7O0lBaUJBLENBQUM7SUFYVSwrQkFBWSxHQUFuQixVQUFvQixFQUFzQjtRQUV0QyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssU0FBUztZQUN2QixFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUVyQixJQUFJLEVBQUUsQ0FBQyxTQUFTLEtBQUssU0FBUztZQUMxQixFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUV4QixJQUFJLEVBQUUsQ0FBQyxXQUFXLEtBQUssU0FBUztZQUM1QixFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUM5QixDQUFDO0lBQ0wseUJBQUM7QUFBRCxDQWpCQSxBQWlCQyxDQWpCdUMsb0JBQW9CLEdBaUIzRDtBQWpCWSxnREFBa0I7QUFtQi9CO0lBQXdDLHNDQUFvQjtJQUE1RDs7SUFlQSxDQUFDO0lBWFUsK0JBQVksR0FBbkIsVUFBb0IsRUFBc0I7UUFFdEMsSUFBSSxFQUFFLENBQUMsZUFBZSxLQUFLLFNBQVM7WUFDaEMsRUFBRSxDQUFDLGVBQWUsR0FBRyxFQUFHLENBQUM7UUFFN0IsZ0JBQWdCO1FBQ2hCLDBDQUEwQztRQUMxQyx3Q0FBd0M7UUFDeEMseUNBQXlDO1FBQ3pDLDBDQUEwQztJQUM5QyxDQUFDO0lBQ0wseUJBQUM7QUFBRCxDQWZBLEFBZUMsQ0FmdUMsb0JBQW9CLEdBZTNEO0FBZlksZ0RBQWtCIiwiZmlsZSI6ImNvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ3tcclxuXHJcbiAgICBzdGF0aWMgZ2V0ID0gZnVuY3Rpb24oKTogTWF0ZUNvbmZpZyB7XHJcblxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoJ21hdGVjb25maWcuanNvbicpO1xyXG5cclxuICAgICAgICBjb25zdCBjb25maWdKc29uOiBNYXRlQ29uZmlnID0gSlNPTi5wYXJzZShkYXRhLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBjb25maWcgPSBuZXcgTWF0ZUNvbmZpZyhjb25maWdKc29uLm5hbWUsIGNvbmZpZ0pzb24udmVyc2lvbiwgY29uZmlnSnNvbi5maWxlcywgY29uZmlnSnNvbi5idWlsZHMpO1xyXG5cclxuICAgICAgICBjb25maWcuc2V0VW5kZWZpbmVkKCk7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihfbmFtZTpzdHJpbmcsIF92ZXJzaW9uOiBzdHJpbmcsIF9maWxlczogTWF0ZUNvbmZpZ0ZpbGVbXSwgX2J1aWxkczogTWF0ZUNvbmZpZ0J1aWxkW10pe1xyXG5cclxuICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgICAgICB0aGlzLnZlcnNpb24gPSBfdmVyc2lvbjtcclxuICAgICAgICB0aGlzLmZpbGVzID0gX2ZpbGVzO1xyXG4gICAgICAgIHRoaXMuYnVpbGRzID0gX2J1aWxkcztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYnVpbGRzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRzID0gW107XHJcbiAgICB9XHJcbiAgICBcclxuICAgIG5hbWU/OiBzdHJpbmc7XHJcbiAgICB2ZXJzaW9uPzogc3RyaW5nO1xyXG4gICAgZmlsZXM6IE1hdGVDb25maWdGaWxlW107XHJcbiAgICBidWlsZHM6IE1hdGVDb25maWdCdWlsZFtdO1xyXG5cclxuICAgIHByaXZhdGUgcGFja2FnZTogb2JqZWN0O1xyXG4gICAgcHJpdmF0ZSBzZXRQYWNrYWdlKCl7XHJcbiAgICAgICAgdGhpcy5wYWNrYWdlID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicpLnRvU3RyaW5nKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0UGFja2FnZUluZm8oaW5mbzogc3RyaW5nKXtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnBhY2thZ2UpXHJcbiAgICAgICAgICAgIHRoaXMuc2V0UGFja2FnZSgpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5wYWNrYWdlW2luZm9dO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE91dERpck5hbWUoKTogc3RyaW5nIHtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5uYW1lKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5uYW1lO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygnbmFtZScpO1xyXG5cclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGdldE91dERpclZlcnNpb24oKTogc3RyaW5nIHtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy52ZXJzaW9uKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy52ZXJzaW9uO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQYWNrYWdlSW5mbygndmVyc2lvbicpO1xyXG5cclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEJ1aWxkKG5hbWU6IHN0cmluZyk6IE1hdGVDb25maWdCdWlsZHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCB8fCBuYW1lID09PSBudWxsIHx8IG5hbWUgPT09ICcnKVxyXG4gICAgICAgICAgICBuYW1lID0gJ2Rldic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKGNvbnN0IGJ1aWxkIG9mIHRoaXMuYnVpbGRzKVxyXG4gICAgICAgICAgICBpZiAoYnVpbGQubmFtZSA9PT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBidWlsZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgc2V0VW5kZWZpbmVkKCk6IHZvaWQge1xyXG5cclxuICAgICAgICAvLyBCdWlsZHNcclxuICAgICAgICBcclxuICAgICAgICBsZXQgZGV2QnVpbGRFeGlzdHMgPSBmYWxzZTtcclxuICAgIFxyXG4gICAgICAgIHRoaXMuYnVpbGRzLmZvckVhY2goKGJ1aWxkOiBNYXRlQ29uZmlnQnVpbGQpID0+IHtcclxuICAgIFxyXG4gICAgICAgICAgICBpZiAoYnVpbGQubmFtZSA9PT0gJ2RldicpXHJcbiAgICAgICAgICAgICAgICBkZXZCdWlsZEV4aXN0cyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgTWF0ZUNvbmZpZ0J1aWxkLnNldFVuZGVmaW5lZChidWlsZCk7XHJcbiAgICBcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKCFkZXZCdWlsZEV4aXN0cylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRldkJ1aWxkID0gbmV3IE1hdGVDb25maWdCdWlsZCgnZGV2Jyk7XHJcbiAgICAgICAgICAgIE1hdGVDb25maWdCdWlsZC5zZXRVbmRlZmluZWQoZGV2QnVpbGQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5idWlsZHMucHVzaChkZXZCdWlsZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGaWxlc1xyXG5cclxuICAgICAgICB0aGlzLmZpbGVzLmZvckVhY2goKGZpbGU6IE1hdGVDb25maWdGaWxlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChmaWxlLmJ1aWxkcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBmaWxlLmJ1aWxkcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZmlsZS5idWlsZHMucHVzaCgnZGV2Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdGaWxle1xyXG4gICAgaW5wdXQ6IHN0cmluZ1tdO1xyXG4gICAgb3V0cHV0OiBzdHJpbmdbXTtcclxuICAgIGJ1aWxkcz86IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbmZpZ0J1aWxke1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgb3V0RGlyPzogc3RyaW5nO1xyXG4gICAgb3V0RGlyVmVyc2lvbmluZz86IGJvb2xlYW47XHJcbiAgICBvdXREaXJOYW1lPzogYm9vbGVhbjtcclxuICAgIGNzcz86IE1hdGVDb25maWdDU1NDb25maWc7XHJcbiAgICBqcz86IE1hdGVDb25maWdKU0NvbmZpZztcclxuICAgIHRzPzogTWF0ZUNvbmZpZ1RTQ29uZmlnO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpe1xyXG4gICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoYnVpbGQ6IE1hdGVDb25maWdCdWlsZCk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKCFidWlsZC5vdXREaXJWZXJzaW9uaW5nKVxyXG4gICAgICAgICAgICBidWlsZC5vdXREaXJWZXJzaW9uaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICghYnVpbGQub3V0RGlyTmFtZSlcclxuICAgICAgICAgICAgYnVpbGQub3V0RGlyTmFtZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvLyBDU1NcclxuXHJcbiAgICAgICAgaWYgKGJ1aWxkLmNzcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC5jc3MgPSBuZXcgTWF0ZUNvbmZpZ0NTU0NvbmZpZygpO1xyXG4gICAgXHJcbiAgICAgICAgTWF0ZUNvbmZpZ0NTU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuY3NzKTtcclxuICAgIFxyXG4gICAgICAgIC8vIEpTXHJcblxyXG4gICAgICAgIGlmIChidWlsZC5qcyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBidWlsZC5qcyA9IG5ldyBNYXRlQ29uZmlnSlNDb25maWcoKTtcclxuICAgIFxyXG4gICAgICAgIE1hdGVDb25maWdKU0NvbmZpZy5zZXRVbmRlZmluZWQoYnVpbGQuanMpO1xyXG4gICAgXHJcbiAgICAgICAgLy8gVFNcclxuXHJcbiAgICAgICAgaWYgKGJ1aWxkLnRzID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGJ1aWxkLnRzID0gbmV3IE1hdGVDb25maWdUU0NvbmZpZygpO1xyXG4gICAgXHJcbiAgICAgICAgTWF0ZUNvbmZpZ1RTQ29uZmlnLnNldFVuZGVmaW5lZChidWlsZC50cyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQmFzZUNvbmZpZ3tcclxuXHJcbiAgICBvdXREaXJTdWZmaXg/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29uZmlnQ1NTQ29uZmlnIGV4dGVuZHMgTWF0ZUNvbmZpZ0Jhc2VDb25maWcge1xyXG5cclxuICAgIG1pbmlmeT86IGJvb2xlYW47XHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuO1xyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoY3NzOiBNYXRlQ29uZmlnQ1NTQ29uZmlnKTogdm9pZCB7XHJcbiAgICBcclxuICAgICAgICBpZiAoY3NzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjc3MubWluaWZ5ID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIGlmIChjc3Muc291cmNlTWFwID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGNzcy5zb3VyY2VNYXAgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdKU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlne1xyXG5cclxuICAgIG1pbmlmeT86IGJvb2xlYW47XHJcbiAgICBzb3VyY2VNYXA/OiBib29sZWFuO1xyXG4gICAgZGVjbGFyYXRpb24/OiBib29sZWFuO1xyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQoanM6IE1hdGVDb25maWdKU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLm1pbmlmeSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5taW5pZnkgPSB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLnNvdXJjZU1hcCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBqcy5zb3VyY2VNYXAgPSB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgaWYgKGpzLmRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIGpzLmRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb25maWdUU0NvbmZpZyBleHRlbmRzIE1hdGVDb25maWdCYXNlQ29uZmlne1xyXG5cclxuICAgIGNvbXBpbGVyT3B0aW9ucz86IHRzQ29tcGlsZXJPcHRpb25zO1xyXG5cclxuICAgIHN0YXRpYyBzZXRVbmRlZmluZWQodHM6IE1hdGVDb25maWdUU0NvbmZpZyk6IHZvaWQge1xyXG4gICAgXHJcbiAgICAgICAgaWYgKHRzLmNvbXBpbGVyT3B0aW9ucyA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0cy5jb21waWxlck9wdGlvbnMgPSB7IH07XHJcblxyXG4gICAgICAgIC8vIGlnbm9yZSB2YWx1ZXNcclxuICAgICAgICAvLyB0cy5jb21waWxlck9wdGlvbnMuZGVjbGFyYXRpb24gPSBmYWxzZTtcclxuICAgICAgICAvLyB0cy5jb21waWxlck9wdGlvbnMuc291cmNlTWFwID0gZmFsc2U7XHJcbiAgICAgICAgLy8gdHMuY29tcGlsZXJPcHRpb25zLm91dERpciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAvLyB0cy5jb21waWxlck9wdGlvbnMub3V0RmlsZSA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIHRzQ29tcGlsZXJPcHRpb25ze1xyXG4gICAgLy8gdG8gYmUgaWdub3JlZFxyXG4gICAgZGVjbGFyYXRpb24/OiBib29sZWFuLFxyXG4gICAgc291cmNlTWFwPzogYm9vbGVhbixcclxuICAgIG91dERpcj86IHN0cmluZyxcclxuICAgIG91dEZpbGU/OiBzdHJpbmdcclxufSJdfQ==
