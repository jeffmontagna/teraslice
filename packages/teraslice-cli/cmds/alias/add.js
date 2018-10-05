// update existing cluster
// create new

'use strict';
'use console';

const _ = require('lodash');
const reply = require('../lib/reply')();
const config = require('../lib/config');
const cli = require('../lib/cli');

exports.command = 'add';
exports.desc = 'Add an alias to the clusters defined in the config file.\n';
exports.builder = (yargs) => {
    cli().args('alias', 'list', yargs);
    yargs
        .demandCommand(1);
    yargs.example('earl alias add cluster1 -c http://cluster1.net:80');
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    config(cliConfig, 'alias:add').returnConfigData(false, false);
    const libAlias = _testFunctions || require('./lib')(cliConfig);

    return libAlias.add()
        .catch(err => reply.fatal(err.message));
};
