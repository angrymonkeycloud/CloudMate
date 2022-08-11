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
var gifsicle = require("imagemin-gifsicle");
var imagemin_pngquant_1 = require("imagemin-pngquant");
var mozjpeg = require("imagemin-mozjpeg");
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
                                    image_1.oldSize = fs.readFileSync(file).byteLength;
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
        var result = imagemin([image.filePath], {
            destination: image.destination,
            plugins: image.plugins,
            glob: false
        });
        result.then(function (e) {
            var destinationPath = image.destination + '/' + image.filePath.split('/').pop();
            var newZise = fs.readFileSync(destinationPath).byteLength;
            if (newZise > image.oldSize)
                fs.copyFile(image.filePath, destinationPath, function (err) {
                    if (err)
                        throw err;
                    console.log('File was copied to destination');
                });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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M0QsV0FBaUMsRUFBWixLQUFBLEtBQUssQ0FBQyxNQUFNLEVBQVosY0FBWSxFQUFaLElBQVk7b0JBQXRCLE1BQU07b0JBQ2hCLFdBQStCLEVBQVgsS0FBQSxLQUFLLENBQUMsS0FBSyxFQUFYLGNBQVcsRUFBWCxJQUFXLEVBQUU7d0JBQXRCLEtBQUs7d0JBRVQsYUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUVuRSxXQUFXLEdBQUcsTUFBTSxDQUFDO3dCQUV6QixJQUFJLGFBQWE7NEJBQ2hCLFdBQVcsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUV6RSxjQUFjLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ25ELFlBQVksR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLGNBQWMsQ0FBQzt3QkFFeEQsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO3FCQUNsQjtpQkFBQTs7OztLQUNGO0lBbkxNLDBCQUFXLEdBQXlCLEVBQUUsQ0FBQztJQUN2QyxvQkFBSyxHQUFpQixFQUFFLENBQUM7SUFDekIsb0NBQXFCLEdBQUcsS0FBSyxDQUFDO0lBa0x0QyxxQkFBQztDQXJMRCxBQXFMQyxJQUFBO0FBckxZLHdDQUFjIiwiZmlsZSI6ImNvbXByZXNzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxuaW1wb3J0IHsgTWF0ZUNvbmZpZywgTWF0ZUNvbmZpZ0ltYWdlIH0gZnJvbSAnLi9jb25maWcnO1xyXG5pbXBvcnQgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xyXG5pbXBvcnQgaW1hZ2VtaW4gPSByZXF1aXJlKCdpbWFnZW1pbicpO1xyXG5pbXBvcnQgc3ZnbyA9IHJlcXVpcmUoJ2ltYWdlbWluLXN2Z28nKTtcclxuaW1wb3J0IGdpZnNpY2xlID0gcmVxdWlyZSgnaW1hZ2VtaW4tZ2lmc2ljbGUnKTtcclxuaW1wb3J0IHBuZ3F1YW50IGZyb20gJ2ltYWdlbWluLXBuZ3F1YW50JztcclxuaW1wb3J0IG1vempwZWcgPSByZXF1aXJlKCdpbWFnZW1pbi1tb3pqcGVnJyk7XHJcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xyXG5pbXBvcnQgZGVsID0gcmVxdWlyZSgnZGVsJyk7XHJcbiBcclxuLy9pbXBvcnQgb3B0aXBuZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW9wdGlwbmcnKTtcclxuLy9pbXBvcnQgaW1hZ2VtaW5KcGVndHJhbiA9IHJlcXVpcmUoJ2ltYWdlbWluLWpwZWd0cmFuJyk7XHJcbmNsYXNzIEltYWdlUXVldWUge1xyXG5cdHB1YmxpYyBmaWxlUGF0aDogc3RyaW5nO1xyXG5cdHB1YmxpYyBkZXN0aW5hdGlvbjogc3RyaW5nO1xyXG5cdHB1YmxpYyBwbHVnaW5zOiBhbnlbXTtcclxuXHRwdWJsaWMgb2xkU2l6ZTpudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29tcHJlc3NvciB7XHJcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xyXG5cdHN0YXRpYyBxdWV1ZTogSW1hZ2VRdWV1ZVtdID0gW107XHJcblx0c3RhdGljIGNvbXByZXNzaW9uSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcpIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLmltYWdlcyA9PT0gdW5kZWZpbmVkKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uZmlnLmltYWdlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblxyXG5cdFx0XHRjb25zdCB3YXRjaFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0ZmlsZS5pbnB1dC5mb3JFYWNoKChwYXRoKSA9PiB7XHJcblx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pXHJcblx0XHRcdFx0Lm9uKCd1bmxpbmsnLCAoZmlsZVBhdGgpID0+IHsgdGhpcy5kZWxldGUoZmlsZSwgZmlsZVBhdGgpOyB9KVxyXG5cdFx0XHRcdC5vbignYWRkJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5xdWV1ZUltYWdlcyhmaWxlKTtcclxuXHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQub24oJ2NoYW5nZScsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucXVldWVJbWFnZXMoZmlsZSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZXhlY3V0ZShjb25maWcpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZyk6IHZvaWQge1xyXG5cclxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGltYWdlKTogdm9pZCA9PiB7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLnF1ZXVlSW1hZ2VzKGltYWdlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cclxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGFzeW5jIHF1ZXVlSW1hZ2VzKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIG92ZXJyaWRlOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHRcdFx0XHJcblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiBpbWFnZS5vdXRwdXQpXHJcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRnbG9iLnN5bmMoaW5wdXQsIHsgbm9kaXI6IHRydWUgfSkuZm9yRWFjaChhc3luYyAoZmlsZSkgPT4ge1xyXG5cclxuXHRcdFx0XHRcdGlmIChNYXRlQ29tcHJlc3Nvci5xdWV1ZS5tYXAob2JqID0+IG9iai5maWxlUGF0aCkuaW5kZXhPZihmaWxlKSAhPT0gLTEpXHJcblx0XHRcdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBmaWxlRXh0ZW50aW9uID0gZmlsZS5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgcGx1Z2lucyA9IFtdO1xyXG5cdFx0XHRcdFx0XHJcblxyXG5cclxuXHRcdFx0XHRcdHN3aXRjaCAoZmlsZUV4dGVudGlvbikge1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcInN2Z1wiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChzdmdvKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcInBuZ1wiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChwbmdxdWFudCh7XHJcblx0XHRcdFx0XHRcdFx0XHRxdWFsaXR5OlswLjYsMC44XVxyXG5cdFx0XHRcdFx0XHRcdH0pKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJqcGVnXCI6XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJqcGdcIjpcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2gobW96anBlZygpKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJnaWZcIjpcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2goZ2lmc2ljbGUoKSk7XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChwbHVnaW5zLmxlbmd0aCA9PT0gMClcclxuXHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdGxldCBkZXN0aW5hdGlvbiA9IG91dHB1dDtcclxuXHJcblx0XHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcclxuXHRcdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZSkuc3Vic3RyaW5nKGJhc2VEaXJlY3RvcnkubGVuZ3RoKTtcclxuXHJcblx0XHRcdFx0XHRsZXQgZG9Db21wcmVzcyA9IHRydWU7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCFvdmVycmlkZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGZpbGUucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKGZzLmV4aXN0c1N5bmMoZGVzdGluYXRpb24gKyAnLycgKyBvdXRwdXRGaWxlTmFtZSkpXHJcblx0XHRcdFx0XHRcdFx0ZG9Db21wcmVzcyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChkb0NvbXByZXNzKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlUXVldWUoKTtcclxuXHRcdFx0XHRcdFx0aW1hZ2UuZmlsZVBhdGggPSBmaWxlO1xyXG5cdFx0XHRcdFx0XHRpbWFnZS5kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uO1xyXG5cdFx0XHRcdFx0XHRpbWFnZS5wbHVnaW5zID0gcGx1Z2lucztcclxuXHRcdFx0XHRcdFx0aW1hZ2Uub2xkU2l6ZT1mcy5yZWFkRmlsZVN5bmMoZmlsZSkuYnl0ZUxlbmd0aDtcclxuXHRcdFx0XHRcdFx0TWF0ZUNvbXByZXNzb3IucXVldWUucHVzaChpbWFnZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fVxyXG5cdH1cclxuXHJcblx0c3RhdGljIGNvbXByZXNzSW1hZ2VzKGlzQ29udGludW91cyA9IGZhbHNlKSB7XHJcblxyXG5cdFx0aWYgKE1hdGVDb21wcmVzc29yLnF1ZXVlLmxlbmd0aCA9PSAwKSB7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzaW9uSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFpc0NvbnRpbnVvdXMgJiYgTWF0ZUNvbXByZXNzb3IuY29tcHJlc3Npb25JblByb2dyZXNzKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3Npb25JblByb2dyZXNzID0gdHJ1ZTtcclxuXHJcblx0XHRjb25zdCBpbWFnZSA9IE1hdGVDb21wcmVzc29yLnF1ZXVlLnNoaWZ0KCk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gaW1hZ2VtaW4oW2ltYWdlLmZpbGVQYXRoXSwge1xyXG5cdFx0XHRkZXN0aW5hdGlvbjogaW1hZ2UuZGVzdGluYXRpb24sXHJcblx0XHRcdHBsdWdpbnM6IGltYWdlLnBsdWdpbnMsXHJcblx0XHRcdGdsb2I6IGZhbHNlXHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXN1bHQudGhlbigoZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBkZXN0aW5hdGlvblBhdGg9aW1hZ2UuZGVzdGluYXRpb24gKyAnLycgKyBpbWFnZS5maWxlUGF0aC5zcGxpdCgnLycpLnBvcCgpO1xyXG4gICAgICAgICAgICBjb25zdCBuZXdaaXNlID0gZnMucmVhZEZpbGVTeW5jKGRlc3RpbmF0aW9uUGF0aCkuYnl0ZUxlbmd0aDtcclxuXHRcdFx0aWYobmV3WmlzZT5pbWFnZS5vbGRTaXplIClcclxuXHRcdFx0XHRmcy5jb3B5RmlsZShpbWFnZS5maWxlUGF0aCxkZXN0aW5hdGlvblBhdGgsKGVycik9PntcclxuXHRcdFx0XHRcdGlmIChlcnIpIHRocm93IGVycjtcclxuICBcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZpbGUgd2FzIGNvcGllZCB0byBkZXN0aW5hdGlvbicpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXN1bHQuY2F0Y2goKGUpID0+IHtcclxuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3NJbWFnZXModHJ1ZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBkZWxldGUoaW1hZ2U6IE1hdGVDb25maWdJbWFnZSwgZmlsZVBhdGg6IHN0cmluZykge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZVBhdGgucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbGVUb0RlbGV0ZSA9IGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWU7XHJcblxyXG5cdFx0XHRcdGRlbChmaWxlVG9EZWxldGUpO1xyXG5cdFx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==
