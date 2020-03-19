import through = require('through2');
import vinyl = require('vinyl');

module.exports = function () {

    return through.obj(function (vinylFile: vinyl, encoding: string, callback: Function) {

        // 1. clone new vinyl file for manipulation
        // (See https://github.com/wearefractal/vinyl for vinyl attributes and functions)

        const transformedFile = vinylFile.clone();

        // 2. set new contents
        // * contents can only be a Buffer, Stream, or null
        // * This allows us to modify the vinyl file in memory and prevents the need to write back to the file system.

        const lines = transformedFile.contents.toString().split('\n');

        const removables_Requires = [];
        const removables_Lines = [];

        console.log('--------------------------');
        console.log('start ********************');
        console.log('--------------------------');
        
        for (let i = 0; i < lines.length; i++) {

            const line = lines[i];

            // console.log(line);

            if (line.indexOf(' require(') === -1)
                continue;

            removables_Requires.push(line);

            const prefix = line.split(' ')[1];

            if (prefix.indexOf('_') !== -1)
                removables_Requires.push(prefix + '.');
        }

        let content = 'var exports = {};\n' + transformedFile.contents.toString();

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

        // 3. pass along transformed file for use in next `pipe()`
        callback(null, transformedFile);

    });
};

class CloudMateWebCleanJS {

    static removeNonDependanciesLines(content: string): string{

        const startWithValues = [
            'AAObject.defineProperty(exports',
            'AAexports.'
        ];

        let result = '';

        for(const line of content.split('\n')){
         
            let safe = true;
            
            for(const startWith of startWithValues)
                if (line.startsWith(startWith))
                    safe = false;
            
            if (safe)
                result += line + '\n';
        }

        return result;
    }
}