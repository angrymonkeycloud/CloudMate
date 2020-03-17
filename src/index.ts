#!/usr/bin/env node

import { runBuild, watch } from "./main";
import fs = require('fs');
import path = require('path');
import minimist = require('minimist');




let matePackage: object;
const setPackage = function(){
    matePackage = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')).toString());
}

const getPackageInfo = function(info: string){

    if (!matePackage)
        setPackage();

    return matePackage[info];
}


const args = minimist(process.argv.slice(2));

// Version

if (args.v || args.version)
    console.log(getPackageInfo('version'));

// Help

if (args.h || args.help){
 
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

// Watch
const watchArgs = args.w || args.watch;
const allArgs = args.a || args.all;
const builds = allArgs === true? null : args._;

if (watchArgs)
    watch(builds);
else runBuild(builds);