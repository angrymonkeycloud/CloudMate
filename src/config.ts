import fs = require('fs');

export class MateConfig{

    static get = function(): MateConfig {

        const data = fs.readFileSync('mateconfig.json');

        const configJson: MateConfig = JSON.parse(data.toString());
        
        let config = new MateConfig(configJson.name, configJson.version, configJson.files, configJson.builds);

        config.setUndefined();
        return config;
    };

    private constructor(_name:string, _version: string, _files: MateConfigFile[], _builds: MateConfigBuild[]){

        this.name = _name;
        this.version = _version;
        this.files = _files;
        this.builds = _builds;

        if (this.builds === undefined)
            this.builds = [];
    }
    
    name?: string;
    version?: string;
    files: MateConfigFile[];
    builds: MateConfigBuild[];

    private package: object;
    private setPackage(){
        this.package = JSON.parse(fs.readFileSync('package.json').toString());
    }

    private getPackageInfo(info: string){

        if (!this.package)
            this.setPackage();

        return this.package[info];
    }

    getOutDirName(): string {
        
        if (this.name)
            return this.name;
            
        if (this.getPackageInfo('name'))
            return this.getPackageInfo('name');

        return undefined;
    }

    getOutDirVersion(): string {
        
        if (this.version)
            return this.version;
            
        if (this.getPackageInfo('version'))
            return this.getPackageInfo('version');

        return undefined;
    }

    getBuild(name: string): MateConfigBuild{

        if (name === undefined || name === null || name === '')
            name = 'dev';
        
        for(const build of this.builds)
            if (build.name === name)
                return build;
    }
    
    setUndefined(): void {

        // Builds
        
        let devBuildExists = false;
    
        this.builds.forEach((build: MateConfigBuild) => {
    
            if (build.name === 'dev')
                devBuildExists = true;

                MateConfigBuild.setUndefined(build);
    
        });

        if (!devBuildExists)
        {
            const devBuild = new MateConfigBuild('dev');
            MateConfigBuild.setUndefined(devBuild);

            this.builds.push(devBuild);
        }

        // Files

        this.files.forEach((file: MateConfigFile) => {
            if (file.builds === undefined)
            {
                file.builds = [];
                file.builds.push('dev');
            }
        });
    }
}

export class MateConfigFile{
    input: string[];
    output: string[];
    builds?: string[];
}

export class MateConfigBuild{
    name: string;
    outDir?: string;
    outDirVersioning?: boolean;
    outDirName?: boolean;
    css?: MateConfigCSSConfig;
    js?: MateConfigJSConfig;
    ts?: MateConfigTSConfig;

    constructor(_name: string){
        this.name = _name;
    }

    static setUndefined(build: MateConfigBuild): void {
    
        if (!build.outDirVersioning)
            build.outDirVersioning = false;

        if (!build.outDirName)
            build.outDirName = false;

        // CSS

        if (build.css === undefined)
            build.css = new MateConfigCSSConfig();
    
        MateConfigCSSConfig.setUndefined(build.css);
    
        // JS

        if (build.js === undefined)
            build.js = new MateConfigJSConfig();
    
        MateConfigJSConfig.setUndefined(build.js);
    
        // TS

        if (build.ts === undefined)
            build.ts = new MateConfigTSConfig();
    
        MateConfigTSConfig.setUndefined(build.ts);
    }
}

export class MateConfigBaseConfig{

    outDirSuffix?: string;
}

export class MateConfigCSSConfig extends MateConfigBaseConfig {

    minify?: boolean;
    sourceMap?: boolean;

    static setUndefined(css: MateConfigCSSConfig): void {
    
        if (css.minify === undefined)
            css.minify = true;
    
        if (css.sourceMap === undefined)
            css.sourceMap = false;
    }
}

export class MateConfigJSConfig extends MateConfigBaseConfig{

    minify?: boolean;
    sourceMap?: boolean;

    static setUndefined(js: MateConfigJSConfig): void {
    
        if (js.minify === undefined)
            js.minify = true;
    
        if (js.sourceMap === undefined)
            js.sourceMap = true;
    }
}

export class MateConfigTSConfig extends MateConfigBaseConfig{

    compilerOptions?: tsCompilerOptions;


    static setUndefined(ts: MateConfigTSConfig): void {
    
        if (ts.compilerOptions === undefined)
            ts.compilerOptions = {  declaration: true };
    }
}

interface tsCompilerOptions{
    declaration?: boolean;
}