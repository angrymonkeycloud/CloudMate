const prettier = require('prettier');
import fs = require('fs');
import glob = require('glob');
import { MateConfig } from './config';
import chokidar = require('chokidar');

export class MateFormatter {
	static allWatchers: chokidar.FSWatcher[] = [];

	static execute(config: MateConfig): void {
		if (!config || !config.format || !config.format.path) return;

		prettier.resolveConfigFile().then((configPath: string) => {
			prettier.resolveConfig(configPath).then((options) => {
				this.configPaths(config).forEach((path: string) => {
					this.formatPath(config, path, options);
				});
			});
		});
	}

	private static formatPath(config: MateConfig, path: string, options?: any) {
		glob(path, (error, files) => {
			if (error) throw new Error(error.message);

			for (const file of files) {
				this.formatFile(file, options);
			}
		});
	}

	private static formatFile(file: string, options?: any) {
		if (file.toLocaleLowerCase().indexOf('.min.') !== -1) return;

		fs.readFile(file, (error, content) => {
			switch (file.split('.').pop().toLocaleLowerCase()) {
				//#region Scripts

				case 'js':
					options.parser = 'babel';
					break;

				case 'ts':
					options.parser = 'typescript';
					break;

				//#endregion

				//#region Styles

				case 'css':
					options.parser = 'css';
					break;

				case 'less':
					options.parser = 'less';
					break;

				case 'scss':
					options.parser = 'scss';
					break;

				//#endregion

				//#region Html

				case 'html':
					options.parser = 'html';
					break;

				//#endregion

				//#region Markdown

				case 'md':
					options.parser = 'markdown';
					break;

				//#endregion

				//#region Data

				case 'json':
					options.parser = 'json';
					break;

				case 'yaml':
				case 'yml':
					options.parser = 'yaml';
					break;

				//#endregion

				default:
					if (file.startsWith('.')) options.parser = 'json';
					else return;
			}

			try {
				const formattedContent = prettier.format(content.toString(), options);

				if (formattedContent !== content.toString()) fs.writeFile(file, formattedContent, () => {});
			} catch {}
		});
	}

	static watch(config: MateConfig) {
		const configWatcher = chokidar.watch(MateConfig.availableConfigurationFile, { persistent: true }).on('change', (event, path: string) => {
			this.allWatchers.forEach((watcher: chokidar.FSWatcher) => {
				watcher.close();
			});

			this.allWatchers = [];

			this.watch(config);
		});

		this.allWatchers.push(configWatcher);

		prettier.resolveConfigFile().then((configPath: string) => {
			prettier.resolveConfig(configPath).then((options) => {
				const watch = chokidar.watch(this.configPaths(config), { persistent: true }).on('change', (path) => {
					this.formatPath(config, path, options);
				});

				this.allWatchers.push(watch);
			});
		});

		this.execute(config);
	}

	private static configPaths(config: MateConfig): string[] {
		let paths: string[];

		if (typeof config.format.path == 'string') paths = [config.format.path];
		else paths = config.format.path;

		return paths;
	}
}
