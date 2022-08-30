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
                                        plugins.push(imagemin_sharp_1.default({
                                            chainSharp: function (originalImage) { return __awaiter(_this, void 0, void 0, function () {
                                                var sharpResult, meta;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            sharpResult = originalImage;
                                                            return [4, sharpResult.metadata()];
                                                        case 1:
                                                            meta = _a.sent();
                                                            return [4, originalImage
                                                                    .resize({
                                                                    width: meta.orientation >= 5 ? imageConfig.maxHeight : imageConfig.maxWidth,
                                                                    height: meta.orientation >= 5 ? imageConfig.maxWidth : imageConfig.maxHeight,
                                                                    fit: 'inside',
                                                                    withoutEnlargement: true,
                                                                })
                                                                    .withMetadata()];
                                                        case 2:
                                                            sharpResult = _a.sent();
                                                            if (imageConfig.outputFormat) {
                                                                fileExtention = imageConfig.outputFormat.toLowerCase();
                                                                sharpResult.toFormat(imageConfig.outputFormat);
                                                            }
                                                            return [2, sharpResult];
                                                    }
                                                });
                                            }); },
                                        }));
                                        break;
                                    default: break;
                                }
                                switch (fileExtention) {
                                    case "svg":
                                        plugins.push(imagemin_svgo_1.default());
                                        break;
                                    case "png":
                                        plugins.push(imagemin_pngquant_1.default({
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
                    for (var _i = 0, _a = imageConfig.input; _i < _a.length; _i++) {
                        var input = _a[_i];
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
        var result = imagemin_1.default([image.filePath], {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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IiwiZmlsZSI6ImNvbXByZXNzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxuaW1wb3J0IHsgTWF0ZUNvbmZpZywgTWF0ZUNvbmZpZ0ltYWdlIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xyXG5pbXBvcnQgaW1hZ2VtaW4gZnJvbSAnaW1hZ2VtaW4nO1xyXG5pbXBvcnQgc3ZnbyBmcm9tICdpbWFnZW1pbi1zdmdvJztcclxuaW1wb3J0IGdpZnNpY2xlID0gcmVxdWlyZSgnaW1hZ2VtaW4tZ2lmc2ljbGUnKTtcclxuaW1wb3J0IHBuZ3F1YW50IGZyb20gJ2ltYWdlbWluLXBuZ3F1YW50JztcclxuaW1wb3J0IG1vempwZWcgPSByZXF1aXJlKCdpbWFnZW1pbi1tb3pqcGVnJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xyXG5pbXBvcnQgZGVsID0gcmVxdWlyZSgnZGVsJyk7XHJcbmltcG9ydCBpbWFnZW1pblNoYXJwIGZyb20gJ2ltYWdlbWluLXNoYXJwJztcclxuXHJcbmNsYXNzIEltYWdlUXVldWUge1xyXG5cdHB1YmxpYyBmaWxlUGF0aDogc3RyaW5nO1xyXG5cdHB1YmxpYyBkZXN0aW5hdGlvbjogc3RyaW5nO1xyXG5cdHB1YmxpYyBwbHVnaW5zOiBhbnlbXTtcclxuXHRwdWJsaWMgb2xkU2l6ZTogbnVtYmVyO1xyXG5cdHB1YmxpYyBDb25maWc6IE1hdGVDb25maWdJbWFnZTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hdGVDb21wcmVzc29yIHtcclxuXHRzdGF0aWMgYWxsV2F0Y2hlcnM6IGNob2tpZGFyLkZTV2F0Y2hlcltdID0gW107XHJcblx0c3RhdGljIHF1ZXVlOiBJbWFnZVF1ZXVlW10gPSBbXTtcclxuXHRzdGF0aWMgY29tcHJlc3Npb25JblByb2dyZXNzID0gZmFsc2U7XHJcblx0c3RhdGljIHdhdGNoKGNvbmZpZzogTWF0ZUNvbmZpZykge1xyXG5cclxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGUpID0+IHtcclxuXHJcblx0XHRcdGNvbnN0IHdhdGNoUGF0aHM6IHN0cmluZ1tdID0gW107XHJcblxyXG5cdFx0XHRmaWxlLmlucHV0LmZvckVhY2goKHBhdGgpID0+IHtcclxuXHRcdFx0XHR3YXRjaFBhdGhzLnB1c2gocGF0aCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3Qgd2F0Y2ggPSBjaG9raWRhci53YXRjaCh3YXRjaFBhdGhzLCB7IHBlcnNpc3RlbnQ6IHRydWUgfSlcclxuXHRcdFx0XHQub24oJ3VubGluaycsIChmaWxlUGF0aCkgPT4geyB0aGlzLmRlbGV0ZShmaWxlLCBmaWxlUGF0aCk7IH0pXHJcblx0XHRcdFx0Lm9uKCdhZGQnLCAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnF1ZXVlSW1hZ2VzKGZpbGUpO1xyXG5cdFx0XHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5vbignY2hhbmdlJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5xdWV1ZUltYWdlcyhmaWxlLCB0cnVlKTtcclxuXHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLnB1c2god2F0Y2gpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnKTogdm9pZCB7XHJcblxyXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoaW1hZ2UpOiB2b2lkID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IucXVldWVJbWFnZXMoaW1hZ2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc3RhdGljIGlzRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblxyXG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSlcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdHJldHVybiBmcy5zdGF0U3luYyhmaWxlUGF0aCkuaXNGaWxlKCk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgYXN5bmMgcXVldWVJbWFnZXMoaW1hZ2VDb25maWc6IE1hdGVDb25maWdJbWFnZSwgb3ZlcnJpZGU6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlQ29uZmlnLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZUNvbmZpZy5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRnbG9iLnN5bmMoaW5wdXQsIHsgbm9kaXI6IHRydWUgfSkuZm9yRWFjaChhc3luYyAoZmlsZSkgPT4ge1xyXG5cclxuXHRcdFx0XHRcdGlmIChNYXRlQ29tcHJlc3Nvci5xdWV1ZS5tYXAob2JqID0+IG9iai5maWxlUGF0aCkuaW5kZXhPZihmaWxlKSAhPT0gLTEpXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRsZXQgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdFx0XHRcdGxldCBkZXN0aW5hdGlvbiA9IG91dHB1dDtcclxuXHJcblx0XHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcclxuXHRcdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZSkuc3Vic3RyaW5nKGJhc2VEaXJlY3RvcnkubGVuZ3RoKTtcclxuXHJcblx0XHRcdFx0XHRsZXQgcnVuUGx1Z2lucyA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0bGV0IG91dHB1dEZpbGVOYW1lID0gZmlsZS5yZXBsYWNlKC9eLipbXFxcXFxcL10vLCAnJyk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGltYWdlQ29uZmlnLm91dHB1dEZvcm1hdClcclxuXHRcdFx0XHRcdFx0b3V0cHV0RmlsZU5hbWUgPSBvdXRwdXRGaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIikgKyAnLicgKyBpbWFnZUNvbmZpZy5vdXRwdXRGb3JtYXQ7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgZmlsZUV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoZGVzdGluYXRpb24gKyAnLycgKyBvdXRwdXRGaWxlTmFtZSlcclxuXHJcblx0XHRcdFx0XHRpZiAoIW92ZXJyaWRlICYmIGZpbGVFeGlzdHMpXHJcblx0XHRcdFx0XHRcdHJ1blBsdWdpbnMgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBwbHVnaW5zID0gW107XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJqcGVnXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJqcGdcIjpcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImdpZlwiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwid2VicFwiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiYXZpZlwiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwidGlmZlwiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChpbWFnZW1pblNoYXJwKHtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFpblNoYXJwOiBhc3luYyAob3JpZ2luYWxJbWFnZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRsZXQgc2hhcnBSZXN1bHQgPSBvcmlnaW5hbEltYWdlO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBtZXRhPWF3YWl0IHNoYXJwUmVzdWx0Lm1ldGFkYXRhKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNoYXJwUmVzdWx0ID0gYXdhaXQgIG9yaWdpbmFsSW1hZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQucmVzaXplKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR3aWR0aDptZXRhLm9yaWVudGF0aW9uID49NT8gaW1hZ2VDb25maWcubWF4SGVpZ2h0OiBpbWFnZUNvbmZpZy5tYXhXaWR0aCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBtZXRhLm9yaWVudGF0aW9uID49NT8gaW1hZ2VDb25maWcubWF4V2lkdGg6IGltYWdlQ29uZmlnLm1heEhlaWdodCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Zml0OiAnaW5zaWRlJyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0d2l0aG91dEVubGFyZ2VtZW50OiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC53aXRoTWV0YWRhdGEoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGltYWdlQ29uZmlnLm91dHB1dEZvcm1hdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZpbGVFeHRlbnRpb24gPSBpbWFnZUNvbmZpZy5vdXRwdXRGb3JtYXQudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzaGFycFJlc3VsdC50b0Zvcm1hdChpbWFnZUNvbmZpZy5vdXRwdXRGb3JtYXQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gc2hhcnBSZXN1bHQ7XHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdH0pKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDogYnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3ZnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHN2Z28oKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHBuZ3F1YW50KHtcclxuXHRcdFx0XHRcdFx0XHRcdHF1YWxpdHk6IFswLjYsIDAuOF1cclxuXHRcdFx0XHRcdFx0XHR9KSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBlZ1wiOlxyXG5cdFx0XHRcdFx0XHRjYXNlIFwianBnXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG1vempwZWcoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XHJcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGdpZnNpY2xlKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZiAocGx1Z2lucy5sZW5ndGggPT09IDApXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRpZiAocnVuUGx1Z2lucykge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpbWFnZSA9IG5ldyBJbWFnZVF1ZXVlKCk7XHJcblx0XHRcdFx0XHRcdGltYWdlLmZpbGVQYXRoID0gZmlsZTtcclxuXHRcdFx0XHRcdFx0aW1hZ2UuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcclxuXHRcdFx0XHRcdFx0aW1hZ2UucGx1Z2lucyA9IHBsdWdpbnM7XHJcblx0XHRcdFx0XHRcdGltYWdlLm9sZFNpemUgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZSkuYnl0ZUxlbmd0aDtcclxuXHRcdFx0XHRcdFx0aW1hZ2UuQ29uZmlnID0gaW1hZ2VDb25maWc7XHJcblx0XHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLnF1ZXVlLnB1c2goaW1hZ2UpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH1cclxuXHR9XHJcblxyXG5cdHN0YXRpYyBjb21wcmVzc0ltYWdlcyhpc0NvbnRpbnVvdXMgPSBmYWxzZSkge1xyXG5cclxuXHRcdGlmIChNYXRlQ29tcHJlc3Nvci5xdWV1ZS5sZW5ndGggPT0gMCkge1xyXG5cdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICghaXNDb250aW51b3VzICYmIE1hdGVDb21wcmVzc29yLmNvbXByZXNzaW9uSW5Qcm9ncmVzcylcclxuXHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzaW9uSW5Qcm9ncmVzcyA9IHRydWU7XHJcblxyXG5cdFx0Y29uc3QgaW1hZ2UgPSBNYXRlQ29tcHJlc3Nvci5xdWV1ZS5zaGlmdCgpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGltYWdlbWluKFtpbWFnZS5maWxlUGF0aF0sIHtcclxuXHRcdFx0ZGVzdGluYXRpb246IGltYWdlLmRlc3RpbmF0aW9uLFxyXG5cdFx0XHRwbHVnaW5zOiBpbWFnZS5wbHVnaW5zLFxyXG5cdFx0XHRnbG9iOiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LnRoZW4oKGUpID0+IHtcclxuXHJcblx0XHRcdGlmICghaW1hZ2UuQ29uZmlnLm91dHB1dEZvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IGRlc3RpbmF0aW9uUGF0aCA9IGltYWdlLmRlc3RpbmF0aW9uICsgJy8nICsgaW1hZ2UuZmlsZVBhdGguc3BsaXQoJy8nKS5wb3AoKTtcclxuXHRcdFx0XHRjb25zdCBuZXdaaXNlID0gZnMucmVhZEZpbGVTeW5jKGRlc3RpbmF0aW9uUGF0aCkuYnl0ZUxlbmd0aDtcclxuXHJcblx0XHRcdFx0aWYgKG5ld1ppc2UgPiBpbWFnZS5vbGRTaXplKVxyXG5cdFx0XHRcdFx0ZnMuY29weUZpbGUoaW1hZ2UuZmlsZVBhdGgsIGRlc3RpbmF0aW9uUGF0aCwgKGVycikgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZiAoZXJyKSB0aHJvdyBlcnI7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXN1bHQuY2F0Y2goKGUpID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBkZWxldGUoaW1hZ2U6IE1hdGVDb25maWdJbWFnZSwgZmlsZVBhdGg6IHN0cmluZykge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZVBhdGgucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbGVUb0RlbGV0ZSA9IGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWU7XHJcblxyXG5cdFx0XHRcdGRlbChmaWxlVG9EZWxldGUpO1xyXG5cdFx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==
