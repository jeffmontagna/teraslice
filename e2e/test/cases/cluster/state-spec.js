'use strict';

const _ = require('lodash');
const misc = require('../../misc');
const wait = require('../../wait');
const { resetState } = require('../../helpers');

const { waitForJobStatus, scaleWorkersAndWait } = wait;

describe('cluster state', () => {
    beforeAll(() => resetState());

    const teraslice = misc.teraslice();

    function findWorkers(nodes, type, jobId) {
        return _.filter(nodes, (worker) => {
            if (jobId) {
                if (type) {
                    return worker.assignment === type && worker.job_id === jobId;
                }

                return worker.job_id === jobId;
            }

            return worker.assignment === type;
        });
    }

    function checkState(state, type, jobId) {
        return _.flatten(_.map(state, node => findWorkers(node.active, type, jobId))).length;
    }

    function verifyClusterMaster(state) {
        // verify that the cluster master worker exists within the state
        const nodes = _.filter(state, (node) => {
            const cms = findWorkers(node.active, 'cluster_master');
            return cms.length > 0;
        });

        expect(nodes).toBeArrayOfSize(1);

        // verify that the cluster master has the cluster master worker
        const activeWorkers = nodes[0].active;
        expect(activeWorkers.length).toBeGreaterThanOrEqual(1);
        const cmWorkers = findWorkers(activeWorkers, 'cluster_master');
        expect(cmWorkers).toBeArrayOfSize(1);
        expect(cmWorkers[0].assignment).toEqual('cluster_master');

        // verify that the cluster master has the assets service worker
        const amWorkers = findWorkers(activeWorkers, 'assets_service');
        expect(amWorkers).toBeArrayOfSize(1);
        expect(amWorkers[0].assignment).toEqual('assets_service');
    }

    function verifyClusterState(state, workersAdded = 0) {
        expect(_.values(state)).toBeArrayOfSize(misc.DEFAULT_NODES + workersAdded);

        // verify each node
        _.forEach(state, (node) => {
            expect(node.total).toBe(misc.WORKERS_PER_NODE);
            expect(node.node_id).toBeDefined();
            expect(node.hostname).toBeDefined();

            expect(node.available).toBeWithin(0, misc.WORKERS_PER_NODE + 1);

            const expectActiveLength = node.total - node.available;
            expect(node.active).toBeArrayOfSize(expectActiveLength);
        });

        // verify cluster master
        verifyClusterMaster(state);
    }

    it('should match default configuration', (done) => {
        teraslice.cluster.state()
            .then((state) => {
                verifyClusterState(state);
            })
            .catch(fail)
            .finally(() => { done(); });
    });

    it('should update after adding and removing a worker node', (done) => {
        // Add a second worker node
        scaleWorkersAndWait(1)
            .then((state) => {
                verifyClusterState(state, 1);
            })
            .then(() => scaleWorkersAndWait())
            .then((state) => {
                verifyClusterState(state);
            })
            .catch(fail)
            .finally(() => { done(); });
    });

    it('should update after adding and removing 3 worker nodes', (done) => {
        // Add additional worker nodes. There's one already and we want 13 more.
        scaleWorkersAndWait(3)
            .then((state) => {
                verifyClusterState(state, 3);
            })
            .then(() => scaleWorkersAndWait())
            .then((state) => {
                verifyClusterState(state);
            })
            .catch(fail)
            .finally(() => { done(); });
    });

    it('should be correct for running job with 1 worker', (done) => {
        const jobSpec = misc.newJob('reindex');
        jobSpec.name = 'cluster state with 1 worker';
        jobSpec.operations[0].index = 'example-logs-1000';
        jobSpec.operations[0].size = 100;
        jobSpec.operations[1].index = 'test-clusterstate-job-1-1000';
        let jobId;

        teraslice.jobs.submit(jobSpec)
            .then((job) => {
                jobId = job.id();
                // The job may run for a while so we have to wait for it to finish.
                return waitForJobStatus(job, 'running')
                    .then(() => teraslice.cluster.state())
                    .then((state) => {
                        const nodes = _.keys(state);
                        nodes.forEach((node) => {
                            expect(state[node].total).toBe(misc.WORKERS_PER_NODE);

                            expect(state[node].available).toBeWithin(0, misc.WORKERS_PER_NODE + 1);

                            // The node with more than one worker should have the actual worker
                            // and there should only be one.
                            if (state[node].active.length > 2) {
                                expect(findWorkers(state[node].active, 'worker', jobId).length).toBe(1);
                            }
                            expect(checkState(state, null, jobId)).toBe(2);
                        });
                    })
                    .then(() => waitForJobStatus(job, 'completed'));
            })
            .then(() => misc.indexStats('test-clusterstate-job-1-1000')
                .then((stats) => {
                    expect(stats.count).toBe(1000);
                }))
            .catch((err) => {
                fail(err);
            })
            .finally(() => { done(); });
    });

    it('should be correct for running job with 4 workers', (done) => {
        const jobSpec = misc.newJob('reindex');
        jobSpec.name = 'cluster state with 2 workers';
        jobSpec.workers = 4;
        jobSpec.operations[0].index = 'example-logs-1000';
        jobSpec.operations[0].size = 20;
        jobSpec.operations[1].index = 'test-clusterstate-job-4-1000';
        let jobId;

        teraslice.jobs.submit(jobSpec)
            .then((job) => {
                // The job may run for a while so we have to wait for it to finish.
                jobId = job.id();

                return waitForJobStatus(job, 'running')
                    .then(() => teraslice.cluster.state())
                    .then((state) => {
                        const nodes = _.keys(state);
                        nodes.forEach((node) => {
                            expect(state[node].total).toBe(misc.WORKERS_PER_NODE);

                            expect(state[node].available).toBeWithin(0, misc.WORKERS_PER_NODE + 1);

                            // Both nodes should have at least one worker.
                            expect(findWorkers(state[node].active, 'worker', jobId).length).toBeGreaterThan(0);

                            expect(checkState(state, null, jobId)).toBe(5);
                        });
                    })
                    .then(() => waitForJobStatus(job, 'completed'));
            })
            .then(() => misc.indexStats('test-clusterstate-job-4-1000')
                .then((stats) => {
                    expect(stats.count).toBe(1000);
                    expect(stats.deleted).toBe(0);
                }))
            .catch(fail)
            .finally(() => { done(); });
    });
});
