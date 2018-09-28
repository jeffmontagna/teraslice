'use strict';

const _ = require('lodash');
const reply = require('../cmd_functions/reply');
const dataChecks = require('../cmd_functions/data_checks');

exports.command = 'register [job_file]';
exports.desc = 'Registers job with a cluster.  Specify the cluster with -c.\nAdds metadata to job file on completion\n';
exports.builder = (yargs) => {
    yargs
        .option('c', {
            describe: 'cluster where the job will be registered',
            default: 'http://localhost:5678'
        })
        .option('r', {
            describe: 'option to run the job immediately after being registered',
            default: false,
            type: 'boolean'
        })
        .option('a', {
            describe: 'builds the assets and deploys to cluster, optional',
            default: false,
            type: 'boolean'
        })
        .example('earl job register jobfile.prod -c clusterDomain -a');
};
exports.handler = (argv, _testTjmFunctions) => {
    const cliConfig = _.clone(argv);
    dataChecks(cliConfig).returnJobData(true);
    const tjmFunctions = _testTjmFunctions || require('../cmd_functions/functions')(cliConfig);
    const jobContents = cliConfig.job_file_content;
    const jobFilePath = cliConfig.job_file_path;

    return tjmFunctions.loadAsset()
        .then(() => tjmFunctions.terasliceClient.jobs.submit(jobContents, !cliConfig.r))
        .then((result) => {
            const jobId = result.id();
            reply.green(`Successfully registered job: ${jobId} on ${cliConfig.cluster}`);
            _.set(jobContents, 'tjm.cluster', cliConfig.cluster);
            _.set(jobContents, 'tjm.version', '0.0.1');
            _.set(jobContents, 'tjm.job_id', jobId);
            tjmFunctions.createJsonFile(jobFilePath, jobContents);
            reply.green('Updated job file with tjm data');
        })
        .then(() => {
            if (cliConfig.r) {
                reply.green(`New job started on ${cliConfig.cluster}`);
            }
        })
        .catch(err => reply.fatal(err));
};
