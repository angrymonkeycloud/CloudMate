const gulp = require('gulp');
const ts = require('gulp-typescript');
const gulpSourcemaps = require("gulp-sourcemaps");

gulp.task('index', function() {

    return gulp.src('src/index.ts')
        .pipe(gulpSourcemaps.init())
        .pipe(ts())
        .pipe(gulpSourcemaps.write())
        .pipe(gulp.dest('test'));
});

gulp.task('main', function() {

    return gulp.src('src/main.ts')
        .pipe(gulpSourcemaps.init())
        .pipe(ts())
        .pipe(gulpSourcemaps.write())
        .pipe(gulp.dest('test'));
});

gulp.task('config', function() {

    return gulp.src('src/config.ts')
        .pipe(gulpSourcemaps.init())
        .pipe(ts())
        .pipe(gulpSourcemaps.write())
        .pipe(gulp.dest('test'));
});

gulp.task('clean', function() {

    return gulp.src('src/clean.ts')
        .pipe(gulpSourcemaps.init())
        .pipe(ts())
        .pipe(gulpSourcemaps.write())
        .pipe(gulp.dest('test'));
});

gulp.task('default', gulp.series('index', 'clean', 'main', 'config'));

gulp.watch("src/config.ts", gulp.series("config", "main", "index"));
gulp.watch("src/main.ts", gulp.series("main", "index"));
gulp.watch("src/index.ts", gulp.series("index"));
gulp.watch("src/clean.ts", gulp.series("clean"));