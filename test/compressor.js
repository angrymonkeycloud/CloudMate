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
var del = require("del");
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
                .on('add', function () { _this.compress(file); })
                .on('change', function () { _this.compress(file, true); });
            _this.allWatchers.push(watch);
        });
        this.execute(config);
    };
    MateCompressor.execute = function (config) {
        if (config.images === undefined)
            return;
        config.images.forEach(function (image) {
            MateCompressor.compress(image);
        });
    };
    MateCompressor.isFile = function (filePath) {
        if (!fs.existsSync(filePath))
            return false;
        return fs.statSync(filePath).isFile();
    };
    MateCompressor.compress = function (image, override) {
        if (override === void 0) { override = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, output;
            var _this = this;
            return __generator(this, function (_b) {
                _loop_1 = function (output) {
                    var _loop_2 = function (input) {
                        var baseDirectory = !this_1.isFile(input) ? path.dirname(input) : null;
                        glob.sync(input, { nodir: true }).forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                            var fileExtention, plugins, destination, doCompress, outputFileName;
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
                                        doCompress = true;
                                        if (!override) {
                                            outputFileName = file.replace(/^.*[\\\/]/, '');
                                            if (fs.existsSync(destination + '/' + outputFileName))
                                                doCompress = false;
                                        }
                                        if (!doCompress) return [3, 2];
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
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUE5SFksd0NBQWMiLCJmaWxlIjoiY29tcHJlc3Nvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmltcG9ydCB7IE1hdGVDb25maWcsIE1hdGVDb25maWdJbWFnZSB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5pbXBvcnQgaW1hZ2VtaW4gPSByZXF1aXJlKCdpbWFnZW1pbicpO1xuaW1wb3J0IHN2Z28gPSByZXF1aXJlKCdpbWFnZW1pbi1zdmdvJyk7XG5pbXBvcnQgbW96anBlZyA9IHJlcXVpcmUoJ2ltYWdlbWluLW1vempwZWcnKTtcbmltcG9ydCBvcHRpcG5nID0gcmVxdWlyZSgnaW1hZ2VtaW4tb3B0aXBuZycpO1xuaW1wb3J0IGdpZnNpY2xlID0gcmVxdWlyZSgnaW1hZ2VtaW4tZ2lmc2ljbGUnKTtcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xuaW1wb3J0IGRlbCA9IHJlcXVpcmUoJ2RlbCcpO1xuXG5leHBvcnQgY2xhc3MgTWF0ZUNvbXByZXNzb3Ige1xuXHRzdGF0aWMgYWxsV2F0Y2hlcnM6IGNob2tpZGFyLkZTV2F0Y2hlcltdID0gW107XG5cblx0c3RhdGljIHdhdGNoKGNvbmZpZzogTWF0ZUNvbmZpZykge1xuXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcblx0XHRcdHJldHVybjtcblxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXG5cdFx0XHRjb25zdCB3YXRjaFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuXG5cdFx0XHRmaWxlLmlucHV0LmZvckVhY2goKHBhdGgpID0+IHtcblx0XHRcdFx0d2F0Y2hQYXRocy5wdXNoKHBhdGgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHdhdGNoID0gY2hva2lkYXIud2F0Y2god2F0Y2hQYXRocywgeyBwZXJzaXN0ZW50OiB0cnVlIH0pXG5cdFx0XHRcdC5vbigndW5saW5rJywgKGZpbGVQYXRoKSA9PiB7IHRoaXMuZGVsZXRlKGZpbGUsIGZpbGVQYXRoKTsgfSlcblx0XHRcdFx0Lm9uKCdhZGQnLCAoKSA9PiB7IHRoaXMuY29tcHJlc3MoZmlsZSk7IH0pXG5cdFx0XHRcdC5vbignY2hhbmdlJywgKCkgPT4geyB0aGlzLmNvbXByZXNzKGZpbGUsIHRydWUpOyB9KTtcblxuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKHdhdGNoKTtcblx0XHR9KTtcblxuXHRcdHRoaXMuZXhlY3V0ZShjb25maWcpO1xuXHR9XG5cblx0c3RhdGljIGV4ZWN1dGUoY29uZmlnPzogTWF0ZUNvbmZpZyk6IHZvaWQge1xuXG5cdFx0aWYgKGNvbmZpZy5pbWFnZXMgPT09IHVuZGVmaW5lZClcblx0XHRcdHJldHVybjtcblxuXHRcdGNvbmZpZy5pbWFnZXMuZm9yRWFjaCgoaW1hZ2UpOiB2b2lkID0+IHtcblx0XHRcdE1hdGVDb21wcmVzc29yLmNvbXByZXNzKGltYWdlKTtcblx0XHR9KTtcblx0fVxuXG5cdHByaXZhdGUgc3RhdGljIGlzRmlsZShmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG5cblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0cmV0dXJuIGZzLnN0YXRTeW5jKGZpbGVQYXRoKS5pc0ZpbGUoKTtcblx0fVxuXG5cdHN0YXRpYyBhc3luYyBjb21wcmVzcyhpbWFnZTogTWF0ZUNvbmZpZ0ltYWdlLCBvdmVycmlkZTogYm9vbGVhbiA9IGZhbHNlKSB7XG5cblx0XHRmb3IgKGNvbnN0IG91dHB1dCBvZiBpbWFnZS5vdXRwdXQpXG5cdFx0XHRmb3IgKGNvbnN0IGlucHV0IG9mIGltYWdlLmlucHV0KSB7XG5cblx0XHRcdFx0Y29uc3QgYmFzZURpcmVjdG9yeSA9ICF0aGlzLmlzRmlsZShpbnB1dCkgPyBwYXRoLmRpcm5hbWUoaW5wdXQpIDogbnVsbDtcblxuXHRcdFx0XHRnbG9iLnN5bmMoaW5wdXQsIHsgbm9kaXI6IHRydWUgfSkuZm9yRWFjaChhc3luYyAoZmlsZSkgPT4ge1xuXG5cdFx0XHRcdFx0Y29uc3QgZmlsZUV4dGVudGlvbiA9IGZpbGUuc3BsaXQoJy4nKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRcdFx0Y29uc3QgcGx1Z2lucyA9IFtdO1xuXG5cdFx0XHRcdFx0c3dpdGNoIChmaWxlRXh0ZW50aW9uKSB7XG5cblx0XHRcdFx0XHRcdGNhc2UgXCJzdmdcIjpcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKHN2Z28oKSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlIFwicG5nXCI6XG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChvcHRpcG5nKCkpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZWdcIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJqcGdcIjpcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG1vempwZWcoKSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlIFwiZ2lmXCI6XG5cdFx0XHRcdFx0XHRcdHBsdWdpbnMucHVzaChnaWZzaWNsZSgpKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChwbHVnaW5zLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRcdHJldHVybjtcblxuXHRcdFx0XHRcdGxldCBkZXN0aW5hdGlvbiA9IG91dHB1dDtcblxuXHRcdFx0XHRcdGlmIChiYXNlRGlyZWN0b3J5KVxuXHRcdFx0XHRcdFx0ZGVzdGluYXRpb24gPSBvdXRwdXQgKyBwYXRoLmRpcm5hbWUoZmlsZSkuc3Vic3RyaW5nKGJhc2VEaXJlY3RvcnkubGVuZ3RoKTtcblxuXHRcdFx0XHRcdGxldCBkb0NvbXByZXNzID0gdHJ1ZTtcblxuXHRcdFx0XHRcdGlmICghb3ZlcnJpZGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IG91dHB1dEZpbGVOYW1lID0gZmlsZS5yZXBsYWNlKC9eLipbXFxcXFxcL10vLCAnJyk7XG5cblx0XHRcdFx0XHRcdGlmIChmcy5leGlzdHNTeW5jKGRlc3RpbmF0aW9uICsgJy8nICsgb3V0cHV0RmlsZU5hbWUpKVxuXHRcdFx0XHRcdFx0XHRkb0NvbXByZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGRvQ29tcHJlc3MpXG5cdFx0XHRcdFx0XHRhd2FpdCBpbWFnZW1pbihbZmlsZV0sIHtcblx0XHRcdFx0XHRcdFx0ZGVzdGluYXRpb246IGRlc3RpbmF0aW9uLFxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zOiBwbHVnaW5zLFxuXHRcdFx0XHRcdFx0XHRnbG9iOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdH1cblxuXHRzdGF0aWMgYXN5bmMgZGVsZXRlKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIGZpbGVQYXRoOiBzdHJpbmcpIHtcblxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcblxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xuXG5cdFx0XHRcdGxldCBkZXN0aW5hdGlvbiA9IG91dHB1dDtcblxuXHRcdFx0XHRpZiAoYmFzZURpcmVjdG9yeSlcblx0XHRcdFx0XHRkZXN0aW5hdGlvbiA9IG91dHB1dCArIHBhdGguZGlybmFtZShmaWxlUGF0aCkuc3Vic3RyaW5nKGJhc2VEaXJlY3RvcnkubGVuZ3RoKTtcblxuXHRcdFx0XHRjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGZpbGVQYXRoLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcblx0XHRcdFx0Y29uc3QgZmlsZVRvRGVsZXRlID0gZGVzdGluYXRpb24gKyAnLycgKyBvdXRwdXRGaWxlTmFtZTtcblxuXHRcdFx0XHRkZWwoZmlsZVRvRGVsZXRlKTtcblx0XHRcdH1cblx0fVxufVxuIl19
