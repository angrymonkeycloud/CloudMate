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
exports.MateCompressor = void 0;
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var imagemin = require("imagemin");
var svgo = require("imagemin-svgo");
var mozjpeg = require("imagemin-mozjpeg");
var optipng = require("imagemin-optipng");
var gifsicle = require("imagemin-gifsicle");
var glob = require("glob");
var del = require("del");
var ImageQueue = (function () {
    function ImageQueue() {
    }
    return ImageQueue;
}());
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
                .on('unlink', function (filePath) { _this.delete(file, filePath); })
                .on('add', function () {
                _this.queueImages(file);
                MateCompressor.compressImages();
            })
                .on('change', function () {
                _this.queueImages(file, true);
                MateCompressor.compressImages();
            });
            _this.allWatchers.push(watch);
        });
        this.execute(config);
    };
    MateCompressor.execute = function (config) {
        if (config.images === undefined)
            return;
        config.images.forEach(function (image) {
            MateCompressor.queueImages(image);
        });
        MateCompressor.compressImages();
    };
    MateCompressor.isFile = function (filePath) {
        if (!fs.existsSync(filePath))
            return false;
        return fs.statSync(filePath).isFile();
    };
    MateCompressor.queueImages = function (image, override) {
        if (override === void 0) { override = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, output;
            var _this = this;
            return __generator(this, function (_b) {
                _loop_1 = function (output) {
                    var _loop_2 = function (input) {
                        var baseDirectory = !this_1.isFile(input) ? path.dirname(input) : null;
                        glob.sync(input, { nodir: true }).forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var fileExtention, plugins, destination, doCompress, outputFileName, image_1;
                            return __generator(this, function (_a) {
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
                                doCompress = true;
                                if (!override) {
                                    outputFileName = file.replace(/^.*[\\\/]/, '');
                                    if (fs.existsSync(destination + '/' + outputFileName))
                                        doCompress = false;
                                }
                                if (doCompress) {
                                    image_1 = new ImageQueue();
                                    image_1.filePath = file;
                                    image_1.destination = destination;
                                    image_1.plugins = plugins;
                                    MateCompressor.queue.push(image_1);
                                }
                                return [2];
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
    MateCompressor.compressImages = function () {
        if (MateCompressor.queue.length == 0)
            return;
        var image = MateCompressor.queue.shift();
        var result = imagemin([image.filePath], {
            destination: image.destination,
            plugins: image.plugins,
            glob: false
        });
        result.then(function (e) {
            MateCompressor.compressImages();
        });
    };
    MateCompressor.delete = function (image, filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, output, _b, _c, input, baseDirectory, destination, outputFileName, fileToDelete;
            return __generator(this, function (_d) {
                for (_i = 0, _a = image.output; _i < _a.length; _i++) {
                    output = _a[_i];
                    for (_b = 0, _c = image.input; _b < _c.length; _b++) {
                        input = _c[_b];
                        baseDirectory = !this.isFile(input) ? path.dirname(input) : null;
                        destination = output;
                        if (baseDirectory)
                            destination = output + path.dirname(filePath).substring(baseDirectory.length);
                        outputFileName = filePath.replace(/^.*[\\\/]/, '');
                        fileToDelete = destination + '/' + outputFileName;
                        del(fileToDelete);
                    }
                }
                return [2];
            });
        });
    };
    MateCompressor.allWatchers = [];
    MateCompressor.queue = [];
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RUFBWixjQUFZLEVBQVosSUFBWTtvQkFBdEIsTUFBTTtvQkFDaEIsV0FBK0IsRUFBWCxLQUFBLEtBQUssQ0FBQyxLQUFLLEVBQVgsY0FBVyxFQUFYLElBQVcsRUFBRTt3QkFBdEIsS0FBSzt3QkFFVCxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBRW5FLFdBQVcsR0FBRyxNQUFNLENBQUM7d0JBRXpCLElBQUksYUFBYTs0QkFDaEIsV0FBVyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBRXpFLGNBQWMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbkQsWUFBWSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsY0FBYyxDQUFDO3dCQUV4RCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ2xCO2lCQUFBOzs7O0tBQ0Y7SUF4Sk0sMEJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBQ3ZDLG9CQUFLLEdBQWlCLEVBQUUsQ0FBQztJQXdKakMscUJBQUM7Q0ExSkQsQUEwSkMsSUFBQTtBQTFKWSx3Q0FBYyIsImZpbGUiOiJjb21wcmVzc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuaW1wb3J0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbmltcG9ydCB7IE1hdGVDb25maWcsIE1hdGVDb25maWdJbWFnZSB9IGZyb20gJy4vY29uZmlnJztcclxuaW1wb3J0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcclxuaW1wb3J0IGltYWdlbWluID0gcmVxdWlyZSgnaW1hZ2VtaW4nKTtcclxuaW1wb3J0IHN2Z28gPSByZXF1aXJlKCdpbWFnZW1pbi1zdmdvJyk7XHJcbmltcG9ydCBtb3pqcGVnID0gcmVxdWlyZSgnaW1hZ2VtaW4tbW96anBlZycpO1xyXG5pbXBvcnQgb3B0aXBuZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW9wdGlwbmcnKTtcclxuaW1wb3J0IGdpZnNpY2xlID0gcmVxdWlyZSgnaW1hZ2VtaW4tZ2lmc2ljbGUnKTtcclxuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XHJcbmltcG9ydCBkZWwgPSByZXF1aXJlKCdkZWwnKTtcclxuXHJcblxyXG5jbGFzcyBJbWFnZVF1ZXVlIHtcclxuXHRwdWJsaWMgZmlsZVBhdGg6IHN0cmluZztcclxuXHRwdWJsaWMgZGVzdGluYXRpb246IHN0cmluZztcclxuXHRwdWJsaWMgcGx1Z2luczogYW55W107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29tcHJlc3NvciB7XHJcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xyXG5cdHN0YXRpYyBxdWV1ZTogSW1hZ2VRdWV1ZVtdID0gW107XHJcblx0c3RhdGljIHdhdGNoKGNvbmZpZzogTWF0ZUNvbmZpZykge1xyXG5cclxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGUpID0+IHtcclxuXHJcblx0XHRcdGNvbnN0IHdhdGNoUGF0aHM6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0XHRmaWxlLmlucHV0LmZvckVhY2goKHBhdGgpID0+IHtcclxuXHRcdFx0XHR3YXRjaFBhdGhzLnB1c2gocGF0aCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3Qgd2F0Y2ggPSBjaG9raWRhci53YXRjaCh3YXRjaFBhdGhzLCB7IHBlcnNpc3RlbnQ6IHRydWUgfSlcclxuXHRcdFx0XHQub24oJ3VubGluaycsIChmaWxlUGF0aCkgPT4geyB0aGlzLmRlbGV0ZShmaWxlLCBmaWxlUGF0aCk7IH0pXHJcblx0XHRcdFx0Lm9uKCdhZGQnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnF1ZXVlSW1hZ2VzKGZpbGUpO1xyXG5cdFx0XHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5vbignY2hhbmdlJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5xdWV1ZUltYWdlcyhmaWxlLCB0cnVlKTtcclxuXHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLnB1c2god2F0Y2gpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnKTogdm9pZCB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoaW1hZ2UpOiB2b2lkID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IucXVldWVJbWFnZXMoaW1hZ2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGlzRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblxyXG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSlcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdHJldHVybiBmcy5zdGF0U3luYyhmaWxlUGF0aCkuaXNGaWxlKCk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYXN5bmMgcXVldWVJbWFnZXMoaW1hZ2U6IE1hdGVDb25maWdJbWFnZSwgb3ZlcnJpZGU6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRnbG9iLnN5bmMoaW5wdXQsIHsgbm9kaXI6IHRydWUgfSkuZm9yRWFjaChhc3luYyAoZmlsZSkgPT4ge1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBwbHVnaW5zID0gW107XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3ZnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHN2Z28oKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG9wdGlwbmcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBlZ1wiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG1vempwZWcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGdpZnNpY2xlKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAocGx1Z2lucy5sZW5ndGggPT09IDApXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGJhc2VEaXJlY3RvcnkpXHJcblx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uID0gb3V0cHV0ICsgcGF0aC5kaXJuYW1lKGZpbGUpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdFx0bGV0IGRvQ29tcHJlc3MgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmICghb3ZlcnJpZGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBmaWxlLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChmcy5leGlzdHNTeW5jKGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWUpKVxyXG5cdFx0XHRcdFx0XHRcdGRvQ29tcHJlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHRcdFx0aWYgKGRvQ29tcHJlc3MpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2VRdWV1ZSgpO1xyXG5cdFx0XHRcdFx0XHRpbWFnZS5maWxlUGF0aCA9IGZpbGU7XHJcblx0XHRcdFx0XHRcdGltYWdlLmRlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XHJcblx0XHRcdFx0XHRcdGltYWdlLnBsdWdpbnMgPSBwbHVnaW5zO1xyXG5cdFx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZS5wdXNoKGltYWdlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY29tcHJlc3NJbWFnZXMoKSB7XHJcblxyXG5cdFx0aWYgKE1hdGVDb21wcmVzc29yLnF1ZXVlLmxlbmd0aCA9PSAwKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgaW1hZ2UgPSBNYXRlQ29tcHJlc3Nvci5xdWV1ZS5zaGlmdCgpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGltYWdlbWluKFtpbWFnZS5maWxlUGF0aF0sIHtcclxuXHRcdFx0ZGVzdGluYXRpb246IGltYWdlLmRlc3RpbmF0aW9uLFxyXG5cdFx0XHRwbHVnaW5zOiBpbWFnZS5wbHVnaW5zLFxyXG5cdFx0XHRnbG9iOiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LnRoZW4oKGUpID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYXN5bmMgZGVsZXRlKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIGZpbGVQYXRoOiBzdHJpbmcpIHtcclxuXHJcblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiBpbWFnZS5vdXRwdXQpXHJcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcclxuXHJcblx0XHRcdFx0Y29uc3QgYmFzZURpcmVjdG9yeSA9ICF0aGlzLmlzRmlsZShpbnB1dCkgPyBwYXRoLmRpcm5hbWUoaW5wdXQpIDogbnVsbDtcclxuXHJcblx0XHRcdFx0bGV0IGRlc3RpbmF0aW9uID0gb3V0cHV0O1xyXG5cclxuXHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcclxuXHRcdFx0XHRcdGRlc3RpbmF0aW9uID0gb3V0cHV0ICsgcGF0aC5kaXJuYW1lKGZpbGVQYXRoKS5zdWJzdHJpbmcoYmFzZURpcmVjdG9yeS5sZW5ndGgpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGZpbGVQYXRoLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHRcdFx0XHRjb25zdCBmaWxlVG9EZWxldGUgPSBkZXN0aW5hdGlvbiArICcvJyArIG91dHB1dEZpbGVOYW1lO1xyXG5cclxuXHRcdFx0XHRkZWwoZmlsZVRvRGVsZXRlKTtcclxuXHRcdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=
