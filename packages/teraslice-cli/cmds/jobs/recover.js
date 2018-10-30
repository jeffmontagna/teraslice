'use strict';
'use console';

const _ = require('lodash');
const reply = require('../lib/reply')();
const config = require('../lib/config');
const cli = require('../lib/cli');

exports.command = 'recover [cluster_sh] [job]';
exports.desc = 'Run recovery on cluster.\n';
exports.builder = (yargs) => {
    cli().args('job', 'resume', yargs);
    yargs
        .demandCommand(1)
        .option('cleanup', {
            describe: 'options are \'all\' or \'errors\'',
            default: ''
        })
        .option('ex_id', {
            describe: 'execution id to recover',
            default: ''
        })
        .example('earl jobs recover cluster1:ex:99999999-9999-9999-9999-999999999999')
        .example('earl jobs recover cluster1:ex:99999999-9999-9999-9999-999999999999 --yes');
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    config(cliConfig).returnConfigData();
    const job = _testFunctions || require('./lib')(cliConfig);

    return job.recover()
        .catch(err => reply.fatal(err.message));
};
