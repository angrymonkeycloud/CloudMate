import fs = require('fs');
import path = require('path');
import { MateConfig, MateConfigImage } from './config';
import chokidar = require('chokidar');
import imagemin = require('imagemin');
import svgo = require('imagemin-svgo');
import mozjpeg = require('imagemin-mozjpeg');
import optipng = require('imagemin-optipng');
import gifsicle = require('imagemin-gifsicle');
import glob = require('glob');
import del = require('del');

export class MateCompressor {
	static allWatchers: chokidar.FSWatcher[] = [];

	static watch(config: MateConfig) {

		if (config.images === undefined)
			return;

		config.images.forEach((file) => {

			const watchPaths: string[] = [];

			file.input.forEach((path) => {
				watchPaths.push(path);
			});

			const watch = chokidar.watch(watchPaths, { persistent: true })
				.on('unlink', (filePath) => { this.delete(file, filePath); })
				.on('add', () => { this.compress(file); })
				.on('change', () => { this.compress(file, true); });

			this.allWatchers.push(watch);
		});

		this.execute(config);
	}

	static execute(config?: MateConfig): void {

		if (config.images === undefined)
			return;

		config.images.forEach((image): void => {
			MateCompressor.compress(image);
		});
	}

	private static isFile(filePath: string): boolean {

		if (!fs.existsSync(filePath))
			return false;

		return fs.statSync(filePath).isFile();
	}

	static async compress(image: MateConfigImage, override: boolean = false) {

		for (const output of image.output)
			for (const input of image.input) {

				const baseDirectory = !this.isFile(input) ? path.dirname(input) : null;

				glob.sync(input, { nodir: true }).forEach(async (file) => {

					const fileExtention = file.split('.').pop().toLowerCase();

					const plugins = [];

					switch (fileExtention) {

						case "svg":
							plugins.push(svgo());
							break;

						case "png":
							plugins.push(optipng());
							break;

						case "jpeg":
						case "jpg":
							plugins.push(mozjpeg());
							break;

						case "gif":
							plugins.push(gifsicle());
							break;

						default:
							break;
					}

					if (plugins.length === 0)
						return;

					let destination = output;

					if (baseDirectory)
						destination = output + path.dirname(file).substring(baseDirectory.length);

					let doCompress = true;

					if (!override) {
						const outputFileName = file.replace(/^.*[\\\/]/, '');

						if (fs.existsSync(destination + '/' + outputFileName))
							doCompress = false;
					}

					if (doCompress)
						await imagemin([file], {
							destination: destination,
							plugins: plugins,
							glob: false
						});
				})
			}
	}

	static async delete(image: MateConfigImage, filePath: string) {

		for (const output of image.output)
			for (const input of image.input) {

				const baseDirectory = !this.isFile(input) ? path.dirname(input) : null;

				let destination = output;

				if (baseDirectory)
					destination = output + path.dirname(filePath).substring(baseDirectory.length);

				const outputFileName = filePath.replace(/^.*[\\\/]/, '');
				const fileToDelete = destination + '/' + outputFileName;

				del(fileToDelete);
			}
	}
}
