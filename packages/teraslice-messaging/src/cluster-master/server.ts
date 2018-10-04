import _ from 'lodash';
import * as i from './interfaces';
import * as core from '../messenger';

export class Server extends core.Server {
    private clusterAnalytics: i.ClusterAnalytics;

    constructor(opts: i.ServerOptions) {
        const {
            port,
            actionTimeout,
            networkLatencyBuffer,
            nodeDisconnectTimeout,
            requestListener,
            serverTimeout,
            pingInterval,
            pingTimeout,
        } = opts;

        if (!_.isNumber(nodeDisconnectTimeout)) {
            throw new Error('ClusterMaster.Server requires a valid nodeDisconnectTimeout');
        }

        super({
            port,
            actionTimeout,
            pingInterval,
            pingTimeout,
            networkLatencyBuffer,
            clientDisconnectTimeout: nodeDisconnectTimeout,
            requestListener,
            serverTimeout,
            serverName: 'ClusterMaster',
        });

        this.clusterAnalytics = {
            controllers: {
                processed: 0,
                failed: 0,
                queued: 0,
                job_duration: 0,
                workers_joined: 0,
                workers_disconnected: 0,
                workers_reconnected: 0
            }
        };

    }

    async start() {
        this.on('connection', (msg) => {
            this.onConnection(msg.scope, msg.payload as SocketIO.Socket);
        });

        await this.listen();
    }

    sendExecutionPause(exId: string) {
        return this.send(exId, 'execution:pause');
    }

    sendExecutionResume(exId: string) {
        return this.send(exId, 'execution:resume');
    }

    sendExecutionAnalyticsRequest(exId: string) {
        return this.send(exId, 'execution:analytics');
    }

    getClusterAnalytics() {
        return _.cloneDeep(this.clusterAnalytics);
    }

    onExecutionFinished(fn: (clientId: string, error?: core.ResponseError) => {}) {
        this.on('execution:finished', (msg) => {
            fn(msg.scope, msg.error);
        });
    }

    private onConnection(exId: string, socket: SocketIO.Socket) {
        socket.on('execution:finished', this.handleResponse('execution:finished', (msg: core.Message) => {
            this.emit('execution:finished', {
                scope: exId,
                payload: {},
                error: msg.payload.error
            });
        }));

        socket.on('cluster:analytics', this.handleResponse('cluster:analytics', (msg: core.Message) => {
            const data = msg.payload as i.ExecutionAnalyticsMessage;
            if (!this.clusterAnalytics[data.kind]) {
                return;
            }

            _.forOwn(data.stats, (value, field) => {
                if (this.clusterAnalytics[data.kind][field] != null) {
                    this.clusterAnalytics[data.kind][field] += value;
                }
            });

            this.emit('cluster:analytics', {
                scope: exId,
                payload: {
                    diff: data.stats,
                    current: this.clusterAnalytics[data.kind],
                }
            });

            return {
                recorded: true
            };
        }));
    }
}
