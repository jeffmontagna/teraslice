import _ from 'lodash';
import '../../formats'; // require to add the schema formats
import Core from './core';
import { OpAPI } from './api-core';
import SliceEvents from './slice-events';
import { Context, ExecutionConfig, OpConfig } from '../../interfaces';

/**
 * A base class for supporting operations that run on a "Worker",
 * that supports the job execution lifecycle events.
 * This class will likely not be used externally
 * since Teraslice only supports a few types varients based on this class.
 * @see Core
 */

export default class OperationCore extends Core implements SliceEvents {
    protected readonly opConfig: Readonly<OpConfig>;

    constructor(context: Context, opConfig: OpConfig, executionConfig: ExecutionConfig) {
        const logger = context.apis.foundation.makeLogger({
            module: 'operation',
            opName: opConfig._op,
            jobName: executionConfig.name,
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

    async onSliceInitialized(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice initialized: ${sliceId}`);
    }

    async onSliceStarted(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice started: ${sliceId}`);
    }

    async onSliceFinalizing(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice finalizing: ${sliceId}`);
    }

    async onSliceFinished(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice finished: ${sliceId}`);
    }

    async onSliceFailed(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice failed: ${sliceId}`);
    }

    async onSliceRetry(sliceId: string): Promise<void> {
        this.context.logger.trace(`slice retry: ${sliceId}`);
    }
}
