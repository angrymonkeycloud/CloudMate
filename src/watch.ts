#!/usr/bin/env node

import { MateConfig } from "./config";
import chokidar = require('chokidar');
import { runFiles, run } from "./main";

let config = MateConfig.fromFile('mateconfig.json');
let allWatchers: chokidar.FSWatcher[] = [];

const watch = function () {

    const configWatcher = chokidar.watch('mateconfig.json', { persistent: true})
                                    .on('change', (event, path: string) => {

                                        allWatchers.forEach((watcher: chokidar.FSWatcher) =>
                                        {
                                            watcher.close();
                                        });

                                        allWatchers = [];

                                        config = MateConfig.fromFile('mateconfig.json');
                                        
                                        run(config);
                                        watch();
                                    });

    allWatchers.push(configWatcher);

    config.files.forEach((file) => {
        file.builds.forEach((buildName) => {
            
            if (buildName == 'dev') {

                const watch = chokidar.watch(file.input, { persistent: true})
                                        .on('change', (event, path: string) => {
                                            runFiles(config, file, [buildName]);
                                        });

                allWatchers.push(watch);
            }
        });
    });
};

run(config);
watch();