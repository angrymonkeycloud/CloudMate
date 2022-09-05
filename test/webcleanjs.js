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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEVBQWYsbUNBQWUsRUFBZiw2QkFBZSxFQUFmLElBQWU7Z0JBQWxDLElBQU0sU0FBUyx3QkFBQTtnQkFBcUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztvQkFBRSxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQUE7WUFFdEYsSUFBSSxJQUFJO2dCQUFFLE1BQU0sSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ2hDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0saUNBQWEsR0FBcEIsVUFBcUIsT0FBZTtRQUNuQyxJQUFNLGNBQWMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRELEtBQXFCLFVBQWMsRUFBZCxpQ0FBYyxFQUFkLDRCQUFjLEVBQWQsSUFBYztZQUE5QixJQUFNLE1BQU0sdUJBQUE7WUFBb0IsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sR0FBRyxpQkFBaUIsR0FBRyxNQUFNLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQUE7UUFFeEksT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0F4QkEsQUF3QkMsSUFBQSIsImZpbGUiOiJ3ZWJjbGVhbmpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xyXG5pbXBvcnQgdmlueWwgPSByZXF1aXJlKCd2aW55bCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaXNEZWNsYXJhdGlvbj86IEJvb2xlYW4pIHtcclxuXHRpZiAoaXNEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSBpc0RlY2xhcmF0aW9uID0gZmFsc2U7XHJcblxyXG5cdHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbiAodmlueWxGaWxlOiB2aW55bCwgZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XHJcblx0XHRjb25zdCB0cmFuc2Zvcm1lZEZpbGUgPSB2aW55bEZpbGUuY2xvbmUoKTtcclxuXHJcblx0XHRsZXQgY29udGVudCA9IHRyYW5zZm9ybWVkRmlsZS5jb250ZW50cy50b1N0cmluZygpO1xyXG5cclxuXHRcdGlmICghaXNEZWNsYXJhdGlvbikgY29udGVudCA9ICd2YXIgZXhwb3J0cyA9IHt9O1xcbicgKyBjb250ZW50O1xyXG5cclxuXHRcdGNvbnRlbnQgPSBDbG91ZE1hdGVXZWJDbGVhbkpTLmNsZWFuTGluZXMoY29udGVudCk7XHJcblxyXG5cdFx0aWYgKCFpc0RlY2xhcmF0aW9uKSB7XHJcblx0XHRcdGNvbnRlbnQgPSBDbG91ZE1hdGVXZWJDbGVhbkpTLmNsZWFuUHJlZml4ZXMoY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVtb3ZhYmxlc19SZXF1aXJlcyA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHJcblx0XHRcdFx0aWYgKGxpbmUuaW5kZXhPZignIHJlcXVpcmUoJykgPT09IC0xKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0cmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKGxpbmUpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBwcmVmaXggPSBsaW5lLnNwbGl0KCcgJylbMV07XHJcblxyXG5cdFx0XHRcdGlmIChwcmVmaXguaW5kZXhPZignXycpICE9PSAtMSkgcmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKHByZWZpeCArICcuJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJlbW92YWJsZXNfUmVxdWlyZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcclxuXHRcdFx0XHRpZiAodmFsdWUuaW5kZXhPZignPScpID09PSAwKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdGlmICh2YWx1ZS5pbmRleE9mKCc9JykgIT09IC0xKSBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKHZhbHVlLCAnJyk7XHJcblx0XHRcdFx0ZWxzZSBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKG5ldyBSZWdFeHAodmFsdWUudHJpbSgpLCAnZ2knKSwgJycpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0cmFuc2Zvcm1lZEZpbGUuY29udGVudHMgPSBuZXcgQnVmZmVyKGNvbnRlbnQpO1xyXG5cclxuXHRcdC8vIDMuIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgZmlsZSBmb3IgdXNlIGluIG5leHQgYHBpcGUoKWBcclxuXHRcdGNhbGxiYWNrKG51bGwsIHRyYW5zZm9ybWVkRmlsZSk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5jbGFzcyBDbG91ZE1hdGVXZWJDbGVhbkpTIHtcclxuXHRzdGF0aWMgY2xlYW5MaW5lcyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc3RhcnRXaXRoVmFsdWVzID0gWydpbXBvcnQgJ107XHJcblxyXG5cdFx0bGV0IHJlc3VsdCA9ICcnO1xyXG5cclxuXHRcdGZvciAoY29uc3QgbGluZSBvZiBjb250ZW50LnNwbGl0KCdcXG4nKSkge1xyXG5cdFx0XHRsZXQgc2FmZSA9IHRydWU7XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IHN0YXJ0V2l0aCBvZiBzdGFydFdpdGhWYWx1ZXMpIGlmIChsaW5lLnN0YXJ0c1dpdGgoc3RhcnRXaXRoKSkgc2FmZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0aWYgKHNhZmUpIHJlc3VsdCArPSBsaW5lICsgJ1xcbic7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdHN0YXRpYyBjbGVhblByZWZpeGVzKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBwcmVmaXhlc1ZhbHVlcyA9IFsnZXhwb3J0IGRlZmF1bHQgJywgJ2V4cG9ydCAnXTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlc1ZhbHVlcykgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKCdeKCcgKyBwcmVmaXggKyAnKXxbWzpibGFuazpdXSsoJyArIHByZWZpeCArICcpJywgJ2dtaScpLCAnJyk7XHJcblxyXG5cdFx0cmV0dXJuIGNvbnRlbnQ7XHJcblx0fVxyXG59XHJcbiJdfQ==
