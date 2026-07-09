"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var through = require("through2");
module.exports = function (isDeclaration) {
    if (isDeclaration === undefined)
        isDeclaration = false;
    return through.obj(function (vinylFile, encoding, callback) {
        var transformedFile = vinylFile.clone();
        var content = transformedFile.contents.toString();
        if (!isDeclaration)
            content = 'var exports = {};\n' + content;
        content = CloudMateWebCleanJS.cleanLines(content);
        if (!isDeclaration) {
            content = CloudMateWebCleanJS.cleanPrefixes(content);
            var lines = content.split('\n');
            var removables_Requires = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.indexOf(' require(') === -1)
                    continue;
                removables_Requires.push(line);
                var prefix = line.split(' ')[1];
                if (prefix.indexOf('_') !== -1)
                    removables_Requires.push(prefix + '.');
            }
            removables_Requires.forEach(function (value) {
                if (value.indexOf('=') === 0)
                    return;
                if (value.indexOf('=') !== -1)
                    content = content.replace(value, '');
                else
                    content = content.replace(new RegExp(value.trim(), 'gi'), '');
            });
        }
        transformedFile.contents = new Buffer(content);
        callback(null, transformedFile);
    });
};
var CloudMateWebCleanJS = (function () {
    function CloudMateWebCleanJS() {
    }
    CloudMateWebCleanJS.cleanLines = function (content) {
        var startWithValues = ['import '];
        var result = '';
        for (var _i = 0, _a = content.split('\n'); _i < _a.length; _i++) {
            var line = _a[_i];
            var safe = true;
            for (var _b = 0, startWithValues_1 = startWithValues; _b < startWithValues_1.length; _b++) {
                var startWith = startWithValues_1[_b];
                if (line.startsWith(startWith))
                    safe = false;
            }
            if (safe)
                result += line + '\n';
        }
        return result;
    };
    CloudMateWebCleanJS.cleanPrefixes = function (content) {
        var prefixesValues = ['export default ', 'export '];
        for (var _i = 0, prefixesValues_1 = prefixesValues; _i < prefixesValues_1.length; _i++) {
            var prefix = prefixesValues_1[_i];
            content = content.replace(new RegExp('^(' + prefix + ')|[[:blank:]]+(' + prefix + ')', 'gmi'), '');
        }
        return content;
    };
    return CloudMateWebCleanJS;
}());
