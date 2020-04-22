const path = require('path');
import { MateConfig, MateConfigFile, MateConfigBuild, MateConfigTSConfig } from './config';
import chokidar = require('chokidar');
const gulp = require('gulp');
const gulpLess = require('gulp-less');
const gulpSass = require('gulp-sass');
const gulpRename = require('gulp-rename');
const gulpConcat = require('gulp-concat');
const gulpTs = require('gulp-typescript');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpMinify = require('gulp-minify');
const merge2 = require('merge2');
const gulpCleanCSS = require('gulp-clean-css');
const gulpFilter = require('gulp-filter-each');
const webClean = require('./webcleanjs');

export class MateBundler {
	static allWatchers: chokidar.FSWatcher[] = [];

	static execute(config?: MateConfig, builds?: string[]): void {
		console.log('executed at ' + new Date().toTimeString());

		config.files.forEach((file): void => {
			MateBundler.runFiles(config, file, builds);
		});
	}

	static watch(config: MateConfig, builds?: string[]) {
		if (builds === undefined || (builds !== null && builds.length === 0)) builds = ['dev'];

		const configWatcher = chokidar.watch(MateConfig.availableConfigurationFile, { persistent: true }).on('change', (event, path: string) => {
			this.allWatchers.forEach((watcher: chokidar.FSWatcher) => {
				watcher.close();
			});

			this.allWatchers = [];

			this.watch(config, builds);
		});

		this.allWatchers.push(configWatcher);

		config.files.forEach((file) => {
			file.builds.forEach((buildName) => {
				if (builds === null || builds.indexOf(buildName) !== -1) {
					const extensions = ['less', 'scss'];

					const watchPaths: string[] = [];

					file.input.forEach((path) => {
						watchPaths.push(path);
					});

					for (const extension of extensions) if (MateConfigFile.hasExtension(file.input, extension)) watchPaths.push('./**/*.' + extension);

					const watch = chokidar.watch(watchPaths, { persistent: true }).on('change', (event, path: string) => {
						this.runFiles(config, file, [buildName]);
					});

					this.allWatchers.push(watch);
				}
			});
		});

		this.execute(config, builds);
	}

	static runFiles(config: MateConfig, file: MateConfigFile, builds?: string[]) {
		if (builds === undefined || (builds !== null && builds.length === 0)) builds = ['dev'];

		file.output.forEach((output) => {
			const outputExtention = output.split('.').pop().toLowerCase();
			const outputFileName = output.replace(/^.*[\\\/]/, '');

			file.builds.forEach((buildName): void => {
				if (builds !== null && builds.indexOf(buildName) === -1) return;

				const build = config.getBuild(buildName);

				let outputDirectory = build.outDir ? build.outDir : path.dirname(output);

				if (build.outDirVersioning) outputDirectory += '/' + config.getOutDirVersion();

				if (build.outDirName) outputDirectory += '/' + config.getOutDirName();

				switch (outputExtention) {
					case 'css':
						if (build.css.outDirSuffix) outputDirectory += '/' + build.css.outDirSuffix;

						break;

					case 'js':
						if (build.js.outDirSuffix) outputDirectory += '/' + build.js.outDirSuffix;

						break;
				}

				if (build.js.declaration === true) MateBundler.createTypeScriptDeclaration(file.input, outputDirectory, outputFileName, build);

				let process = MateBundler.bundle(file.input, outputExtention, build).pipe(gulpConcat('empty'));

				process = process.pipe(gulpRename(outputFileName)).pipe(gulp.dest(outputDirectory));

				switch (outputExtention) {
					case 'css':
						if (build.css.minify) {
							process
								.pipe(gulpCleanCSS())
								.pipe(gulpRename({ suffix: '.min' }))
								.pipe(gulp.dest(outputDirectory));
						}
						break;

					case 'js':
						if (build.js.minify) {
							process
								.pipe(
									gulpMinify({
										ext: {
											src: '.js',
											min: '.min.js',
										},
									})
								)
								.pipe(gulp.dest(outputDirectory));
						}
						break;
				}
			});
		});
	}

	static createTypeScriptDeclaration(files: string[], outputDirectory: string, outputFileName: string, build: MateConfigBuild): void {
		const typescriptDeclarations: string[] = [];

		files.forEach((file) => {
			const fileExtention = file.split('.').pop().toLowerCase();

			if (fileExtention === 'ts' && !file.toLocaleLowerCase().endsWith('.d.ts')) typescriptDeclarations.push(file);
		});

		if (typescriptDeclarations.length > 0)
			MateBundler.compile(typescriptDeclarations, 'd.ts', 'ts', build)
				.pipe(gulpFilter((content, filepath: string) => filepath.toLowerCase().endsWith('.d.ts')))
				.pipe(gulpConcat('empty'))
				.pipe(webClean({ isDeclaration: true }))
				.pipe(
					gulpRename({
						basename: outputFileName.replace('.js', ''),
						suffix: '.d',
						extname: '.ts',
					})
				)
				.pipe(gulp.dest(outputDirectory));
	}

	static bundle(files: string[], outputExtention: string, build: MateConfigBuild): any {
		const process: any[] = [];

		let groupFilesExtention = '';
		let groupedFiles: string[] = [];

		files.forEach((file) => {
			const fileExtention = file.split('.').pop().toLowerCase();

			if (fileExtention !== groupFilesExtention) {
				if (groupedFiles.length > 0) {
					process.push(MateBundler.compile(groupedFiles, groupFilesExtention, outputExtention, build));
					groupedFiles = [];
				}

				groupFilesExtention = fileExtention;
			}

			groupedFiles.push(file);
		});

		if (groupedFiles.length > 0) process.push(MateBundler.compile(groupedFiles, groupFilesExtention, outputExtention, build));

		const stream = merge2();

		process.forEach((p) => {
			stream.add(p);
		});

		return stream;
	}

	static compile(files: string[], inputExtention: string, outputExtention: string, build: MateConfigBuild): any {
		let process = gulp.src(files);

		if (inputExtention === outputExtention) return process.pipe(gulpConcat('empty'));

		switch (inputExtention) {
			case 'css':
				return process.pipe(gulpConcat('empty'));

			case 'less':
				if (build.css.sourceMap) process = process.pipe(gulpSourcemaps.init());

				process = process.pipe(gulpLess());

				if (build.css.sourceMap) process = process.pipe(gulpSourcemaps.write());

				return process.pipe(gulpConcat('empty'));

			case 'scss':
				if (build.css.sourceMap) process = process.pipe(gulpSourcemaps.init());

				process = process.pipe(gulpSass().on('error', gulpSass.logError));

				if (build.css.sourceMap) process = process.pipe(gulpSourcemaps.write());

				return process.pipe(gulpConcat('empty'));

			case 'ts':
				if (build.js.sourceMap) process = process.pipe(gulpSourcemaps.init());

				process = process.pipe(gulpTs(build.ts.compilerOptions));

				if (outputExtention === 'js' && build.js.webClean) process = process.pipe(webClean());

				if (build.js.sourceMap) process = process.pipe(gulpSourcemaps.write());

				return process.pipe(gulpConcat('empty'));

			case 'd.ts':
				return process.pipe(gulpTs(MateConfigTSConfig.declarationCompilerOptions(build.ts.compilerOptions)));
		}

		return process;
	}
}
