'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

module.exports = (context, shutdownFn) => {
    const assignment = process.env.NODE_TYPE || process.env.assignment || 'unknown-assignment';
    const isProcessRestart = process.env.process_restart;
    const restartOnFailure = assignment !== 'exectution_controller';
    const api = {
        exiting: false,
        exit
    };

    const shutdownTimeout = _.get(context, 'sysconfig.teraslice.shutdown_timeout', 20 * 1000);
    const events = context.apis.foundation.getSystemEvents();
    const logger = context.apis.foundation.makeLogger({ module: 'shutdown_handler' });

    if (assignment === 'execution_controller' && isProcessRestart) {
        logger.fatal('Execution Controller runtime error led to a restart, terminating execution with failed status, please use the recover api to return slicer to a consistent state');
        process.exit(0);
    }

    function flushLogs() {
        return Promise.resolve()
            .then(() => this.logger.flush())
            .then(() => Promise.delay(1000));
    }

    function exit(event, err) {
        api.exiting = true;
        logger.warn(`${assignment} exiting in ${shutdownTimeout}ms...`);

        const startTime = Date.now();
        Promise.race([
            shutdownFn(event, err),
            Promise.delay(shutdownTimeout - 2000)
        ]).then(() => {
            logger.debug(`${assignment} shutdown took ${Date.now() - startTime}ms`);
        }).catch((error) => {
            logger.error(`${assignment} while shutting down`, error);
        }).then((code) => {
            logger.trace(`flushing log and exiting with code ${code}`);
            return flushLogs()
                .finally(() => {
                    process.exit();
                });
        });
    }

    process.on('SIGINT', () => {
        logger.warn('Received process:SIGINT');
        process.exitCode = 0;
        exit('SIGINT');
    });

    process.on('SIGTERM', () => {
        logger.warn(`${assignment} received process:SIGTERM`);
        process.exitCode = 0;
        exit('SIGTERM');
    });

    process.on('uncaughtException', (err) => {
        logger.fatal(`${assignment} received an uncaughtException`, err);
        process.exitCode = restartOnFailure ? 1 : 0;
        exit('uncaughtException', err);
    });

    process.on('unhandledRejection', (err) => {
        logger.fatal(`${assignment} received an unhandledRejection`, err);
        process.exitCode = restartOnFailure ? 1 : 0;
        exit('unhandledRejection', err);
    });

    // event is fired from terafoundation when an error occurs during instantiation of a client
    events.on('client:initialization:error', (err) => {
        logger.fatal(`${assignment} received a client initialization error`, err);
        process.exitCode = restartOnFailure ? 1 : 0;
        exit('client:initialization:error', err);
    });

    events.once('worker:shutdown:complete', (err) => {
        process.exitCode = 0;
        if (err) {
            logger.fatal(`${assignment} shutdown error`, err);
        } else {
            logger.warn(`${assignment} shutdown`);
        }
        exit('worker:shutdown:complete', err);
    });

    return api;
};
