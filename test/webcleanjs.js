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
        var startWithValues = [
            'import '
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
    CloudMateWebCleanJS.cleanPrefixes = function (content) {
        var prefixesValues = [
            'export default ',
            'export '
        ];
        for (var _i = 0, prefixesValues_1 = prefixesValues; _i < prefixesValues_1.length; _i++) {
            var prefix = prefixesValues_1[_i];
            content = content.replace(new RegExp('^(' + prefix + ')|[[:blank:]]+(' + prefix + ')', 'gmi'), '');
        }
        return content;
    };
    return CloudMateWebCleanJS;
}());

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFlLEVBQWYsbUNBQWUsRUFBZiw2QkFBZSxFQUFmLElBQWU7Z0JBQWxDLElBQU0sU0FBUyx3QkFBQTtnQkFDZixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO29CQUMxQixJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQUE7WUFFckIsSUFBSSxJQUFJO2dCQUNKLE1BQU0sSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQzdCO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVNLGlDQUFhLEdBQXBCLFVBQXFCLE9BQWU7UUFFaEMsSUFBTSxjQUFjLEdBQUc7WUFDbkIsaUJBQWlCO1lBQ2pCLFNBQVM7U0FDWixDQUFDO1FBRUYsS0FBb0IsVUFBYyxFQUFkLGlDQUFjLEVBQWQsNEJBQWMsRUFBZCxJQUFjO1lBQTlCLElBQU0sTUFBTSx1QkFBQTtZQUNaLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLEdBQUcsaUJBQWlCLEdBQUcsTUFBTSxHQUFHLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUFBO1FBRXZHLE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFDTCwwQkFBQztBQUFELENBckNBLEFBcUNDLElBQUEiLCJmaWxlIjoid2ViY2xlYW5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcclxuaW1wb3J0IHZpbnlsID0gcmVxdWlyZSgndmlueWwnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlzRGVjbGFyYXRpb24/OiBCb29sZWFuKSB7XHJcblxyXG4gICAgaWYgKGlzRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZClcclxuICAgICAgICBpc0RlY2xhcmF0aW9uID0gZmFsc2U7XHJcblxyXG4gICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uICh2aW55bEZpbGU6IHZpbnlsLCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogRnVuY3Rpb24pIHtcclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlID0gdmlueWxGaWxlLmNsb25lKCk7XHJcblxyXG4gICAgICAgIGxldCBjb250ZW50ID0gdHJhbnNmb3JtZWRGaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgICAgIGlmICghaXNEZWNsYXJhdGlvbilcclxuICAgICAgICAgICAgY29udGVudCA9ICd2YXIgZXhwb3J0cyA9IHt9O1xcbicgKyBjb250ZW50O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnRlbnQgPSBDbG91ZE1hdGVXZWJDbGVhbkpTLmNsZWFuTGluZXMoY29udGVudCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCFpc0RlY2xhcmF0aW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSBDbG91ZE1hdGVXZWJDbGVhbkpTLmNsZWFuUHJlZml4ZXMoY29udGVudCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVtb3ZhYmxlc19SZXF1aXJlcyA9IFtdO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobGluZS5pbmRleE9mKCcgcmVxdWlyZSgnKSA9PT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKGxpbmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZpeCA9IGxpbmUuc3BsaXQoJyAnKVsxXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocHJlZml4LmluZGV4T2YoJ18nKSAhPT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKHByZWZpeCArICcuJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlbW92YWJsZXNfUmVxdWlyZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuaW5kZXhPZignPScpID09PSAwKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUuaW5kZXhPZignPScpICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKHZhbHVlLCAnJyk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKHZhbHVlLnRyaW0oKSwgJ2dpJyksICcnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cmFuc2Zvcm1lZEZpbGUuY29udGVudHMgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xyXG5cclxuICAgICAgICAvLyAzLiBwYXNzIGFsb25nIHRyYW5zZm9ybWVkIGZpbGUgZm9yIHVzZSBpbiBuZXh0IGBwaXBlKClgXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgdHJhbnNmb3JtZWRGaWxlKTtcclxuXHJcbiAgICB9KTtcclxufTtcclxuXHJcbmNsYXNzIENsb3VkTWF0ZVdlYkNsZWFuSlMge1xyXG5cclxuICAgIHN0YXRpYyBjbGVhbkxpbmVzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZ3tcclxuXHJcbiAgICAgICAgY29uc3Qgc3RhcnRXaXRoVmFsdWVzID0gW1xyXG4gICAgICAgICAgICAnaW1wb3J0ICdcclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBsZXQgcmVzdWx0ID0gJyc7XHJcblxyXG4gICAgICAgIGZvcihjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKXtcclxuICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBzYWZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGZvcihjb25zdCBzdGFydFdpdGggb2Ygc3RhcnRXaXRoVmFsdWVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aChzdGFydFdpdGgpKVxyXG4gICAgICAgICAgICAgICAgICAgIHNhZmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChzYWZlKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGxpbmUgKyAnXFxuJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNsZWFuUHJlZml4ZXMoY29udGVudDogc3RyaW5nKTogc3RyaW5ne1xyXG5cclxuICAgICAgICBjb25zdCBwcmVmaXhlc1ZhbHVlcyA9IFtcclxuICAgICAgICAgICAgJ2V4cG9ydCBkZWZhdWx0ICcsXHJcbiAgICAgICAgICAgICdleHBvcnQgJ1xyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGZvcihjb25zdCBwcmVmaXggb2YgcHJlZml4ZXNWYWx1ZXMpXHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UobmV3IFJlZ0V4cCgnXignICsgcHJlZml4ICsgJyl8W1s6Ymxhbms6XV0rKCcgKyBwcmVmaXggKyAnKScsICdnbWknKSwgJycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBjb250ZW50O1xyXG4gICAgfVxyXG59Il19
