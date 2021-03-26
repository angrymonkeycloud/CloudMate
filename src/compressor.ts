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


class ImageQueue {
	public filePath: string;
	public destination: string;
	public plugins: any[];
}

export class MateCompressor {
	static allWatchers: chokidar.FSWatcher[] = [];
	static queue: ImageQueue[] = [];
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
				.on('add', () => {
					this.queueImages(file);
					MateCompressor.compressImages();
				})
				.on('change', () => {
					this.queueImages(file, true);
					MateCompressor.compressImages();
				});

			this.allWatchers.push(watch);
		});

		this.execute(config);
	}

	static execute(config?: MateConfig): void {

		if (config.images === undefined)
			return;

		config.images.forEach((image): void => {
			MateCompressor.queueImages(image);
		});

		MateCompressor.compressImages();
	}

	private static isFile(filePath: string): boolean {

		if (!fs.existsSync(filePath))
			return false;

		return fs.statSync(filePath).isFile();
	}

	static async queueImages(image: MateConfigImage, override: boolean = false) {

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


					if (doCompress) {
						const image = new ImageQueue();
						image.filePath = file;
						image.destination = destination;
						image.plugins = plugins;
						MateCompressor.queue.push(image);
					}
				})
			}
	}

	static compressImages() {

		if (MateCompressor.queue.length == 0)
			return;

		const image = MateCompressor.queue.shift();
		var date = new Date();
		var time = date.getHours() + ":" + date.getSeconds();
		console.log("start: " + image.filePath + " @ " + time);

		const result = imagemin([image.filePath], {
			destination: image.destination,
			plugins: image.plugins,
			glob: false
		});

		result.then((e) => {
			date = new Date();
			time = date.getHours() + ":" + date.getSeconds();
			console.log("end: " + image.filePath + " @ " + time);
			MateCompressor.compressImages();
		})

		result.catch((e) => {
			console.log(e);
		})
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
