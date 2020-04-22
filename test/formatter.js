"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prettier = require('prettier');
var fs = require("fs");
var glob = require("glob");
var config_1 = require("./config");
var chokidar = require("chokidar");
var MateFormatter = (function () {
    function MateFormatter() {
    }
    MateFormatter.execute = function (config) {
        var _this = this;
        if (!config || !config.format || !config.format.path)
            return;
        prettier.resolveConfigFile().then(function (configPath) {
            prettier.resolveConfig(configPath).then(function (options) {
                _this.configPaths(config).forEach(function (path) {
                    _this.formatPath(config, path, options);
                });
            });
        });
    };
    MateFormatter.formatPath = function (config, path, options) {
        var _this = this;
        glob(path, function (error, files) {
            if (error)
                throw new Error(error.message);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                _this.formatFile(file, options);
            }
        });
    };
    MateFormatter.formatFile = function (file, options) {
        if (file.toLocaleLowerCase().indexOf('.min.') !== -1)
            return;
        fs.readFile(file, function (error, content) {
            switch (file.split('.').pop().toLocaleLowerCase()) {
                case 'js':
                    options.parser = 'babel';
                    break;
                case 'ts':
                    options.parser = 'typescript';
                    break;
                case 'css':
                    options.parser = 'css';
                    break;
                case 'less':
                    options.parser = 'less';
                    break;
                case 'scss':
                    options.parser = 'scss';
                    break;
                case 'html':
                    options.parser = 'html';
                    break;
                case 'md':
                    options.parser = 'markdown';
                    break;
                case 'json':
                    options.parser = 'json';
                    break;
                case 'yaml':
                case 'yml':
                    options.parser = 'yaml';
                    break;
                default:
                    if (file.startsWith('.'))
                        options.parser = 'json';
                    else
                        return;
            }
            try {
                var formattedContent = prettier.format(content.toString(), options);
                if (formattedContent !== content.toString())
                    fs.writeFile(file, formattedContent, function () { });
            }
            catch (_a) { }
        });
    };
    MateFormatter.watch = function (config) {
        var _this = this;
        var configWatcher = chokidar.watch(config_1.MateConfig.availableConfigurationFile, { persistent: true }).on('change', function (event, path) {
            _this.allWatchers.forEach(function (watcher) {
                watcher.close();
            });
            _this.allWatchers = [];
            _this.watch(config);
        });
        this.allWatchers.push(configWatcher);
        prettier.resolveConfigFile().then(function (configPath) {
            prettier.resolveConfig(configPath).then(function (options) {
                var watch = chokidar.watch(_this.configPaths(config), { persistent: true }).on('change', function (path) {
                    _this.formatPath(config, path, options);
                });
                _this.allWatchers.push(watch);
            });
        });
        this.execute(config);
    };
    MateFormatter.configPaths = function (config) {
        var paths;
        if (typeof config.format.path == 'string')
            paths = [config.format.path];
        else
            paths = config.format.path;
        return paths;
    };
    MateFormatter.allWatchers = [];
    return MateFormatter;
}());
exports.MateFormatter = MateFormatter;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LFVBQUMsT0FBTztnQkFDL0MsSUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLElBQUk7b0JBQzlGLEtBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVjLHlCQUFXLEdBQTFCLFVBQTJCLE1BQWtCO1FBQzVDLElBQUksS0FBZSxDQUFDO1FBRXBCLElBQUksT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxRQUFRO1lBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7WUFDbkUsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRWhDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQXBJTSx5QkFBVyxHQUF5QixFQUFFLENBQUM7SUFxSS9DLG9CQUFDO0NBdElELEFBc0lDLElBQUE7QUF0SVksc0NBQWEiLCJmaWxlIjoiZm9ybWF0dGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgcHJldHRpZXIgPSByZXF1aXJlKCdwcmV0dGllcicpO1xuaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBnbG9iID0gcmVxdWlyZSgnZ2xvYicpO1xuaW1wb3J0IHsgTWF0ZUNvbmZpZyB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5cbmV4cG9ydCBjbGFzcyBNYXRlRm9ybWF0dGVyIHtcblx0c3RhdGljIGFsbFdhdGNoZXJzOiBjaG9raWRhci5GU1dhdGNoZXJbXSA9IFtdO1xuXG5cdHN0YXRpYyBleGVjdXRlKGNvbmZpZzogTWF0ZUNvbmZpZyk6IHZvaWQge1xuXHRcdGlmICghY29uZmlnIHx8ICFjb25maWcuZm9ybWF0IHx8ICFjb25maWcuZm9ybWF0LnBhdGgpIHJldHVybjtcblxuXHRcdHByZXR0aWVyLnJlc29sdmVDb25maWdGaWxlKCkudGhlbigoY29uZmlnUGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHRwcmV0dGllci5yZXNvbHZlQ29uZmlnKGNvbmZpZ1BhdGgpLnRoZW4oKG9wdGlvbnMpID0+IHtcblx0XHRcdFx0dGhpcy5jb25maWdQYXRocyhjb25maWcpLmZvckVhY2goKHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRcdHRoaXMuZm9ybWF0UGF0aChjb25maWcsIHBhdGgsIG9wdGlvbnMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0cHJpdmF0ZSBzdGF0aWMgZm9ybWF0UGF0aChjb25maWc6IE1hdGVDb25maWcsIHBhdGg6IHN0cmluZywgb3B0aW9ucz86IGFueSkge1xuXHRcdGdsb2IocGF0aCwgKGVycm9yLCBmaWxlcykgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3IubWVzc2FnZSk7XG5cblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0XHR0aGlzLmZvcm1hdEZpbGUoZmlsZSwgb3B0aW9ucyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRwcml2YXRlIHN0YXRpYyBmb3JtYXRGaWxlKGZpbGU6IHN0cmluZywgb3B0aW9ucz86IGFueSkge1xuXHRcdGlmIChmaWxlLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5kZXhPZignLm1pbi4nKSAhPT0gLTEpIHJldHVybjtcblxuXHRcdGZzLnJlYWRGaWxlKGZpbGUsIChlcnJvciwgY29udGVudCkgPT4ge1xuXHRcdFx0c3dpdGNoIChmaWxlLnNwbGl0KCcuJykucG9wKCkudG9Mb2NhbGVMb3dlckNhc2UoKSkge1xuXHRcdFx0XHQvLyNyZWdpb24gU2NyaXB0c1xuXG5cdFx0XHRcdGNhc2UgJ2pzJzpcblx0XHRcdFx0XHRvcHRpb25zLnBhcnNlciA9ICdiYWJlbCc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAndHMnOlxuXHRcdFx0XHRcdG9wdGlvbnMucGFyc2VyID0gJ3R5cGVzY3JpcHQnO1xuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdC8vI2VuZHJlZ2lvblxuXG5cdFx0XHRcdC8vI3JlZ2lvbiBTdHlsZXNcblxuXHRcdFx0XHRjYXNlICdjc3MnOlxuXHRcdFx0XHRcdG9wdGlvbnMucGFyc2VyID0gJ2Nzcyc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnbGVzcyc6XG5cdFx0XHRcdFx0b3B0aW9ucy5wYXJzZXIgPSAnbGVzcyc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnc2Nzcyc6XG5cdFx0XHRcdFx0b3B0aW9ucy5wYXJzZXIgPSAnc2Nzcyc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Ly8jZW5kcmVnaW9uXG5cblx0XHRcdFx0Ly8jcmVnaW9uIEh0bWxcblxuXHRcdFx0XHRjYXNlICdodG1sJzpcblx0XHRcdFx0XHRvcHRpb25zLnBhcnNlciA9ICdodG1sJztcblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHQvLyNlbmRyZWdpb25cblxuXHRcdFx0XHQvLyNyZWdpb24gTWFya2Rvd25cblxuXHRcdFx0XHRjYXNlICdtZCc6XG5cdFx0XHRcdFx0b3B0aW9ucy5wYXJzZXIgPSAnbWFya2Rvd24nO1xuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdC8vI2VuZHJlZ2lvblxuXG5cdFx0XHRcdC8vI3JlZ2lvbiBEYXRhXG5cblx0XHRcdFx0Y2FzZSAnanNvbic6XG5cdFx0XHRcdFx0b3B0aW9ucy5wYXJzZXIgPSAnanNvbic7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAneWFtbCc6XG5cdFx0XHRcdGNhc2UgJ3ltbCc6XG5cdFx0XHRcdFx0b3B0aW9ucy5wYXJzZXIgPSAneWFtbCc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Ly8jZW5kcmVnaW9uXG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRpZiAoZmlsZS5zdGFydHNXaXRoKCcuJykpIG9wdGlvbnMucGFyc2VyID0gJ2pzb24nO1xuXHRcdFx0XHRcdGVsc2UgcmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBmb3JtYXR0ZWRDb250ZW50ID0gcHJldHRpZXIuZm9ybWF0KGNvbnRlbnQudG9TdHJpbmcoKSwgb3B0aW9ucyk7XG5cblx0XHRcdFx0aWYgKGZvcm1hdHRlZENvbnRlbnQgIT09IGNvbnRlbnQudG9TdHJpbmcoKSkgZnMud3JpdGVGaWxlKGZpbGUsIGZvcm1hdHRlZENvbnRlbnQsICgpID0+IHt9KTtcblx0XHRcdH0gY2F0Y2gge31cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyB3YXRjaChjb25maWc6IE1hdGVDb25maWcpIHtcblx0XHRjb25zdCBjb25maWdXYXRjaGVyID0gY2hva2lkYXIud2F0Y2goTWF0ZUNvbmZpZy5hdmFpbGFibGVDb25maWd1cmF0aW9uRmlsZSwgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAoZXZlbnQsIHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0dGhpcy5hbGxXYXRjaGVycy5mb3JFYWNoKCh3YXRjaGVyOiBjaG9raWRhci5GU1dhdGNoZXIpID0+IHtcblx0XHRcdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuYWxsV2F0Y2hlcnMgPSBbXTtcblxuXHRcdFx0dGhpcy53YXRjaChjb25maWcpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5hbGxXYXRjaGVycy5wdXNoKGNvbmZpZ1dhdGNoZXIpO1xuXG5cdFx0cHJldHRpZXIucmVzb2x2ZUNvbmZpZ0ZpbGUoKS50aGVuKChjb25maWdQYXRoOiBzdHJpbmcpID0+IHtcblx0XHRcdHByZXR0aWVyLnJlc29sdmVDb25maWcoY29uZmlnUGF0aCkudGhlbigob3B0aW9ucykgPT4ge1xuXHRcdFx0XHRjb25zdCB3YXRjaCA9IGNob2tpZGFyLndhdGNoKHRoaXMuY29uZmlnUGF0aHMoY29uZmlnKSwgeyBwZXJzaXN0ZW50OiB0cnVlIH0pLm9uKCdjaGFuZ2UnLCAocGF0aCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuZm9ybWF0UGF0aChjb25maWcsIHBhdGgsIG9wdGlvbnMpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR0aGlzLmFsbFdhdGNoZXJzLnB1c2god2F0Y2gpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmV4ZWN1dGUoY29uZmlnKTtcblx0fVxuXG5cdHByaXZhdGUgc3RhdGljIGNvbmZpZ1BhdGhzKGNvbmZpZzogTWF0ZUNvbmZpZyk6IHN0cmluZ1tdIHtcblx0XHRsZXQgcGF0aHM6IHN0cmluZ1tdO1xuXG5cdFx0aWYgKHR5cGVvZiBjb25maWcuZm9ybWF0LnBhdGggPT0gJ3N0cmluZycpIHBhdGhzID0gW2NvbmZpZy5mb3JtYXQucGF0aF07XG5cdFx0ZWxzZSBwYXRocyA9IGNvbmZpZy5mb3JtYXQucGF0aDtcblxuXHRcdHJldHVybiBwYXRocztcblx0fVxufVxuIl19
