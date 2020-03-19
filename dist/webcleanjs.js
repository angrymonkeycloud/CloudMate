"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var through = require("through2");
module.exports = function () {
    return through.obj(function (vinylFile, encoding, callback) {
        var transformedFile = vinylFile.clone();
        var lines = transformedFile.contents.toString().split('\n');
        var removables_Requires = [];
        var removables_Lines = [];
        console.log('--------------------------');
        console.log('start ********************');
        console.log('--------------------------');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf(' require(') === -1)
                continue;
            removables_Requires.push(line);
            var prefix = line.split(' ')[1];
            if (prefix.indexOf('_') !== -1)
                removables_Requires.push(prefix + '.');
        }
        var content = 'var exports = {};\n' + transformedFile.contents.toString();
        removables_Requires.forEach(function (value) {
            if (value.indexOf('=') === 0)
                return;
            if (value.indexOf('=') !== -1)
                content = content.replace(value, '');
            else
                content = content.replace(new RegExp(value.trim(), 'gi'), '');
        });
        content = CloudMateWebCleanJS.removeNonDependanciesLines(content);
        console.log('--------------------------');
        console.log('end **********************');
        console.log('--------------------------');
        transformedFile.contents = new Buffer(content);
        callback(null, transformedFile);
    });
};
var CloudMateWebCleanJS = (function () {
    function CloudMateWebCleanJS() {
    }
    CloudMateWebCleanJS.removeNonDependanciesLines = function (content) {
        var startWithValues = [
            'AAObject.defineProperty(exports',
            'AAexports.'
        ];
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
    return CloudMateWebCleanJS;
}());
