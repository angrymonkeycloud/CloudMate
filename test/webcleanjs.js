"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var through = require("through2");
module.exports = function () {
    return through.obj(function (vinylFile, encoding, callback) {
        var transformedFile = vinylFile.clone();
        var content = 'var exports = {};\n' + transformedFile.contents.toString();
        content = CloudMateWebCleanJS.cleanLines(content);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Z0JBQ0osTUFBTSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7U0FDN0I7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU0saUNBQWEsR0FBcEIsVUFBcUIsT0FBZTtRQUVoQyxJQUFNLGNBQWMsR0FBRztZQUNuQixpQkFBaUI7WUFDakIsU0FBUztTQUNaLENBQUM7UUFFRixLQUFvQixVQUFjLEVBQWQsaUNBQWMsRUFBZCw0QkFBYyxFQUFkLElBQWM7WUFBOUIsSUFBTSxNQUFNLHVCQUFBO1lBQ1osT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sR0FBRyxpQkFBaUIsR0FBRyxNQUFNLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQUE7UUFFdkcsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUNMLDBCQUFDO0FBQUQsQ0FyQ0EsQUFxQ0MsSUFBQSIsImZpbGUiOiJ3ZWJjbGVhbmpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xyXG5pbXBvcnQgdmlueWwgPSByZXF1aXJlKCd2aW55bCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uICh2aW55bEZpbGU6IHZpbnlsLCBlbmNvZGluZzogc3RyaW5nLCBjYWxsYmFjazogRnVuY3Rpb24pIHtcclxuXHJcbiAgICAgICAgLy8gMS4gY2xvbmUgbmV3IHZpbnlsIGZpbGUgZm9yIG1hbmlwdWxhdGlvblxyXG4gICAgICAgIC8vIChTZWUgaHR0cHM6Ly9naXRodWIuY29tL3dlYXJlZnJhY3RhbC92aW55bCBmb3IgdmlueWwgYXR0cmlidXRlcyBhbmQgZnVuY3Rpb25zKVxyXG5cclxuICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZEZpbGUgPSB2aW55bEZpbGUuY2xvbmUoKTtcclxuXHJcbiAgICAgICAgLy8gMi4gc2V0IG5ldyBjb250ZW50c1xyXG4gICAgICAgIC8vICogY29udGVudHMgY2FuIG9ubHkgYmUgYSBCdWZmZXIsIFN0cmVhbSwgb3IgbnVsbFxyXG4gICAgICAgIC8vICogVGhpcyBhbGxvd3MgdXMgdG8gbW9kaWZ5IHRoZSB2aW55bCBmaWxlIGluIG1lbW9yeSBhbmQgcHJldmVudHMgdGhlIG5lZWQgdG8gd3JpdGUgYmFjayB0byB0aGUgZmlsZSBzeXN0ZW0uXHJcblxyXG4gICAgICAgIGxldCBjb250ZW50ID0gJ3ZhciBleHBvcnRzID0ge307XFxuJyArIHRyYW5zZm9ybWVkRmlsZS5jb250ZW50cy50b1N0cmluZygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnRlbnQgPSBDbG91ZE1hdGVXZWJDbGVhbkpTLmNsZWFuTGluZXMoY29udGVudCk7XHJcbiAgICAgICAgY29udGVudCA9IENsb3VkTWF0ZVdlYkNsZWFuSlMuY2xlYW5QcmVmaXhlcyhjb250ZW50KTtcclxuXHJcbiAgICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVtb3ZhYmxlc19SZXF1aXJlcyA9IFtdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChsaW5lLmluZGV4T2YoJyByZXF1aXJlKCcpID09PSAtMSlcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgcmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKGxpbmUpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJlZml4ID0gbGluZS5zcGxpdCgnICcpWzFdO1xyXG5cclxuICAgICAgICAgICAgaWYgKHByZWZpeC5pbmRleE9mKCdfJykgIT09IC0xKVxyXG4gICAgICAgICAgICAgICAgcmVtb3ZhYmxlc19SZXF1aXJlcy5wdXNoKHByZWZpeCArICcuJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZW1vdmFibGVzX1JlcXVpcmVzLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodmFsdWUuaW5kZXhPZignPScpID09PSAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoJz0nKSAhPT0gLTEpXHJcbiAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKHZhbHVlLCAnJyk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UobmV3IFJlZ0V4cCh2YWx1ZS50cmltKCksICdnaScpLCAnJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRyYW5zZm9ybWVkRmlsZS5jb250ZW50cyA9IG5ldyBCdWZmZXIoY29udGVudCk7XHJcblxyXG4gICAgICAgIC8vIDMuIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgZmlsZSBmb3IgdXNlIGluIG5leHQgYHBpcGUoKWBcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB0cmFuc2Zvcm1lZEZpbGUpO1xyXG5cclxuICAgIH0pO1xyXG59O1xyXG5cclxuY2xhc3MgQ2xvdWRNYXRlV2ViQ2xlYW5KUyB7XHJcblxyXG4gICAgc3RhdGljIGNsZWFuTGluZXMoY29udGVudDogc3RyaW5nKTogc3RyaW5ne1xyXG5cclxuICAgICAgICBjb25zdCBzdGFydFdpdGhWYWx1ZXMgPSBbXHJcbiAgICAgICAgICAgICdpbXBvcnQgJ1xyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIGxldCByZXN1bHQgPSAnJztcclxuXHJcbiAgICAgICAgZm9yKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpe1xyXG4gICAgICAgICBcclxuICAgICAgICAgICAgbGV0IHNhZmUgPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZm9yKGNvbnN0IHN0YXJ0V2l0aCBvZiBzdGFydFdpdGhWYWx1ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobGluZS5zdGFydHNXaXRoKHN0YXJ0V2l0aCkpXHJcbiAgICAgICAgICAgICAgICAgICAgc2FmZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKHNhZmUpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gbGluZSArICdcXG4nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2xlYW5QcmVmaXhlcyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmd7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZWZpeGVzVmFsdWVzID0gW1xyXG4gICAgICAgICAgICAnZXhwb3J0IGRlZmF1bHQgJyxcclxuICAgICAgICAgICAgJ2V4cG9ydCAnXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgZm9yKGNvbnN0IHByZWZpeCBvZiBwcmVmaXhlc1ZhbHVlcylcclxuICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKCdeKCcgKyBwcmVmaXggKyAnKXxbWzpibGFuazpdXSsoJyArIHByZWZpeCArICcpJywgJ2dtaScpLCAnJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XHJcbiAgICB9XHJcbn0iXX0=
