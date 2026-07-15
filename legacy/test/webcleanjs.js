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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViY2xlYW5qcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYmNsZWFuanMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQ0FBcUM7QUFHckMsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFVLGFBQXVCO0lBQ2pELElBQUksYUFBYSxLQUFLLFNBQVM7UUFBRSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBRXZELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLFNBQWdCLEVBQUUsUUFBZ0IsRUFBRSxRQUFrQjtRQUNsRixJQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFMUMsSUFBSSxPQUFPLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVsRCxJQUFJLENBQUMsYUFBYTtZQUFFLE9BQU8sR0FBRyxxQkFBcUIsR0FBRyxPQUFPLENBQUM7UUFFOUQsT0FBTyxHQUFHLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxHQUFHLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVyRCxJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWxDLElBQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDO1lBRS9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFdEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFBRSxTQUFTO2dCQUUvQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRS9CLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWxDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN4RSxDQUFDO1lBRUQsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSztnQkFDMUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7b0JBQUUsT0FBTztnQkFFckMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFBRSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7O29CQUMvRCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsZUFBZSxDQUFDLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUcvQyxRQUFRLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBRUY7SUFBQTtJQXdCQSxDQUFDO0lBdkJPLDhCQUFVLEdBQWpCLFVBQWtCLE9BQWU7UUFDaEMsSUFBTSxlQUFlLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVwQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFFaEIsS0FBbUIsVUFBbUIsRUFBbkIsS0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFuQixjQUFtQixFQUFuQixJQUFtQixFQUFFLENBQUM7WUFBcEMsSUFBTSxJQUFJLFNBQUE7WUFDZCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7WUFFaEIsS0FBd0IsVUFBZSxFQUFmLG1DQUFlLEVBQWYsNkJBQWUsRUFBZixJQUFlO2dCQUFsQyxJQUFNLFNBQVMsd0JBQUE7Z0JBQXFCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7b0JBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQzthQUFBO1lBRXRGLElBQUksSUFBSTtnQkFBRSxNQUFNLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0saUNBQWEsR0FBcEIsVUFBcUIsT0FBZTtRQUNuQyxJQUFNLGNBQWMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRELEtBQXFCLFVBQWMsRUFBZCxpQ0FBYyxFQUFkLDRCQUFjLEVBQWQsSUFBYztZQUE5QixJQUFNLE1BQU0sdUJBQUE7WUFBb0IsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sR0FBRyxpQkFBaUIsR0FBRyxNQUFNLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQUE7UUFFeEksT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUNGLDBCQUFDO0FBQUQsQ0FBQyxBQXhCRCxJQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcclxuaW1wb3J0IHZpbnlsID0gcmVxdWlyZSgndmlueWwnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGlzRGVjbGFyYXRpb24/OiBCb29sZWFuKSB7XHJcblx0aWYgKGlzRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkgaXNEZWNsYXJhdGlvbiA9IGZhbHNlO1xyXG5cclxuXHRyZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24gKHZpbnlsRmlsZTogdmlueWwsIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbikge1xyXG5cdFx0Y29uc3QgdHJhbnNmb3JtZWRGaWxlID0gdmlueWxGaWxlLmNsb25lKCk7XHJcblxyXG5cdFx0bGV0IGNvbnRlbnQgPSB0cmFuc2Zvcm1lZEZpbGUuY29udGVudHMudG9TdHJpbmcoKTtcclxuXHJcblx0XHRpZiAoIWlzRGVjbGFyYXRpb24pIGNvbnRlbnQgPSAndmFyIGV4cG9ydHMgPSB7fTtcXG4nICsgY29udGVudDtcclxuXHJcblx0XHRjb250ZW50ID0gQ2xvdWRNYXRlV2ViQ2xlYW5KUy5jbGVhbkxpbmVzKGNvbnRlbnQpO1xyXG5cclxuXHRcdGlmICghaXNEZWNsYXJhdGlvbikge1xyXG5cdFx0XHRjb250ZW50ID0gQ2xvdWRNYXRlV2ViQ2xlYW5KUy5jbGVhblByZWZpeGVzKGNvbnRlbnQpO1xyXG5cclxuXHRcdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKTtcclxuXHJcblx0XHRcdGNvbnN0IHJlbW92YWJsZXNfUmVxdWlyZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblxyXG5cdFx0XHRcdGlmIChsaW5lLmluZGV4T2YoJyByZXF1aXJlKCcpID09PSAtMSkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdHJlbW92YWJsZXNfUmVxdWlyZXMucHVzaChsaW5lKTtcclxuXHJcblx0XHRcdFx0Y29uc3QgcHJlZml4ID0gbGluZS5zcGxpdCgnICcpWzFdO1xyXG5cclxuXHRcdFx0XHRpZiAocHJlZml4LmluZGV4T2YoJ18nKSAhPT0gLTEpIHJlbW92YWJsZXNfUmVxdWlyZXMucHVzaChwcmVmaXggKyAnLicpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZW1vdmFibGVzX1JlcXVpcmVzLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XHJcblx0XHRcdFx0aWYgKHZhbHVlLmluZGV4T2YoJz0nKSA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRpZiAodmFsdWUuaW5kZXhPZignPScpICE9PSAtMSkgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSh2YWx1ZSwgJycpO1xyXG5cdFx0XHRcdGVsc2UgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShuZXcgUmVnRXhwKHZhbHVlLnRyaW0oKSwgJ2dpJyksICcnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dHJhbnNmb3JtZWRGaWxlLmNvbnRlbnRzID0gbmV3IEJ1ZmZlcihjb250ZW50KTtcclxuXHJcblx0XHQvLyAzLiBwYXNzIGFsb25nIHRyYW5zZm9ybWVkIGZpbGUgZm9yIHVzZSBpbiBuZXh0IGBwaXBlKClgXHJcblx0XHRjYWxsYmFjayhudWxsLCB0cmFuc2Zvcm1lZEZpbGUpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuY2xhc3MgQ2xvdWRNYXRlV2ViQ2xlYW5KUyB7XHJcblx0c3RhdGljIGNsZWFuTGluZXMoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHN0YXJ0V2l0aFZhbHVlcyA9IFsnaW1wb3J0ICddO1xyXG5cclxuXHRcdGxldCByZXN1bHQgPSAnJztcclxuXHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcclxuXHRcdFx0bGV0IHNhZmUgPSB0cnVlO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBzdGFydFdpdGggb2Ygc3RhcnRXaXRoVmFsdWVzKSBpZiAobGluZS5zdGFydHNXaXRoKHN0YXJ0V2l0aCkpIHNhZmUgPSBmYWxzZTtcclxuXHJcblx0XHRcdGlmIChzYWZlKSByZXN1bHQgKz0gbGluZSArICdcXG4nO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY2xlYW5QcmVmaXhlcyhjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgcHJlZml4ZXNWYWx1ZXMgPSBbJ2V4cG9ydCBkZWZhdWx0ICcsICdleHBvcnQgJ107XHJcblxyXG5cdFx0Zm9yIChjb25zdCBwcmVmaXggb2YgcHJlZml4ZXNWYWx1ZXMpIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UobmV3IFJlZ0V4cCgnXignICsgcHJlZml4ICsgJyl8W1s6Ymxhbms6XV0rKCcgKyBwcmVmaXggKyAnKScsICdnbWknKSwgJycpO1xyXG5cclxuXHRcdHJldHVybiBjb250ZW50O1xyXG5cdH1cclxufVxyXG4iXX0=