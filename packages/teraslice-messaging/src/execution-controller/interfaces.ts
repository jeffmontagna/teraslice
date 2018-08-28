import { Slice, SliceAnalyticsData } from '@terascope/teraslice-types';

export interface ClientOptions {
    executionControllerUrl: string;
    workerId: string;
    socketOptions: SocketIOClient.ConnectOpts;
    networkLatencyBuffer?: number;
    actionTimeout: number;
}

export interface ServerOptions {
    port: number;
    controllerId: string;
    networkLatencyBuffer?: number;
    actionTimeout: number;
}

export interface Worker {
    worker_id: string;
}

export interface SliceResponseMessage {
    willProcess?: boolean;
}

export interface DispatchSliceResult {
    dispatched: boolean;
    workerId: string;
}

export interface WorkerEventFn {
    (workerId: string): void;
}

export interface WorkerErrorEventFn {
    (workerId: string, err?: Error): void;
}

export interface WorkerShutdownFn {
    (error?: null): void;
}

export interface SliceCompletePayload {
    slice: Slice;
    analytics: SliceAnalyticsData,
    isShuttingDown?: boolean;
    retry?: boolean;
    error?: string;
}
