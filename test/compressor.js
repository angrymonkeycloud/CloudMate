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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MateCompressor = void 0;
var fs = require("fs");
var path = require("path");
var chokidar = require("chokidar");
var imagemin_1 = __importDefault(require("imagemin"));
var imagemin_svgo_1 = __importDefault(require("imagemin-svgo"));
var gifsicle = require("imagemin-gifsicle");
var imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
var mozjpeg = require("imagemin-mozjpeg");
var glob = require("glob");
var del = require("del");
var imagemin_sharp_1 = __importDefault(require("imagemin-sharp"));
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
    MateCompressor.queueImages = function (imageConfig, override) {
        if (override === void 0) { override = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, output;
            var _this = this;
            return __generator(this, function (_b) {
                _loop_1 = function (output) {
                    var _loop_2 = function (input) {
                        var baseDirectory = !this_1.isFile(input) ? path.dirname(input) : null;
                        glob.sync(input, { nodir: true }).forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var fileExtention, destination, runPlugins, outputFileName, fileExists, plugins, image;
                            var _this = this;
                            return __generator(this, function (_a) {
                                if (MateCompressor.queue.map(function (obj) { return obj.filePath; }).indexOf(file) !== -1)
                                    return [2];
                                fileExtention = file.split('.').pop().toLowerCase();
                                destination = output;
                                if (baseDirectory)
                                    destination = output + path.dirname(file).substring(baseDirectory.length);
                                runPlugins = true;
                                outputFileName = file.replace(/^.*[\\\/]/, '');
                                if (imageConfig.outputFormat)
                                    outputFileName = outputFileName.replace(/\.[^/.]+$/, "") + '.' + imageConfig.outputFormat;
                                fileExists = fs.existsSync(destination + '/' + outputFileName);
                                if (!override && fileExists)
                                    runPlugins = false;
                                plugins = [];
                                switch (fileExtention) {
                                    case "png":
                                    case "jpeg":
                                    case "jpg":
                                    case "gif":
                                    case "webp":
                                    case "avif":
                                    case "tiff":
                                        plugins.push((0, imagemin_sharp_1.default)({
                                            chainSharp: function (originalImage) { return __awaiter(_this, void 0, void 0, function () {
                                                var sharpResult;
                                                return __generator(this, function (_a) {
                                                    sharpResult = originalImage;
                                                    sharpResult = originalImage
                                                        .resize(imageConfig.maxWidth, imageConfig.maxHeight, {
                                                        fit: 'inside',
                                                        withoutEnlargement: true
                                                    });
                                                    if (imageConfig.outputFormat) {
                                                        fileExtention = imageConfig.outputFormat.toLowerCase();
                                                        sharpResult.toFormat(imageConfig.outputFormat);
                                                    }
                                                    return [2, sharpResult];
                                                });
                                            }); },
                                        }));
                                        break;
                                    default: break;
                                }
                                switch (fileExtention) {
                                    case "svg":
                                        plugins.push((0, imagemin_svgo_1.default)());
                                        break;
                                    case "png":
                                        plugins.push((0, imagemin_pngquant_1.default)({
                                            quality: [0.6, 0.8]
                                        }));
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
                                if (runPlugins) {
                                    image = new ImageQueue();
                                    image.filePath = file;
                                    image.destination = destination;
                                    image.plugins = plugins;
                                    image.oldSize = fs.readFileSync(file).byteLength;
                                    image.Config = imageConfig;
                                    MateCompressor.queue.push(image);
                                }
                                return [2];
                            });
                        }); });
                    };
                    for (var _c = 0, _d = imageConfig.input; _c < _d.length; _c++) {
                        var input = _d[_c];
                        _loop_2(input);
                    }
                };
                this_1 = this;
                for (_i = 0, _a = imageConfig.output; _i < _a.length; _i++) {
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
        var result = (0, imagemin_1.default)([image.filePath], {
            destination: image.destination,
            plugins: image.plugins,
            glob: false
        });
        result.then(function (e) {
            if (!image.Config.outputFormat) {
                var destinationPath = image.destination + '/' + image.filePath.split('/').pop();
                var newZise = fs.readFileSync(destinationPath).byteLength;
                if (newZise > image.oldSize)
                    fs.copyFile(image.filePath, destinationPath, function (err) {
                        if (err)
                            throw err;
                    });
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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WixjQUFZLEVBQVosSUFBWTtvQkFBdEIsTUFBTTtvQkFDaEIsV0FBK0IsRUFBWCxLQUFBLEtBQUssQ0FBQyxLQUFLLEVBQVgsY0FBVyxFQUFYLElBQVcsRUFBRTt3QkFBdEIsS0FBSzt3QkFFVCxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBRW5FLFdBQVcsR0FBRyxNQUFNLENBQUM7d0JBRXpCLElBQUksYUFBYTs0QkFDaEIsV0FBVyxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBRXpFLGNBQWMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbkQsWUFBWSxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsY0FBYyxDQUFDO3dCQUV4RCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ2xCO2lCQUFBOzs7O0tBQ0Y7SUE1Tk0sMEJBQVcsR0FBeUIsRUFBRSxDQUFDO0lBQ3ZDLG9CQUFLLEdBQWlCLEVBQUUsQ0FBQztJQUN6QixvQ0FBcUIsR0FBRyxLQUFLLENBQUM7SUEyTnRDLHFCQUFDO0NBOU5ELEFBOE5DLElBQUE7QUE5Tlksd0NBQWMiLCJmaWxlIjoiY29tcHJlc3Nvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgeyBNYXRlQ29uZmlnLCBNYXRlQ29uZmlnSW1hZ2UgfSBmcm9tICcuL2NvbmZpZyc7XHJcbmltcG9ydCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XHJcbmltcG9ydCBpbWFnZW1pbiBmcm9tICdpbWFnZW1pbic7XHJcbmltcG9ydCBzdmdvIGZyb20gJ2ltYWdlbWluLXN2Z28nO1xyXG5pbXBvcnQgZ2lmc2ljbGUgPSByZXF1aXJlKCdpbWFnZW1pbi1naWZzaWNsZScpO1xyXG5pbXBvcnQgcG5ncXVhbnQgZnJvbSAnaW1hZ2VtaW4tcG5ncXVhbnQnO1xyXG5pbXBvcnQgbW96anBlZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW1vempwZWcnKTtcclxuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XHJcbmltcG9ydCBkZWwgPSByZXF1aXJlKCdkZWwnKTtcclxuaW1wb3J0IHNoYXJwIGZyb20gJ3NoYXJwJztcclxuaW1wb3J0IGltYWdlbWluU2hhcnAgZnJvbSAnaW1hZ2VtaW4tc2hhcnAnO1xyXG5cclxuY2xhc3MgSW1hZ2VRdWV1ZSB7XHJcblx0cHVibGljIGZpbGVQYXRoOiBzdHJpbmc7XHJcblx0cHVibGljIGRlc3RpbmF0aW9uOiBzdHJpbmc7XHJcblx0cHVibGljIHBsdWdpbnM6IGFueVtdO1xyXG5cdHB1YmxpYyBvbGRTaXplOiBudW1iZXI7XHJcblx0cHVibGljIENvbmZpZzogTWF0ZUNvbmZpZ0ltYWdlO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWF0ZUNvbXByZXNzb3Ige1xyXG5cdHN0YXRpYyBhbGxXYXRjaGVyczogY2hva2lkYXIuRlNXYXRjaGVyW10gPSBbXTtcclxuXHRzdGF0aWMgcXVldWU6IEltYWdlUXVldWVbXSA9IFtdO1xyXG5cdHN0YXRpYyBjb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRzdGF0aWMgd2F0Y2goY29uZmlnOiBNYXRlQ29uZmlnKSB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xyXG5cclxuXHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0XHRcdGZpbGUuaW5wdXQuZm9yRWFjaCgocGF0aCkgPT4ge1xyXG5cdFx0XHRcdHdhdGNoUGF0aHMucHVzaChwYXRoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHdhdGNoUGF0aHMsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KVxyXG5cdFx0XHRcdC5vbigndW5saW5rJywgKGZpbGVQYXRoKSA9PiB7IHRoaXMuZGVsZXRlKGZpbGUsIGZpbGVQYXRoKTsgfSlcclxuXHRcdFx0XHQub24oJ2FkZCcsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucXVldWVJbWFnZXMoZmlsZSk7XHJcblx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnF1ZXVlSW1hZ2VzKGZpbGUsIHRydWUpO1xyXG5cdFx0XHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMucHVzaCh3YXRjaCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmV4ZWN1dGUoY29uZmlnKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBleGVjdXRlKGNvbmZpZz86IE1hdGVDb25maWcpOiB2b2lkIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLmltYWdlcyA9PT0gdW5kZWZpbmVkKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uZmlnLmltYWdlcy5mb3JFYWNoKChpbWFnZSk6IHZvaWQgPT4ge1xyXG5cdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZUltYWdlcyhpbWFnZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzdGF0aWMgaXNGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHJcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0cmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBxdWV1ZUltYWdlcyhpbWFnZUNvbmZpZzogTWF0ZUNvbmZpZ0ltYWdlLCBvdmVycmlkZTogYm9vbGVhbiA9IGZhbHNlKSB7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBvdXRwdXQgb2YgaW1hZ2VDb25maWcub3V0cHV0KVxyXG5cdFx0XHRmb3IgKGNvbnN0IGlucHV0IG9mIGltYWdlQ29uZmlnLmlucHV0KSB7XHJcblxyXG5cdFx0XHRcdGNvbnN0IGJhc2VEaXJlY3RvcnkgPSAhdGhpcy5pc0ZpbGUoaW5wdXQpID8gcGF0aC5kaXJuYW1lKGlucHV0KSA6IG51bGw7XHJcblxyXG5cdFx0XHRcdGdsb2Iuc3luYyhpbnB1dCwgeyBub2RpcjogdHJ1ZSB9KS5mb3JFYWNoKGFzeW5jIChmaWxlKSA9PiB7XHJcblxyXG5cdFx0XHRcdFx0aWYgKE1hdGVDb21wcmVzc29yLnF1ZXVlLm1hcChvYmogPT4gb2JqLmZpbGVQYXRoKS5pbmRleE9mKGZpbGUpICE9PSAtMSlcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdGxldCBmaWxlRXh0ZW50aW9uID0gZmlsZS5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHRcdFx0bGV0IGRlc3RpbmF0aW9uID0gb3V0cHV0O1xyXG5cclxuXHRcdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0XHRkZXN0aW5hdGlvbiA9IG91dHB1dCArIHBhdGguZGlybmFtZShmaWxlKS5zdWJzdHJpbmcoYmFzZURpcmVjdG9yeS5sZW5ndGgpO1xyXG5cclxuXHRcdFx0XHRcdGxldCBydW5QbHVnaW5zID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0XHRsZXQgb3V0cHV0RmlsZU5hbWUgPSBmaWxlLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoaW1hZ2VDb25maWcub3V0cHV0Rm9ybWF0KVxyXG5cdFx0XHRcdFx0XHRvdXRwdXRGaWxlTmFtZSA9IG91dHB1dEZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCBcIlwiKSArICcuJyArIGltYWdlQ29uZmlnLm91dHB1dEZvcm1hdDtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBmaWxlRXhpc3RzID0gZnMuZXhpc3RzU3luYyhkZXN0aW5hdGlvbiArICcvJyArIG91dHB1dEZpbGVOYW1lKVxyXG5cclxuXHRcdFx0XHRcdGlmICghb3ZlcnJpZGUgJiYgZmlsZUV4aXN0cylcclxuXHRcdFx0XHRcdFx0cnVuUGx1Z2lucyA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHBsdWdpbnMgPSBbXTtcclxuXHJcblx0XHRcdFx0XHRzd2l0Y2ggKGZpbGVFeHRlbnRpb24pIHtcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJwbmdcIjpcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZWdcIjpcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZ1wiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJ3ZWJwXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJhdmlmXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJ0aWZmXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGltYWdlbWluU2hhcnAoe1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGNoYWluU2hhcnA6IGFzeW5jIChvcmlnaW5hbEltYWdlKSA9PiB7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRsZXQgc2hhcnBSZXN1bHQgPSBvcmlnaW5hbEltYWdlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0c2hhcnBSZXN1bHQgPSBvcmlnaW5hbEltYWdlXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnJlc2l6ZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGltYWdlQ29uZmlnLm1heFdpZHRoLCBpbWFnZUNvbmZpZy5tYXhIZWlnaHQsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZpdDogJ2luc2lkZScsXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHdpdGhvdXRFbmxhcmdlbWVudDogdHJ1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoaW1hZ2VDb25maWcub3V0cHV0Rm9ybWF0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZmlsZUV4dGVudGlvbiA9IGltYWdlQ29uZmlnLm91dHB1dEZvcm1hdC50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHNoYXJwUmVzdWx0LnRvRm9ybWF0KGltYWdlQ29uZmlnLm91dHB1dEZvcm1hdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBzaGFycFJlc3VsdDtcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0fSkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3ZnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHN2Z28oKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHBuZ3F1YW50KHtcclxuXHRcdFx0XHRcdFx0XHRcdHF1YWxpdHk6IFswLjYsIDAuOF1cclxuXHRcdFx0XHRcdFx0XHR9KSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBlZ1wiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG1vempwZWcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGdpZnNpY2xlKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAocGx1Z2lucy5sZW5ndGggPT09IDApXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRpZiAocnVuUGx1Z2lucykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZVF1ZXVlKCk7XHJcblx0XHRcdFx0XHRcdGltYWdlLmZpbGVQYXRoID0gZmlsZTtcclxuXHRcdFx0XHRcdFx0aW1hZ2UuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcclxuXHRcdFx0XHRcdFx0aW1hZ2UucGx1Z2lucyA9IHBsdWdpbnM7XHJcblx0XHRcdFx0XHRcdGltYWdlLm9sZFNpemUgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZSkuYnl0ZUxlbmd0aDtcclxuXHRcdFx0XHRcdFx0aW1hZ2UuQ29uZmlnID0gaW1hZ2VDb25maWc7XHJcblx0XHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLnF1ZXVlLnB1c2goaW1hZ2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH1cclxuXHR9XHJcblxyXG5cdHN0YXRpYyBjb21wcmVzc0ltYWdlcyhpc0NvbnRpbnVvdXMgPSBmYWxzZSkge1xyXG5cclxuXHRcdGlmIChNYXRlQ29tcHJlc3Nvci5xdWV1ZS5sZW5ndGggPT0gMCkge1xyXG5cdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghaXNDb250aW51b3VzICYmIE1hdGVDb21wcmVzc29yLmNvbXByZXNzaW9uSW5Qcm9ncmVzcylcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzaW9uSW5Qcm9ncmVzcyA9IHRydWU7XHJcblxyXG5cdFx0Y29uc3QgaW1hZ2UgPSBNYXRlQ29tcHJlc3Nvci5xdWV1ZS5zaGlmdCgpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGltYWdlbWluKFtpbWFnZS5maWxlUGF0aF0sIHtcclxuXHRcdFx0ZGVzdGluYXRpb246IGltYWdlLmRlc3RpbmF0aW9uLFxyXG5cdFx0XHRwbHVnaW5zOiBpbWFnZS5wbHVnaW5zLFxyXG5cdFx0XHRnbG9iOiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LnRoZW4oKGUpID0+IHtcclxuXHJcblx0XHRcdGlmICghaW1hZ2UuQ29uZmlnLm91dHB1dEZvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IGRlc3RpbmF0aW9uUGF0aCA9IGltYWdlLmRlc3RpbmF0aW9uICsgJy8nICsgaW1hZ2UuZmlsZVBhdGguc3BsaXQoJy8nKS5wb3AoKTtcclxuXHRcdFx0XHRjb25zdCBuZXdaaXNlID0gZnMucmVhZEZpbGVTeW5jKGRlc3RpbmF0aW9uUGF0aCkuYnl0ZUxlbmd0aDtcclxuXHJcblx0XHRcdFx0aWYgKG5ld1ppc2UgPiBpbWFnZS5vbGRTaXplKVxyXG5cdFx0XHRcdFx0ZnMuY29weUZpbGUoaW1hZ2UuZmlsZVBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgKGVycikgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoZXJyKSB0aHJvdyBlcnI7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXN1bHQuY2F0Y2goKGUpID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBkZWxldGUoaW1hZ2U6IE1hdGVDb25maWdJbWFnZSwgZmlsZVBhdGg6IHN0cmluZykge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZVBhdGgucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbGVUb0RlbGV0ZSA9IGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWU7XHJcblxyXG5cdFx0XHRcdGRlbChmaWxlVG9EZWxldGUpO1xyXG5cdFx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==
