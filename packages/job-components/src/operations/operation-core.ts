import { Context, JobConfig, Logger, OpConfig } from '@terascope/teraslice-types';
import _ from 'lodash';
import { DataEntity } from './data-entity';

/**
 * Operation Core Base Class [DRAFT]
 * @description The core base class common functionality between
 *              all of the different types of operations.
 */

export class OperationCore {
    public static async validate(input: any): Promise<object> {
        return input;
    }

    protected readonly context: Context;
    protected readonly jobConfig: JobConfig;
    protected readonly opConfig: OpConfig;
    protected readonly logger: Logger;

    constructor(context: Context, jobConfig: JobConfig, opConfig: OpConfig, logger: Logger) {
        this.context = context;
        this.jobConfig = jobConfig;
        this.opConfig = opConfig;
        this.logger = logger;
    }

    public async initialize(): Promise<void> {
        this.context.logger.debug(`${this.jobConfig.name}->${this.opConfig._op} is initialzing...`);
        return;
    }

    public async shutdown(): Promise<void> {
        this.context.logger.debug(`${this.jobConfig.name}->${this.opConfig._op} is shutting down...`);
        return;
    }

    public async onSliceInitialized(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice initialized: ${sliceId}`);
    }

    public async onSliceStarted(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice started: ${sliceId}`);
    }

    public async onSliceFinalizing(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice finalizing: ${sliceId}`);
    }

    public async onSliceFinished(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice finished: ${sliceId}`);
    }

    public async onSliceFailed(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice failed: ${sliceId}`);
    }

    public async onSliceRetry(sliceId: string): Promise<void> {
        this.context.logger.debug(`slice retry: ${sliceId}`);
    }

    public convertDataToDataEntity(data: object): DataEntity {
        return new DataEntity(data);
    }

    public convertBatchToDataEntity(batch: object[]): DataEntity[] {
        return _.map(batch, this.convertDataToDataEntity);
    }
}
