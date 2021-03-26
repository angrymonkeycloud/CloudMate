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
                            var fileExtention, plugins, destination, doCompress, outputFileName, alreadyQueued_1, image_1;
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
                                    alreadyQueued_1 = false;
                                    MateCompressor.queue.forEach(function (element) {
                                        if (element.filePath == file) {
                                            alreadyQueued_1 = true;
                                            return;
                                        }
                                    });
                                    if (!alreadyQueued_1) {
                                        image_1 = new ImageQueue();
                                        image_1.filePath = file;
                                        image_1.destination = destination;
                                        image_1.plugins = plugins;
                                        MateCompressor.queue.push(image_1);
                                    }
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
        if (MateCompressor.queue.length == 0) {
            MateCompressor.compressionInProgress = false;
            return;
        }
        if (MateCompressor.compressionInProgress)
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
            MateCompressor.compressImages();
        });
        result.catch(function (e) {
            console.log(e);
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
    MateCompressor.compressionInProgress = false;
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFaLGNBQVksRUFBWixJQUFZO29CQUF0QixNQUFNO29CQUNoQixXQUErQixFQUFYLEtBQUEsS0FBSyxDQUFDLEtBQUssRUFBWCxjQUFXLEVBQVgsSUFBVyxFQUFFO3dCQUF0QixLQUFLO3dCQUVULGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFFbkUsV0FBVyxHQUFHLE1BQU0sQ0FBQzt3QkFFekIsSUFBSSxhQUFhOzRCQUNoQixXQUFXLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFFekUsY0FBYyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNuRCxZQUFZLEdBQUcsV0FBVyxHQUFHLEdBQUcsR0FBRyxjQUFjLENBQUM7d0JBRXhELEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztxQkFDbEI7aUJBQUE7Ozs7S0FDRjtJQTFMTSwwQkFBVyxHQUF5QixFQUFFLENBQUM7SUFDdkMsb0JBQUssR0FBaUIsRUFBRSxDQUFDO0lBQ3pCLG9DQUFxQixHQUFHLEtBQUssQ0FBQztJQXlMdEMscUJBQUM7Q0E1TEQsQUE0TEMsSUFBQTtBQTVMWSx3Q0FBYyIsImZpbGUiOiJjb21wcmVzc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuaW1wb3J0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbmltcG9ydCB7IE1hdGVDb25maWcsIE1hdGVDb25maWdJbWFnZSB9IGZyb20gJy4vY29uZmlnJztcclxuaW1wb3J0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcclxuaW1wb3J0IGltYWdlbWluID0gcmVxdWlyZSgnaW1hZ2VtaW4nKTtcclxuaW1wb3J0IHN2Z28gPSByZXF1aXJlKCdpbWFnZW1pbi1zdmdvJyk7XHJcbmltcG9ydCBtb3pqcGVnID0gcmVxdWlyZSgnaW1hZ2VtaW4tbW96anBlZycpO1xyXG5pbXBvcnQgb3B0aXBuZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW9wdGlwbmcnKTtcclxuaW1wb3J0IGdpZnNpY2xlID0gcmVxdWlyZSgnaW1hZ2VtaW4tZ2lmc2ljbGUnKTtcclxuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XHJcbmltcG9ydCBkZWwgPSByZXF1aXJlKCdkZWwnKTtcclxuXHJcblxyXG5jbGFzcyBJbWFnZVF1ZXVlIHtcclxuXHRwdWJsaWMgZmlsZVBhdGg6IHN0cmluZztcclxuXHRwdWJsaWMgZGVzdGluYXRpb246IHN0cmluZztcclxuXHRwdWJsaWMgcGx1Z2luczogYW55W107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlQ29tcHJlc3NvciB7XHJcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xyXG5cdHN0YXRpYyBxdWV1ZTogSW1hZ2VRdWV1ZVtdID0gW107XHJcblx0c3RhdGljIGNvbXByZXNzaW9uSW5Qcm9ncmVzcyA9IGZhbHNlO1xyXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcpIHtcclxuXHJcblx0XHRpZiAoY29uZmlnLmltYWdlcyA9PT0gdW5kZWZpbmVkKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uZmlnLmltYWdlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcblxyXG5cdFx0XHRjb25zdCB3YXRjaFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0ZmlsZS5pbnB1dC5mb3JFYWNoKChwYXRoKSA9PiB7XHJcblx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pXHJcblx0XHRcdFx0Lm9uKCd1bmxpbmsnLCAoZmlsZVBhdGgpID0+IHsgdGhpcy5kZWxldGUoZmlsZSwgZmlsZVBhdGgpOyB9KVxyXG5cdFx0XHRcdC5vbignYWRkJywgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5xdWV1ZUltYWdlcyhmaWxlKTtcclxuXHRcdFx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQub24oJ2NoYW5nZScsICgpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMucXVldWVJbWFnZXMoZmlsZSwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc0ltYWdlcygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZXhlY3V0ZShjb25maWcpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZyk6IHZvaWQge1xyXG5cclxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGltYWdlKTogdm9pZCA9PiB7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLnF1ZXVlSW1hZ2VzKGltYWdlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHN0YXRpYyBpc0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cclxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGFzeW5jIHF1ZXVlSW1hZ2VzKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIG92ZXJyaWRlOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHJcblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiBpbWFnZS5vdXRwdXQpXHJcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcclxuXHJcblx0XHRcdFx0Y29uc3QgYmFzZURpcmVjdG9yeSA9ICF0aGlzLmlzRmlsZShpbnB1dCkgPyBwYXRoLmRpcm5hbWUoaW5wdXQpIDogbnVsbDtcclxuXHJcblx0XHRcdFx0Z2xvYi5zeW5jKGlucHV0LCB7IG5vZGlyOiB0cnVlIH0pLmZvckVhY2goYXN5bmMgKGZpbGUpID0+IHtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBmaWxlRXh0ZW50aW9uID0gZmlsZS5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgcGx1Z2lucyA9IFtdO1xyXG5cclxuXHRcdFx0XHRcdHN3aXRjaCAoZmlsZUV4dGVudGlvbikge1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcInN2Z1wiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChzdmdvKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcInBuZ1wiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChvcHRpcG5nKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZWdcIjpcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZ1wiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChtb3pqcGVnKCkpO1xyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcImdpZlwiOlxyXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChnaWZzaWNsZSgpKTtcclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKHBsdWdpbnMubGVuZ3RoID09PSAwKVxyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0XHRcdFx0bGV0IGRlc3RpbmF0aW9uID0gb3V0cHV0O1xyXG5cclxuXHRcdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0XHRkZXN0aW5hdGlvbiA9IG91dHB1dCArIHBhdGguZGlybmFtZShmaWxlKS5zdWJzdHJpbmcoYmFzZURpcmVjdG9yeS5sZW5ndGgpO1xyXG5cclxuXHRcdFx0XHRcdGxldCBkb0NvbXByZXNzID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0XHRpZiAoIW92ZXJyaWRlKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZS5yZXBsYWNlKC9eLipbXFxcXFxcL10vLCAnJyk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoZnMuZXhpc3RzU3luYyhkZXN0aW5hdGlvbiArICcvJyArIG91dHB1dEZpbGVOYW1lKSlcclxuXHRcdFx0XHRcdFx0XHRkb0NvbXByZXNzID0gZmFsc2U7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cclxuXHRcdFx0XHRcdGlmIChkb0NvbXByZXNzKSB7XHJcblx0XHRcdFx0XHRcdGxldCBhbHJlYWR5UXVldWVkID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZS5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGlmKGVsZW1lbnQuZmlsZVBhdGggPT0gZmlsZSl7XHJcblx0XHRcdFx0XHRcdFx0XHRhbHJlYWR5UXVldWVkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYoIWFscmVhZHlRdWV1ZWQpe1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGltYWdlID0gbmV3IEltYWdlUXVldWUoKTtcclxuXHRcdFx0XHRcdFx0XHRpbWFnZS5maWxlUGF0aCA9IGZpbGU7XHJcblx0XHRcdFx0XHRcdFx0aW1hZ2UuZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcclxuXHRcdFx0XHRcdFx0XHRpbWFnZS5wbHVnaW5zID0gcGx1Z2lucztcclxuXHRcdFx0XHRcdFx0XHRNYXRlQ29tcHJlc3Nvci5xdWV1ZS5wdXNoKGltYWdlKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY29tcHJlc3NJbWFnZXMoKSB7XHJcblxyXG5cdFx0aWYgKE1hdGVDb21wcmVzc29yLnF1ZXVlLmxlbmd0aCA9PSAwKVxyXG5cdFx0e1xyXG5cdFx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSBmYWxzZTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MpXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRNYXRlQ29tcHJlc3Nvci5jb21wcmVzc2lvbkluUHJvZ3Jlc3MgPSB0cnVlO1xyXG5cclxuXHRcdGNvbnN0IGltYWdlID0gTWF0ZUNvbXByZXNzb3IucXVldWUuc2hpZnQoKTtcclxuXHRcdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHRcdHZhciB0aW1lID0gZGF0ZS5nZXRIb3VycygpICsgXCI6XCIgKyBkYXRlLmdldFNlY29uZHMoKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcInN0YXJ0OiBcIiArIGltYWdlLmZpbGVQYXRoICsgXCIgQCBcIiArIHRpbWUpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGltYWdlbWluKFtpbWFnZS5maWxlUGF0aF0sIHtcclxuXHRcdFx0ZGVzdGluYXRpb246IGltYWdlLmRlc3RpbmF0aW9uLFxyXG5cdFx0XHRwbHVnaW5zOiBpbWFnZS5wbHVnaW5zLFxyXG5cdFx0XHRnbG9iOiBmYWxzZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmVzdWx0LnRoZW4oKGUpID0+IHtcclxuXHRcdFx0ZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHRpbWUgPSBkYXRlLmdldEhvdXJzKCkgKyBcIjpcIiArIGRhdGUuZ2V0U2Vjb25kcygpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcImVuZDogXCIgKyBpbWFnZS5maWxlUGF0aCArIFwiIEAgXCIgKyB0aW1lKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCItLS0tLS0tLS0tLS0tLS0tLS1cIik7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXN1bHQuY2F0Y2goKGUpID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coZSk7XHJcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzSW1hZ2VzKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBhc3luYyBkZWxldGUoaW1hZ2U6IE1hdGVDb25maWdJbWFnZSwgZmlsZVBhdGg6IHN0cmluZykge1xyXG5cclxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcclxuXHRcdFx0Zm9yIChjb25zdCBpbnB1dCBvZiBpbWFnZS5pbnB1dCkge1xyXG5cclxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xyXG5cclxuXHRcdFx0XHRsZXQgZGVzdGluYXRpb24gPSBvdXRwdXQ7XHJcblxyXG5cdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxyXG5cdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpLnN1YnN0cmluZyhiYXNlRGlyZWN0b3J5Lmxlbmd0aCk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZVBhdGgucmVwbGFjZSgvXi4qW1xcXFxcXC9dLywgJycpO1xyXG5cdFx0XHRcdGNvbnN0IGZpbGVUb0RlbGV0ZSA9IGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWU7XHJcblxyXG5cdFx0XHRcdGRlbChmaWxlVG9EZWxldGUpO1xyXG5cdFx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==
