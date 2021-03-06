'use strict';
'use console';

const _ = require('lodash');
const reply = require('../lib/reply')();
const config = require('../lib/config');
const cli = require('../lib/cli');

exports.command = 'find <cluster_sh> [job]';
exports.desc = 'Find a job across clusters\n';
exports.builder = (yargs) => {
    cli().args('job', 'find', yargs);
    yargs
        .demandCommand(1)
        .example('earl jobs find cluster1');
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    config(cliConfig, 'jobs:find').returnConfigData();
    const job = _testFunctions || require('./lib')(cliConfig);

    return job.view()
        .catch(err => reply.fatal(err.message));
};
