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
                                if (MateCompressor.queue.map(function (obj) { return obj.filePath; }).indexOf(file) !== -1)
                                    return [2];
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
    MateCompressor.compressImages = function (isContinuous) {
        if (isContinuous === void 0) { isContinuous = false; }
        if (MateCompressor.queue.length == 0) {
            MateCompressor.compressionInProgress = false;
            return;
        }
        if (!isContinuous && MateCompressor.compressionInProgress)
            return;
        MateCompressor.compressionInProgress = true;
        var image = MateCompressor.queue.shift();
        var date = new Date();
        var time = date.getHours() + ":" + date.getSeconds();
        console.log("start: " + image.filePath + " @ " + time);
        var result = imagemin([image.filePath], {
            destination: image.destination,
            plugins: image.plugins,
            glob: false
        });
        result.then(function (e) {
            date = new Date();
            time = date.getHours() + ":" + date.getSeconds();
            console.log("end: " + image.filePath + " @ " + time);
            console.log("------------------");
            MateCompressor.compressImages(true);
        });
        result.catch(function (e) {
            MateCompressor.compressImages(true);
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
    MateCompressor.compressionInProgress = false;
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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aEIsV0FBK0IsRUFBWCxLQUFBLEtBQUssQ0FBQyxLQUFLLEVBQVgsY0FBVyxFQUFYLElBQVcsRUFBRTt3QkFBdEIsS0FBSzt3QkFFVCxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBRW5FLFdBQVcsR0FBRyxNQUFNLENBQUM7d0JBRXpCLElBQUksYUFBYTs0QkFDaEIsV0FBVyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBRXpFLGNBQWMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbkQsWUFBWSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsY0FBYyxDQUFDO3dCQUV4RCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ2xCO2lCQUFBOzs7O0tBQ0Y7SUFoTE0sMEJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBQ3ZDLG9CQUFLLEdBQWlCLEVBQUUsQ0FBQztJQUN6QixvQ0FBcUIsR0FBRyxLQUFLLENBQUM7SUErS3RDLHFCQUFDO0NBbExELEFBa0xDLElBQUE7QUFsTFksd0NBQWMiLCJmaWxlIjoiY29tcHJlc3Nvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnSW1hZ2UgfSBmcm9tICcuL2NvbmZpZyc7XHJcbmltcG9ydCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XHJcbmltcG9ydCBpbWFnZW1pbiA9IHJlcXVpcmUoJ2ltYWdlbWluJyk7XHJcbmltcG9ydCBzdmdvID0gcmVxdWlyZSgnaW1hZ2VtaW4tc3ZnbycpO1xyXG5pbXBvcnQgbW96anBlZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW1vempwZWcnKTtcclxuaW1wb3J0IG9wdGlwbmcgPSByZXF1aXJlKCdpbWFnZW1pbi1vcHRpcG5nJyk7XHJcbmltcG9ydCBnaWZzaWNsZSA9IHJlcXVpcmUoJ2ltYWdlbWluLWdpZnNpY2xlJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xyXG5pbXBvcnQgZGVsID0gcmVxdWlyZSgnZGVsJyk7XHJcblxyXG5cclxuY2xhc3MgSW1hZ2VRdWV1ZSB7XHJcblx0cHVibGljIGZpbGVQYXRoOiBzdHJpbmc7XHJcblx0cHVibGljIGRlc3RpbmF0aW9uOiBzdHJpbmc7XHJcblx0cHVibGljIHBsdWdpbnM6IGFueVtdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbXByZXNzb3Ige1xyXG5cdHN0YXRpYyBhbGxXYXRjaGVyczogY2hva2lkYXIuRlNXYXRjaGVyW10gPSBbXTtcclxuXHRzdGF0aWMgcXVldWU6IEltYWdlUXVldWVbXSA9IFtdO1xyXG5cdHN0YXRpYyBjb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRzdGF0aWMgd2F0Y2goY29uZmlnOiBNYXRlQ29uZmlnKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xyXG5cclxuXHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xyXG5cdFx0XHRcdHdhdGNoUGF0aHMucHVzaChwYXRoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHdhdGNoUGF0aHMsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KVxyXG5cdFx0XHRcdC5vbigndW5saW5rJywgKGZpbGVQYXRoKSA9PiB7IHRoaXMuZGVsZXRlKGZpbGUsIGZpbGVQYXRoKTsgfSlcclxuXHRcdFx0XHQub24oJ2FkZCcsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucXVldWVJbWFnZXMoZmlsZSk7XHJcblx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnF1ZXVlSW1hZ2VzKGZpbGUsIHRydWUpO1xyXG5cdFx0XHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmV4ZWN1dGUoY29uZmlnKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBleGVjdXRlKGNvbmZpZz86IE1hdGVDb25maWcpOiB2b2lkIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLmltYWdlcyA9PT0gdW5kZWZpbmVkKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uZmlnLmltYWdlcy5mb3JFYWNoKChpbWFnZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZUltYWdlcyhpbWFnZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzdGF0aWMgaXNGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHJcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0cmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBxdWV1ZUltYWdlcyhpbWFnZTogTWF0ZUNvbmZpZ0ltYWdlLCBvdmVycmlkZTogYm9vbGVhbiA9IGZhbHNlKSB7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBvdXRwdXQgb2YgaW1hZ2Uub3V0cHV0KVxyXG5cdFx0XHRmb3IgKGNvbnN0IGlucHV0IG9mIGltYWdlLmlucHV0KSB7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGJhc2VEaXJlY3RvcnkgPSAhdGhpcy5pc0ZpbGUoaW5wdXQpID8gcGF0aC5kaXJuYW1lKGlucHV0KSA6IG51bGw7XHJcblxyXG5cdFx0XHRcdGdsb2Iuc3luYyhpbnB1dCwgeyBub2RpcjogdHJ1ZSB9KS5mb3JFYWNoKGFzeW5jIChmaWxlKSA9PiB7XHJcblxyXG5cdFx0XHRcdFx0aWYgKE1hdGVDb21wcmVzc29yLnF1ZXVlLm1hcChvYmogPT4gb2JqLmZpbGVQYXRoKS5pbmRleE9mKGZpbGUpICE9PSAtMSlcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGZpbGVFeHRlbnRpb24gPSBmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBwbHVnaW5zID0gW107XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3ZnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHN2Z28oKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG9wdGlwbmcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBlZ1wiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG1vempwZWcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGdpZnNpY2xlKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAocGx1Z2lucy5sZW5ndGggPT09IDApXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGJhc2VEaXJlY3RvcnkpXHJcblx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uID0gb3V0cHV0ICsgcGF0aC5kaXJuYW1lKGZpbGUpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdFx0bGV0IGRvQ29tcHJlc3MgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGlmICghb3ZlcnJpZGUpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBmaWxlLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChmcy5leGlzdHNTeW5jKGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWUpKVxyXG5cdFx0XHRcdFx0XHRcdGRvQ29tcHJlc3MgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHRcdFx0aWYgKGRvQ29tcHJlc3MpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2VRdWV1ZSgpO1xyXG5cdFx0XHRcdFx0XHRpbWFnZS5maWxlUGF0aCA9IGZpbGU7XHJcblx0XHRcdFx0XHRcdGltYWdlLmRlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XHJcblx0XHRcdFx0XHRcdGltYWdlLnBsdWdpbnMgPSBwbHVnaW5zO1xyXG5cdFx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZS5wdXNoKGltYWdlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY29tcHJlc3NJbWFnZXMoaXNDb250aW51b3VzID0gZmFsc2UpIHtcclxuXHJcblx0XHRpZiAoTWF0ZUNvbXByZXNzb3IucXVldWUubGVuZ3RoID09IDApIHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3Npb25JblByb2dyZXNzID0gZmFsc2U7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIWlzQ29udGludW91cyAmJiBNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSB0cnVlO1xyXG5cclxuXHRcdGNvbnN0IGltYWdlID0gTWF0ZUNvbXByZXNzb3IucXVldWUuc2hpZnQoKTtcclxuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdHZhciB0aW1lID0gZGF0ZS5nZXRIb3VycygpICsgXCI6XCIgKyBkYXRlLmdldFNlY29uZHMoKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcInN0YXJ0OiBcIiArIGltYWdlLmZpbGVQYXRoICsgXCIgQCBcIiArIHRpbWUpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGltYWdlbWluKFtpbWFnZS5maWxlUGF0aF0sIHtcclxuXHRcdFx0ZGVzdGluYXRpb246IGltYWdlLmRlc3RpbmF0aW9uLFxyXG5cdFx0XHRwbHVnaW5zOiBpbWFnZS5wbHVnaW5zLFxyXG5cdFx0XHRnbG9iOiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LnRoZW4oKGUpID0+IHtcclxuXHRcdFx0ZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHRpbWUgPSBkYXRlLmdldEhvdXJzKCkgKyBcIjpcIiArIGRhdGUuZ2V0U2Vjb25kcygpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcImVuZDogXCIgKyBpbWFnZS5maWxlUGF0aCArIFwiIEAgXCIgKyB0aW1lKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LmNhdGNoKChlKSA9PiB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKHR5cGVvZihlKSk7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKHRydWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYXN5bmMgZGVsZXRlKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIGZpbGVQYXRoOiBzdHJpbmcpIHtcclxuXHJcblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiBpbWFnZS5vdXRwdXQpXHJcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcclxuXHJcblx0XHRcdFx0Y29uc3QgYmFzZURpcmVjdG9yeSA9ICF0aGlzLmlzRmlsZShpbnB1dCkgPyBwYXRoLmRpcm5hbWUoaW5wdXQpIDogbnVsbDtcclxuXHJcblx0XHRcdFx0bGV0IGRlc3RpbmF0aW9uID0gb3V0cHV0O1xyXG5cclxuXHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcclxuXHRcdFx0XHRcdGRlc3RpbmF0aW9uID0gb3V0cHV0ICsgcGF0aC5kaXJuYW1lKGZpbGVQYXRoKS5zdWJzdHJpbmcoYmFzZURpcmVjdG9yeS5sZW5ndGgpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGZpbGVQYXRoLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHRcdFx0XHRjb25zdCBmaWxlVG9EZWxldGUgPSBkZXN0aW5hdGlvbiArICcvJyArIG91dHB1dEZpbGVOYW1lO1xyXG5cclxuXHRcdFx0XHRkZWwoZmlsZVRvRGVsZXRlKTtcclxuXHRcdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=
