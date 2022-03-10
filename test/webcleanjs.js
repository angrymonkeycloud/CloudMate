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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEVBQWYsbUNBQWUsRUFBZiw2QkFBZSxFQUFmLElBQWU7Z0JBQWxDLElBQU0sU0FBUyx3QkFBQTtnQkFBcUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztvQkFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQUE7WUFFdEYsSUFBSSxJQUFJO2dCQUFFLE1BQU0sSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ2hDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0saUNBQWEsR0FBcEIsVUFBcUIsT0FBZTtRQUNuQyxJQUFNLGNBQWMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRELEtBQXFCLFVBQWMsRUFBZCxpQ0FBYyxFQUFkLDRCQUFjLEVBQWQsSUFBYztZQUE5QixJQUFNLE1BQU0sdUJBQUE7WUFBb0IsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sR0FBRyxpQkFBaUIsR0FBRyxNQUFNLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQUE7UUFFeEksT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0F4QkEsQUF3QkMsSUFBQSIsImZpbGUiOiJ3ZWJjbGVhbmpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuaW1wb3J0IHZpbnlsID0gcmVxdWlyZSgndmlueWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXNEZWNsYXJhdGlvbj86IEJvb2xlYW4pIHtcblx0aWYgKGlzRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkgaXNEZWNsYXJhdGlvbiA9IGZhbHNlO1xuXG5cdHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbiAodmlueWxGaWxlOiB2aW55bCwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XG5cdFx0Y29uc3QgdHJhbnNmb3JtZWRGaWxlID0gdmlueWxGaWxlLmNsb25lKCk7XG5cblx0XHRsZXQgY29udGVudCA9IHRyYW5zZm9ybWVkRmlsZS5jb250ZW50cy50b1N0cmluZygpO1xuXG5cdFx0aWYgKCFpc0RlY2xhcmF0aW9uKSBjb250ZW50ID0gJ3ZhciBleHBvcnRzID0ge307XFxuJyArIGNvbnRlbnQ7XG5cblx0XHRjb250ZW50ID0gQ2xvdWRNYXRlV2ViQ2xlYW5KUy5jbGVhbkxpbmVzKGNvbnRlbnQpO1xuXG5cdFx0aWYgKCFpc0RlY2xhcmF0aW9uKSB7XG5cdFx0XHRjb250ZW50ID0gQ2xvdWRNYXRlV2ViQ2xlYW5KUy5jbGVhblByZWZpeGVzKGNvbnRlbnQpO1xuXG5cdFx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuXG5cdFx0XHRjb25zdCByZW1vdmFibGVzX1JlcXVpcmVzID0gW107XG5cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xuXG5cdFx0XHRcdGlmIChsaW5lLmluZGV4T2YoJyByZXF1aXJlKCcpID09PSAtMSkgY29udGludWU7XG5cblx0XHRcdFx0cmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKGxpbmUpO1xuXG5cdFx0XHRcdGNvbnN0IHByZWZpeCA9IGxpbmUuc3BsaXQoJyAnKVsxXTtcblxuXHRcdFx0XHRpZiAocHJlZml4LmluZGV4T2YoJ18nKSAhPT0gLTEpIHJlbW92YWJsZXNfUmVxdWlyZXMucHVzaChwcmVmaXggKyAnLicpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZW1vdmFibGVzX1JlcXVpcmVzLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdGlmICh2YWx1ZS5pbmRleE9mKCc9JykgPT09IDApIHJldHVybjtcblxuXHRcdFx0XHRpZiAodmFsdWUuaW5kZXhPZignPScpICE9PSAtMSkgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSh2YWx1ZSwgJycpO1xuXHRcdFx0XHRlbHNlIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UobmV3IFJlZ0V4cCh2YWx1ZS50cmltKCksICdnaScpLCAnJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0cmFuc2Zvcm1lZEZpbGUuY29udGVudHMgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xuXG5cdFx0Ly8gMy4gcGFzcyBhbG9uZyB0cmFuc2Zvcm1lZCBmaWxlIGZvciB1c2UgaW4gbmV4dCBgcGlwZSgpYFxuXHRcdGNhbGxiYWNrKG51bGwsIHRyYW5zZm9ybWVkRmlsZSk7XG5cdH0pO1xufTtcblxuY2xhc3MgQ2xvdWRNYXRlV2ViQ2xlYW5KUyB7XG5cdHN0YXRpYyBjbGVhbkxpbmVzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3Qgc3RhcnRXaXRoVmFsdWVzID0gWydpbXBvcnQgJ107XG5cblx0XHRsZXQgcmVzdWx0ID0gJyc7XG5cblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcblx0XHRcdGxldCBzYWZlID0gdHJ1ZTtcblxuXHRcdFx0Zm9yIChjb25zdCBzdGFydFdpdGggb2Ygc3RhcnRXaXRoVmFsdWVzKSBpZiAobGluZS5zdGFydHNXaXRoKHN0YXJ0V2l0aCkpIHNhZmUgPSBmYWxzZTtcblxuXHRcdFx0aWYgKHNhZmUpIHJlc3VsdCArPSBsaW5lICsgJ1xcbic7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdHN0YXRpYyBjbGVhblByZWZpeGVzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgcHJlZml4ZXNWYWx1ZXMgPSBbJ2V4cG9ydCBkZWZhdWx0ICcsICdleHBvcnQgJ107XG5cblx0XHRmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlc1ZhbHVlcykgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKCdeKCcgKyBwcmVmaXggKyAnKXxbWzpibGFuazpdXSsoJyArIHByZWZpeCArICcpJywgJ2dtaScpLCAnJyk7XG5cblx0XHRyZXR1cm4gY29udGVudDtcblx0fVxufVxuIl19
