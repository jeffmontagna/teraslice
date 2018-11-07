'use strict';
'use console';

const _ = require('lodash');
const reply = require('../lib/reply')();
const config = require('../lib/config');
const cli = require('../lib/cli');

exports.command = 'init <job_file>';
exports.desc = 'Initialize a job\n';
exports.builder = (yargs) => {
    cli().args('jobs', 'init', yargs);
    yargs
        .example('earl jobs init example.json');
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    config(cliConfig, 'jobs:init').returnConfigData();
    const jobs = _testFunctions || require('./lib')(cliConfig);

    return jobs.init()
        .catch(err => reply.fatal(err.message));
};
