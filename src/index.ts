#!/usr/bin/env node

import { run } from "./main";
import { MateConfig } from "./config";
    
const config = MateConfig.fromFile('mateconfig.json');;

run(config);