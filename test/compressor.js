"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var imagemin = require("imagemin");
var svgo = require("imagemin-svgo");
var mozjpeg = require("imagemin-mozjpeg");
var optipng = require("imagemin-optipng");
var gifsicle = require("imagemin-gifsicle");
var glob = require("glob");
var MateCompressor = (function () {
    function MateCompressor() {
    }
    MateCompressor.watch = function (config) {
        var _this = this;
        if (config.images === undefined)
            return;
        config.images.forEach(function (file) {
            var watchPaths = [];
            file.input.forEach(function (path) {
                watchPaths.push(path);
            });
            var watch = chokidar.watch(watchPaths, { persistent: true })
                .on('add', function () { _this.compress(file, config); })
                .on('change', function () { _this.compress(file, config); });
            _this.allWatchers.push(watch);
        });
        this.execute(config);
    };
    MateCompressor.execute = function (config) {
        if (config.images === undefined)
            return;
        config.images.forEach(function (image) {
            MateCompressor.compress(image, config);
        });
    };
    MateCompressor.isFile = function (filePath) {
        if (!fs.existsSync(filePath))
            return false;
        return fs.statSync(filePath).isFile();
    };
    MateCompressor.compress = function (image, config) {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, output;
            var _this = this;
            return __generator(this, function (_b) {
                _loop_1 = function (output) {
                    var _loop_2 = function (input) {
                        var baseDirectory = !this_1.isFile(input) ? path.dirname(input) : null;
                        glob.sync(input, { nodir: true }).forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var fileExtention, plugins, destination, outputFileName;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        fileExtention = file.split('.').pop().toLowerCase();
                                        plugins = [];
                                        switch (fileExtention) {
                                            case "svg":
                                                plugins.push(svgo());
                                                break;
                                            case "png":
                                                plugins.push(optipng());
                                                break;
                                            case "jpeg":
                                            case "jpg":
                                                plugins.push(mozjpeg());
                                                break;
                                            case "gif":
                                                plugins.push(gifsicle());
                                                break;
                                            default:
                                                break;
                                        }
                                        if (plugins.length === 0)
                                            return [2];
                                        destination = output;
                                        if (baseDirectory)
                                            destination = output + path.dirname(file).substring(baseDirectory.length);
                                        outputFileName = file.replace(/^.*[\\\/]/, '');
                                        if (!!fs.existsSync(destination + '/' + outputFileName)) return [3, 2];
                                        return [4, imagemin([file], {
                                                destination: destination,
                                                plugins: plugins,
                                                glob: false
                                            })];
                                    case 1:
                                        _a.sent();
                                        _a.label = 2;
                                    case 2: return [2];
                                }
                            });
                        }); });
                    };
                    for (var _i = 0, _a = image.input; _i < _a.length; _i++) {
                        var input = _a[_i];
                        _loop_2(input);
                    }
                };
                this_1 = this;
                for (_i = 0, _a = image.output; _i < _a.length; _i++) {
                    output = _a[_i];
                    _loop_1(output);
                }
                return [2];
            });
        });
    };
    MateCompressor.allWatchers = [];
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXByZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1QkFBMEI7QUFDMUIsMkJBQThCO0FBRTlCLG1DQUFzQztBQUN0QyxtQ0FBc0M7QUFDdEMsb0NBQXVDO0FBQ3ZDLDBDQUE2QztBQUM3QywwQ0FBNkM7QUFDN0MsNENBQStDO0FBQy9DLDJCQUE4QjtBQUc5QjtJQUFBO0lBbUdBLENBQUM7SUFoR08sb0JBQUssR0FBWixVQUFhLE1BQWtCO1FBQS9CLGlCQXFCQztRQW5CQSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssU0FBUztZQUM5QixPQUFPO1FBRVIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFJO1lBRTFCLElBQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztZQUVoQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFDLElBQUk7Z0JBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQztpQkFDNUQsRUFBRSxDQUFDLEtBQUssRUFBRSxjQUFRLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNqRCxFQUFFLENBQUMsUUFBUSxFQUFFLGNBQVEsS0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV2RCxLQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVNLHNCQUFPLEdBQWQsVUFBZSxNQUFtQjtRQUVqQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssU0FBUztZQUM5QixPQUFPO1FBRVIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLO1lBQzNCLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVjLHFCQUFNLEdBQXJCLFVBQXNCLFFBQWdCO1FBRXJDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztRQUVkLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRVksdUJBQVEsR0FBckIsVUFBc0IsS0FBc0IsRUFBRSxNQUFrQjs7Ozs7b0NBRXBELE1BQU07NENBQ0wsS0FBSzt3QkFFZixJQUFNLGFBQWEsR0FBRyxDQUFDLE9BQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBRXZFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQU8sSUFBSTs7Ozs7d0NBRTlDLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dDQUVwRCxPQUFPLEdBQUcsRUFBRSxDQUFDO3dDQUVuQixRQUFRLGFBQWEsRUFBRTs0Q0FFdEIsS0FBSyxLQUFLO2dEQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnREFDckIsTUFBTTs0Q0FFUCxLQUFLLEtBQUs7Z0RBQ1QsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dEQUN4QixNQUFNOzRDQUVQLEtBQUssTUFBTSxDQUFDOzRDQUNaLEtBQUssS0FBSztnREFDVCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0RBQ3hCLE1BQU07NENBRVAsS0FBSyxLQUFLO2dEQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnREFDekIsTUFBTTs0Q0FFUDtnREFDQyxNQUFNO3lDQUNQO3dDQUVELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDOzRDQUN2QixXQUFPO3dDQUVKLFdBQVcsR0FBRyxNQUFNLENBQUM7d0NBRXpCLElBQUksYUFBYTs0Q0FDaEIsV0FBVyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7d0NBRXJFLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQzs2Q0FFakQsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxHQUFHLEdBQUcsY0FBYyxDQUFDLEVBQWxELGNBQWtEO3dDQUNyRCxXQUFNLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dEQUN0QixXQUFXLEVBQUUsV0FBVztnREFDeEIsT0FBTyxFQUFFLE9BQU87Z0RBQ2hCLElBQUksRUFBRSxLQUFLOzZDQUNYLENBQUMsRUFBQTs7d0NBSkYsU0FJRSxDQUFDOzs7Ozs2QkFDSixDQUFDLENBQUE7O29CQWpESCxLQUFvQixVQUFXLEVBQVgsS0FBQSxLQUFLLENBQUMsS0FBSyxFQUFYLGNBQVcsRUFBWCxJQUFXO3dCQUExQixJQUFNLEtBQUssU0FBQTtnQ0FBTCxLQUFLO3FCQWtEZjs7O2dCQW5ERixXQUFpQyxFQUFaLEtBQUEsS0FBSyxDQUFDLE1BQU0sRUFBWixjQUFZLEVBQVosSUFBWTtvQkFBdEIsTUFBTTs0QkFBTixNQUFNO2lCQW1EZjs7OztLQUNGO0lBakdNLDBCQUFXLEdBQXlCLEVBQUUsQ0FBQztJQWtHL0MscUJBQUM7Q0FuR0QsQUFtR0MsSUFBQTtBQW5HWSx3Q0FBYyIsImZpbGUiOiJjb21wcmVzc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuaW1wb3J0IHsgTWF0ZUNvbmZpZywgTWF0ZUNvbmZpZ0ltYWdlIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmltcG9ydCBpbWFnZW1pbiA9IHJlcXVpcmUoJ2ltYWdlbWluJyk7XG5pbXBvcnQgc3ZnbyA9IHJlcXVpcmUoJ2ltYWdlbWluLXN2Z28nKTtcbmltcG9ydCBtb3pqcGVnID0gcmVxdWlyZSgnaW1hZ2VtaW4tbW96anBlZycpO1xuaW1wb3J0IG9wdGlwbmcgPSByZXF1aXJlKCdpbWFnZW1pbi1vcHRpcG5nJyk7XG5pbXBvcnQgZ2lmc2ljbGUgPSByZXF1aXJlKCdpbWFnZW1pbi1naWZzaWNsZScpO1xuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XG5cblxuZXhwb3J0IGNsYXNzIE1hdGVDb21wcmVzc29yIHtcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xuXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcpIHtcblxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGUpID0+IHtcblxuXHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcblxuXHRcdFx0ZmlsZS5pbnB1dC5mb3JFYWNoKChwYXRoKSA9PiB7XG5cdFx0XHRcdHdhdGNoUGF0aHMucHVzaChwYXRoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHdhdGNoUGF0aHMsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KVxuXHRcdFx0XHQub24oJ2FkZCcsICgpID0+IHsgdGhpcy5jb21wcmVzcyhmaWxlLCBjb25maWcpOyB9KVxuXHRcdFx0XHQub24oJ2NoYW5nZScsICgpID0+IHsgdGhpcy5jb21wcmVzcyhmaWxlLCBjb25maWcpOyB9KTtcblxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuZXhlY3V0ZShjb25maWcpO1xuXHR9XG5cblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZyk6IHZvaWQge1xuXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcblx0XHRcdHJldHVybjtcblxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoaW1hZ2UpOiB2b2lkID0+IHtcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzKGltYWdlLCBjb25maWcpO1xuXHRcdH0pO1xuXHR9XG5cblx0cHJpdmF0ZSBzdGF0aWMgaXNGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcblxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuXHR9XG5cblx0c3RhdGljIGFzeW5jIGNvbXByZXNzKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIGNvbmZpZzogTWF0ZUNvbmZpZykge1xuXG5cdFx0Zm9yIChjb25zdCBvdXRwdXQgb2YgaW1hZ2Uub3V0cHV0KVxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xuXG5cdFx0XHRcdGNvbnN0IGJhc2VEaXJlY3RvcnkgPSAhdGhpcy5pc0ZpbGUoaW5wdXQpID8gcGF0aC5kaXJuYW1lKGlucHV0KSA6IG51bGw7XG5cblx0XHRcdFx0Z2xvYi5zeW5jKGlucHV0LCB7IG5vZGlyOiB0cnVlIH0pLmZvckVhY2goYXN5bmMgKGZpbGUpID0+IHtcblxuXHRcdFx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcblxuXHRcdFx0XHRcdGNvbnN0IHBsdWdpbnMgPSBbXTtcblxuXHRcdFx0XHRcdHN3aXRjaCAoZmlsZUV4dGVudGlvbikge1xuXG5cdFx0XHRcdFx0XHRjYXNlIFwic3ZnXCI6XG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChzdmdvKCkpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSBcInBuZ1wiOlxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2gob3B0aXBuZygpKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgXCJqcGVnXCI6XG5cdFx0XHRcdFx0XHRjYXNlIFwianBnXCI6XG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChtb3pqcGVnKCkpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSBcImdpZlwiOlxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2goZ2lmc2ljbGUoKSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocGx1Z2lucy5sZW5ndGggPT09IDApXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XG5cblx0XHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcblx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uID0gb3V0cHV0ICsgcGF0aC5kaXJuYW1lKGZpbGUpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XG5cblx0XHRcdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGZpbGUucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xuXG5cdFx0XHRcdFx0aWYgKCFmcy5leGlzdHNTeW5jKGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWUpKVxuXHRcdFx0XHRcdFx0YXdhaXQgaW1hZ2VtaW4oW2ZpbGVdLCB7XG5cdFx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uOiBkZXN0aW5hdGlvbixcblx0XHRcdFx0XHRcdFx0cGx1Z2luczogcGx1Z2lucyxcblx0XHRcdFx0XHRcdFx0Z2xvYjogZmFsc2Vcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHR9XG59XG4iXX0=
