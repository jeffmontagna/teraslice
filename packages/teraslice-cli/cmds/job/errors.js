'use strict';


const _ = require('lodash');
const reply = require('../cmd_functions/reply');
const dataChecks = require('../cmd_functions/data_checks');

exports.command = 'errors <job_file>';
exports.desc = 'Shows the errors for a job\n';
exports.builder = (yargs) => {
    yargs.example('earl job errors jobfile.prod');
};

exports.handler = (argv, _testFunctions) => {
    const cliConfig = _.clone(argv);
    dataChecks(cliConfig).returnJobData();
    const tjmFunctions = _testFunctions || require('../cmd_functions/functions')(cliConfig);

    const jobId = cliConfig.job_file_content.tjm.job_id;

    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.terasliceClient.jobs.wrap(jobId).errors())
        .then((errors) => {
            if (errors.length === 0) {
                reply.green('This job has no errors');
            } else {
                errors.forEach((error) => {
                    reply.yellow(JSON.stringify(error, null, 4));
                });
            }
            return errors;
        })
        .catch(err => reply.fatal(err.message));
};
