import '../../formats'; // require to add the schema formats
import Core from './core';
import { WorkerContext } from '../../execution-context';
import {
    ExecutionConfig,
    OpConfig,
    WorkerOperationLifeCycle,
    OpAPI
} from '../../interfaces';

/**
 * A base class for supporting operations that run on a "Worker",
 * that supports the job execution lifecycle events.
 * This class will likely not be used externally
 * since Teraslice only supports a few types varients based on this class.
 * @see Core
 */

export default class OperationCore<T> extends Core implements WorkerOperationLifeCycle {
    protected readonly opConfig: Readonly<OpConfig & T>;

    constructor(context: WorkerContext, opConfig: OpConfig & T, executionConfig: ExecutionConfig) {
        const logger = context.apis.foundation.makeLogger({
            module: 'operation',
            opName: opConfig._op,
            jobName: executionConfig.name,
            jobId: executionConfig.job_id,
            exId: executionConfig.ex_id,
        });

        super(context, executionConfig, logger);

        this.opConfig = opConfig;
    }

    async initialize(): Promise<void> {
        this.context.logger.trace(`${this.executionConfig.name}->${this.opConfig._op} is initializing...`);
    }

    async shutdown(): Promise<void> {
        this.context.logger.trace(`${this.executionConfig.name}->${this.opConfig._op} is shutting down...`);
    }

    /**
     * Create an API and add it to the operation lifecycle
    */
    async createAPI(name: string, ...params: any[]): Promise<OpAPI> {
        return this.context.apis.executionContext.initAPI(name, ...params);
    }

    /**
     * Get a reference to an existing API
    */
    getAPI(name: string): OpAPI {
        return this.context.apis.executionContext.getAPI(name);
    }
}
