#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var minimist = require("minimist");
var config_1 = require("./config");
var bundler_1 = require("./bundler");
var compressor_1 = require("./compressor");
var matePackage;
var setPackage = function () {
    matePackage = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json')).toString());
};
var getPackageInfo = function (info) {
    if (!matePackage)
        setPackage();
    return matePackage[info];
};
var args = minimist(process.argv.slice(2));
var versionArgs = args.v || args.version;
var helpArgs = args.h || args.help;
var watchArgs = args.w || args.watch;
var allArgs = args.a || args.all;
var builds = allArgs === true ? null : args._;
if (versionArgs)
    console.log(getPackageInfo('version'));
if (helpArgs) {
    console.log('Usage: mate [builds] [options]');
    console.log('mate\t\t\t will run dev build only');
    console.log('mate dist\t\t will run dist build only');
    console.log('mate dev dist abc\t will run dev, dist, and abc builds only');
    console.log('\nOptions:');
    console.log('-a, --all\t\t run all builds');
    console.log('-h, --help\t\t print mate command line options (currently set)');
    console.log('-v, --version\t\t print CloudMate.js version');
    console.log('-w, --watch\t\t watch defined inputs under the specified build(s)');
}
if (!versionArgs && !helpArgs) {
    var config = config_1.MateConfig.get();
    if (config) {
        if (watchArgs) {
            bundler_1.MateBundler.watch(config, builds);
            compressor_1.MateCompressor.watch(config);
        }
        else {
            bundler_1.MateBundler.execute(config, builds);
            compressor_1.MateCompressor.execute(config);
        }
    }
}
