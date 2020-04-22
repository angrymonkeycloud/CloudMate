import fs = require('fs');
import glob = require('glob');
import { cosmiconfigSync } from 'cosmiconfig';
import { CosmiconfigResult } from 'cosmiconfig/dist/types';
import * as ts from "typescript";

export class MateConfig {
	private static _configurationExplorer;
	private static get configurationExplorer() {
		if (this._configurationExplorer !== undefined) return this._configurationExplorer;

		this._configurationExplorer = cosmiconfigSync('mateconfig', {
			searchPlaces: [
				'.mateconfig',
				'.mateconfig.json',
				'.mateconfig.yaml',
				'.mateconfig.yml',
				'.mateconfig.js',
				'mateconfig.json', // Deprecated
				'package.json',
			],
			transform: (result) => {
				if (!result || !result.config) return result;

				if (typeof result.config !== 'object') throw new Error(`Config is only allowed to be an object, but received ${typeof result.config} in "${result.filepath}"`);

				delete result.config.$schema;

				return result;
			},
		});

		return this._configurationExplorer;
	}

	static get availableConfigurationFile(): string {
		const explorer = this.configurationExplorer;

		try {
			const result = explorer.search();
			return result.filepath;
		} catch {
			throw new Error('Configuration file was not found.');
		}
	}

	static get(): MateConfig {
		const configurationFile = MateConfig.availableConfigurationFile;

		if (!configurationFile) return null;

		let configJson: MateConfig;

		const result: CosmiconfigResult = this.configurationExplorer.load(configurationFile);
		configJson = result.config;

		if (!configJson) throw new Error('Error parsing configuration file.');

		let config = new MateConfig(configJson.name, configJson.version, configJson.files, configJson.builds);
		config.format = configJson.format;

		const tsConfigPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");

		if (tsConfigPath)
			config.builds.forEach((build) => {
				if (!build.ts)
					build.ts = tsConfigPath;
			});

		config.setUndefined();
		return config;
	}

	private constructor(_name: string, _version: string, _files: MateConfigFile[], _builds: MateConfigBuild[]) {
		this.name = _name;
		this.version = _version;
		this.files = _files;
		this.builds = _builds;

		if (this.builds === undefined) this.builds = [];
	}

	name?: string;
	version?: string;
	files: MateConfigFile[];
	builds: MateConfigBuild[];
	format?: MateConfigFormatterConfig;

	private package: object;
	private setPackage() {
		this.package = JSON.parse(fs.readFileSync('package.json').toString());
	}

	private getPackageInfo(info: string) {
		if (!this.package) this.setPackage();

		return this.package[info];
	}

	getOutDirName(): string {
		if (this.name) return this.name;

		if (this.getPackageInfo('name')) return this.getPackageInfo('name');

		return undefined;
	}

	getOutDirVersion(): string {
		if (this.version) return this.version;

		if (this.getPackageInfo('version')) return this.getPackageInfo('version');

		return undefined;
	}

	getBuild(name: string): MateConfigBuild {
		if (name === undefined || name === null || name === '') name = 'dev';

		for (const build of this.builds) if (build.name === name) return build;
	}

	setUndefined(): void {
		// Builds

		let devBuildExists = false;

		this.builds.forEach((build: MateConfigBuild) => {
			if (build.name === 'dev') devBuildExists = true;

			MateConfigBuild.setUndefined(build);
		});

		if (!devBuildExists) {
			const devBuild = new MateConfigBuild('dev');
			MateConfigBuild.setUndefined(devBuild);

			this.builds.push(devBuild);
		}

		// Files

		this.files.forEach((file: MateConfigFile) => {
			if (file.builds === undefined) {
				file.builds = [];
				file.builds.push('dev');
			}
		});
	}
}

export class MateConfigFile {
	input: string[];
	output: string[];
	builds?: string[];

	static hasExtension(input: string[], extension: string): boolean {
		const mathExpression = new RegExp('\\.' + extension + '$');

		for (const path of input)
			for (const file of glob.sync(path)) {
				if (file.match(mathExpression)) return true;
			}

		return false;
	}
}

export class MateConfigBuild {
	name: string;
	outDir?: string;
	outDirVersioning?: boolean;
	outDirName?: boolean;
	css?: MateConfigCSSConfig;
	js?: MateConfigJSConfig;
	ts?: string;

	constructor(_name: string) {
		this.name = _name;
	}

	static setUndefined(build: MateConfigBuild): void {
		if (!build.outDirVersioning) build.outDirVersioning = false;

		if (!build.outDirName) build.outDirName = false;

		// CSS

		if (build.css === undefined) build.css = new MateConfigCSSConfig();

		MateConfigCSSConfig.setUndefined(build.css);

		// JS

		if (build.js === undefined) build.js = new MateConfigJSConfig();

		MateConfigJSConfig.setUndefined(build.js);
	}
}

export class MateConfigBaseConfig {
	outDirSuffix?: string;
}

export class MateConfigCSSConfig extends MateConfigBaseConfig {
	minify?: boolean;
	sourceMap?: boolean;

	static setUndefined(css: MateConfigCSSConfig): void {
		if (css.minify === undefined) css.minify = true;

		if (css.sourceMap === undefined) css.sourceMap = false;
	}
}

export class MateConfigJSConfig extends MateConfigBaseConfig {
	minify?: boolean;
	sourceMap?: boolean;
	declaration?: boolean;
	webClean?: boolean;

	static setUndefined(js: MateConfigJSConfig): void {
		if (js.minify === undefined) js.minify = true;

		if (js.sourceMap === undefined) js.sourceMap = true;

		if (js.declaration === undefined) js.declaration = true;

		if (js.webClean === undefined) js.webClean = false;
	}
}

export class MateConfigFormatterConfig {
	path: string | string[];
}