#!/usr/bin/env node
const params = require('./params.js');
const { init } = require('./init');

init(params).start();