import fs = require('fs');
import path = require('path');
import { MateConfig, MateConfigImage } from './config';
import chokidar = require('chokidar');
import imagemin from 'imagemin';
import svgo from 'imagemin-svgo';
import gifsicle = require('imagemin-gifsicle');
import pngquant from 'imagemin-pngquant';
import mozjpeg = require('imagemin-mozjpeg');
import glob = require('glob');
import del = require('del');
import sharp from 'sharp';
import imageminSharp from 'imagemin-sharp';

class ImageQueue {
	public filePath: string;
	public destination: string;
	public plugins: any[];
	public oldSize: number;
	public Config: MateConfigImage;
}

export class MateCompressor {
	static allWatchers: chokidar.FSWatcher[] = [];
	static queue: ImageQueue[] = [];
	static compressionInProgress = false;
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

	static async queueImages(imageConfig: MateConfigImage, override: boolean = false) {

		for (const output of imageConfig.output)
			for (const input of imageConfig.input) {

				const baseDirectory = !this.isFile(input) ? path.dirname(input) : null;

				glob.sync(input, { nodir: true }).forEach(async (file) => {

					if (MateCompressor.queue.map(obj => obj.filePath).indexOf(file) !== -1)
						return;

					let fileExtention = file.split('.').pop().toLowerCase();

					let destination = output;

					if (baseDirectory)
						destination = output + path.dirname(file).substring(baseDirectory.length);

					let runPlugins = true;

					let outputFileName = file.replace(/^.*[\\\/]/, '');

					if (imageConfig.outputFormat)
						outputFileName = outputFileName.replace(/\.[^/.]+$/, "") + '.' + imageConfig.outputFormat;

					const fileExists = fs.existsSync(destination + '/' + outputFileName)

					if (!override && fileExists)
						runPlugins = false;

					const plugins = [];

					switch (fileExtention) {

						case "png":
						case "jpeg":
						case "jpg":
						case "gif":
						case "webp":
						case "avif":
						case "tiff":
							plugins.push(imageminSharp({

								chainSharp: async (originalImage) => {

									let sharpResult = originalImage;

									sharpResult = originalImage
										.resize(
											imageConfig.maxWidth, imageConfig.maxHeight,
											{
												fit: 'inside',
												withoutEnlargement: true
											});

									if (imageConfig.outputFormat) {
										fileExtention = imageConfig.outputFormat.toLowerCase();
										sharpResult.toFormat(imageConfig.outputFormat);
									}

									return sharpResult;
								},
							}));
							break;

						default: break;
					}

					switch (fileExtention) {

						case "svg":
							plugins.push(svgo());
							break;

						case "png":
							plugins.push(pngquant({
								quality: [0.6, 0.8]
							}));
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

					if (runPlugins) {
						const image = new ImageQueue();
						image.filePath = file;
						image.destination = destination;
						image.plugins = plugins;
						image.oldSize = fs.readFileSync(file).byteLength;
						image.Config = imageConfig;
						MateCompressor.queue.push(image);
					}
				})
			}
	}

	static compressImages(isContinuous = false) {

		if (MateCompressor.queue.length == 0) {
			MateCompressor.compressionInProgress = false;
			return;
		}

		if (!isContinuous && MateCompressor.compressionInProgress)
			return;

		MateCompressor.compressionInProgress = true;

		const image = MateCompressor.queue.shift();

		const result = imagemin([image.filePath], {
			destination: image.destination,
			plugins: image.plugins,
			glob: false
		});

		result.then((e) => {

			if (!image.Config.outputFormat) {
				const destinationPath = image.destination + '/' + image.filePath.split('/').pop();
				const newZise = fs.readFileSync(destinationPath).byteLength;

				if (newZise > image.oldSize)
					fs.copyFile(image.filePath, destinationPath, (err) => {
						if (err) throw err;
					});
			}

			MateCompressor.compressImages(true);
		});

		result.catch((e) => {
			MateCompressor.compressImages(true);
		});
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
