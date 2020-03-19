"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var through = require("through2");
module.exports = function () {
    return through.obj(function (vinylFile, encoding, callback) {
        var transformedFile = vinylFile.clone();
        var content = 'var exports = {};\n' + transformedFile.contents.toString();
        content = CloudMateWebCleanJS.updateDefaultVariables(content);
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
        transformedFile.contents = new Buffer(content);
        callback(null, transformedFile);
    });
};
var CloudMateWebCleanJS = (function () {
    function CloudMateWebCleanJS() {
    }
    CloudMateWebCleanJS.updateDefaultVariables = function (content) {
        content = content.replace(/(_)\d(.default)/gmi, '');
        return content;
    };
    return CloudMateWebCleanJS;
}());
