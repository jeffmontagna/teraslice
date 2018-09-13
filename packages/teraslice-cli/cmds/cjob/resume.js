'use strict';
'use console';

const _ = require('lodash');
const reply = require('../lib/reply')();
const config = require('../lib/config');
const cli = require('../lib/cli');

exports.command = 'resume';
exports.desc = 'Resume all running and failing job on cluster.\n';
exports.builder = (yargs) => {
    cli().args('jobs', 'resume', yargs);
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    config(cliConfig).returnConfigData();
    const job = _testFunctions || require('./lib')(cliConfig);

    return job.resume()
        .catch(err => reply.fatal(err.message));
};
