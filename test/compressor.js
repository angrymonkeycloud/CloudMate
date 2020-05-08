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
    MateCompressor.allWatchers = [];
    return MateCompressor;
}());
exports.MateCompressor = MateCompressor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBTCxLQUFLO3FCQXlEZjs7O2dCQTFERixXQUFpQyxFQUFaLEtBQUEsS0FBSyxDQUFDLE1BQU0sRUFBWixjQUFZLEVBQVosSUFBWTtvQkFBdEIsTUFBTTs0QkFBTixNQUFNO2lCQTBEZjs7OztLQUNGO0lBeEdNLDBCQUFXLEdBQXlCLEVBQUUsQ0FBQztJQXlHL0MscUJBQUM7Q0ExR0QsQUEwR0MsSUFBQTtBQTFHWSx3Q0FBYyIsImZpbGUiOiJjb21wcmVzc29yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuaW1wb3J0IHsgTWF0ZUNvbmZpZywgTWF0ZUNvbmZpZ0ltYWdlIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmltcG9ydCBpbWFnZW1pbiA9IHJlcXVpcmUoJ2ltYWdlbWluJyk7XG5pbXBvcnQgc3ZnbyA9IHJlcXVpcmUoJ2ltYWdlbWluLXN2Z28nKTtcbmltcG9ydCBtb3pqcGVnID0gcmVxdWlyZSgnaW1hZ2VtaW4tbW96anBlZycpO1xuaW1wb3J0IG9wdGlwbmcgPSByZXF1aXJlKCdpbWFnZW1pbi1vcHRpcG5nJyk7XG5pbXBvcnQgZ2lmc2ljbGUgPSByZXF1aXJlKCdpbWFnZW1pbi1naWZzaWNsZScpO1xuaW1wb3J0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XG5cblxuZXhwb3J0IGNsYXNzIE1hdGVDb21wcmVzc29yIHtcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xuXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcpIHtcblxuXHRcdGlmIChjb25maWcuaW1hZ2VzID09PSB1bmRlZmluZWQpXG5cdFx0XHRyZXR1cm47XG5cblx0XHRjb25maWcuaW1hZ2VzLmZvckVhY2goKGZpbGUpID0+IHtcblxuXHRcdFx0Y29uc3Qgd2F0Y2hQYXRoczogc3RyaW5nW10gPSBbXTtcblxuXHRcdFx0ZmlsZS5pbnB1dC5mb3JFYWNoKChwYXRoKSA9PiB7XG5cdFx0XHRcdHdhdGNoUGF0aHMucHVzaChwYXRoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHdhdGNoUGF0aHMsIHsgcGVyc2lzdGVudDogdHJ1ZSB9KVxuXHRcdFx0XHQub24oJ2FkZCcsICgpID0+IHsgdGhpcy5jb21wcmVzcyhmaWxlKTsgfSlcblx0XHRcdFx0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7IHRoaXMuY29tcHJlc3MoZmlsZSwgdHJ1ZSk7IH0pO1xuXG5cdFx0XHR0aGlzLmFsbFdhdGNoZXJzLnB1c2god2F0Y2gpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5leGVjdXRlKGNvbmZpZyk7XG5cdH1cblxuXHRzdGF0aWMgZXhlY3V0ZShjb25maWc/OiBNYXRlQ29uZmlnKTogdm9pZCB7XG5cblx0XHRpZiAoY29uZmlnLmltYWdlcyA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Y29uZmlnLmltYWdlcy5mb3JFYWNoKChpbWFnZSk6IHZvaWQgPT4ge1xuXHRcdFx0TWF0ZUNvbXByZXNzb3IuY29tcHJlc3MoaW1hZ2UpO1xuXHRcdH0pO1xuXHR9XG5cblx0cHJpdmF0ZSBzdGF0aWMgaXNGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcblxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZmlsZVBhdGgpLmlzRmlsZSgpO1xuXHR9XG5cblx0c3RhdGljIGFzeW5jIGNvbXByZXNzKGltYWdlOiBNYXRlQ29uZmlnSW1hZ2UsIG92ZXJyaWRlOiBib29sZWFuID0gZmFsc2UpIHtcblxuXHRcdGZvciAoY29uc3Qgb3V0cHV0IG9mIGltYWdlLm91dHB1dClcblx0XHRcdGZvciAoY29uc3QgaW5wdXQgb2YgaW1hZ2UuaW5wdXQpIHtcblxuXHRcdFx0XHRjb25zdCBiYXNlRGlyZWN0b3J5ID0gIXRoaXMuaXNGaWxlKGlucHV0KSA/IHBhdGguZGlybmFtZShpbnB1dCkgOiBudWxsO1xuXG5cdFx0XHRcdGdsb2Iuc3luYyhpbnB1dCwgeyBub2RpcjogdHJ1ZSB9KS5mb3JFYWNoKGFzeW5jIChmaWxlKSA9PiB7XG5cblx0XHRcdFx0XHRjb25zdCBmaWxlRXh0ZW50aW9uID0gZmlsZS5zcGxpdCgnLicpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRcdFx0XHRjb25zdCBwbHVnaW5zID0gW107XG5cblx0XHRcdFx0XHRzd2l0Y2ggKGZpbGVFeHRlbnRpb24pIHtcblxuXHRcdFx0XHRcdFx0Y2FzZSBcInN2Z1wiOlxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2goc3ZnbygpKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgXCJwbmdcIjpcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKG9wdGlwbmcoKSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlIFwianBlZ1wiOlxuXHRcdFx0XHRcdFx0Y2FzZSBcImpwZ1wiOlxuXHRcdFx0XHRcdFx0XHRwbHVnaW5zLnB1c2gobW96anBlZygpKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgXCJnaWZcIjpcblx0XHRcdFx0XHRcdFx0cGx1Z2lucy5wdXNoKGdpZnNpY2xlKCkpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHBsdWdpbnMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRcdFx0bGV0IGRlc3RpbmF0aW9uID0gb3V0cHV0O1xuXG5cdFx0XHRcdFx0aWYgKGJhc2VEaXJlY3RvcnkpXG5cdFx0XHRcdFx0XHRkZXN0aW5hdGlvbiA9IG91dHB1dCArIHBhdGguZGlybmFtZShmaWxlKS5zdWJzdHJpbmcoYmFzZURpcmVjdG9yeS5sZW5ndGgpO1xuXG5cdFx0XHRcdFx0bGV0IGRvQ29tcHJlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdFx0aWYgKCFvdmVycmlkZSkge1xuXHRcdFx0XHRcdFx0Y29uc3Qgb3V0cHV0RmlsZU5hbWUgPSBmaWxlLnJlcGxhY2UoL14uKltcXFxcXFwvXS8sICcnKTtcblxuXHRcdFx0XHRcdFx0aWYgKGZzLmV4aXN0c1N5bmMoZGVzdGluYXRpb24gKyAnLycgKyBvdXRwdXRGaWxlTmFtZSkpXG5cdFx0XHRcdFx0XHRcdGRvQ29tcHJlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoZG9Db21wcmVzcylcblx0XHRcdFx0XHRcdGF3YWl0IGltYWdlbWluKFtmaWxlXSwge1xuXHRcdFx0XHRcdFx0XHRkZXN0aW5hdGlvbjogZGVzdGluYXRpb24sXG5cdFx0XHRcdFx0XHRcdHBsdWdpbnM6IHBsdWdpbnMsXG5cdFx0XHRcdFx0XHRcdGdsb2I6IGZhbHNlXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSlcblx0XHRcdH1cblx0fVxufVxuIl19
