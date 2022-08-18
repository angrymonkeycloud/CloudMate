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
