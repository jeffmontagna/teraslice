'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const TestContext = require('../helpers/test-context');
const Scheduler = require('../../../lib/workers/execution-controller/scheduler');

describe('Scheduler', () => {
    let slicers;
    let countPerSlicer;
    let expectedCount;
    let testContext;
    let scheduler;

    function getSlices() {
        const slices = [];

        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (scheduler.isFinished) {
                    clearInterval(intervalId);
                    resolve(slices);
                } else {
                    const result = scheduler.getSlices(10);
                    if (result.length > 0) {
                        slices.push(...result);
                    }
                }
            }, 1);
        });
    }

    function registerSlicers() {
        const newSlicer = (id) => {
            const records = _.times(countPerSlicer, () => ({ id: _.uniqueId(`slicer-${id}-`) }));
            return async () => {
                await Promise.delay(0);
                return records.shift();
            };
        };

        return scheduler.registerSlicers(_.times(slicers, newSlicer));
    }

    beforeEach(async () => {
        slicers = 3;
        countPerSlicer = 200;
        expectedCount = slicers * countPerSlicer;

        testContext = new TestContext({
            assignment: 'execution_controller',
            slicers
        });

        await testContext.initialize();

        scheduler = new Scheduler(
            testContext.context,
            testContext.executionContext
        );

        scheduler.ensureSliceState = async (slice) => {
            await Promise.delay(0);
            return slice;
        };

        registerSlicers();

        testContext.attachCleanup(() => scheduler.cleanup());
    });

    afterEach(() => testContext.cleanup());

    it('should register the slicers', async () => {
        expect(scheduler.slicers).toBeArrayOfSize(slicers);
        expect(scheduler.slicersDone).toBeFalse();

        expect(scheduler.ready).toBeTrue();
        expect(scheduler.paused).toBeTrue();
        expect(scheduler.stopped).toBeFalse();
        expect(scheduler.queueLength).toEqual(0);
        expect(scheduler.isFinished).toBeFalse();
    });

    it(`should be able to schedule ${expectedCount} slices`, async () => {
        let slices = [];

        await Promise.all([
            scheduler.run(),
            getSlices().then((_slices) => { slices = _slices; }),
        ]);

        expect(scheduler.paused).toBeFalse();
        expect(scheduler.slicers).toBeArrayOfSize(slicers);
        expect(scheduler.slicersDone).toBeTrue();
        expect(scheduler.queueLength).toEqual(0);
        expect(slices).toBeArrayOfSize(expectedCount);
        expect(scheduler.isFinished).toBeTrue();
    });

    it('should handle pause and resume correctly', async () => {
        let slices = [];

        const pause = _.once(() => {
            scheduler.pause();
            _.delay(scheduler.start, 10);
        });

        const pauseAfter = _.after(Math.round(countPerSlicer / 3), pause);

        scheduler.events.on('slicer:done', pauseAfter);

        await Promise.all([
            scheduler.run(),
            getSlices().then((_slices) => { slices = _slices; }),
        ]);

        expect(slices).toBeArrayOfSize(expectedCount);
        expect(scheduler.isFinished).toBeTrue();
        expect(scheduler.slicersDone).toBeTrue();
    });

    it('should handle stop correctly', async () => {
        let slices = []; // eslint-disable-line

        const stop = _.once(scheduler.stop);

        expectedCount = Math.round(countPerSlicer / 3);
        const stopAfter = _.after(expectedCount, stop);

        scheduler.events.on('slicer:done', stopAfter);

        await Promise.all([
            scheduler.run(),
            getSlices().then((_slices) => { slices = _slices; }),
        ]);

        const min = expectedCount - slicers;
        const max = expectedCount + slicers;
        expect(slices.length).toBeWithin(min, max);

        expect(scheduler.isFinished).toBeTrue();
        expect(scheduler.stopped).toBeTrue();
        expect(scheduler.slicersDone).toBeFalse();
    });

    it('should handle recovery correctly', async () => {
        let slices = [];

        scheduler.recoverExecution = true;
        scheduler.recovering = true;

        const recover = _.once(() => {
            scheduler.markRecoveryAsComplete(false).then(() => {
                registerSlicers();
            });
        });

        const recoverAfter = _.after(expectedCount, recover);

        expectedCount *= 2;

        scheduler.events.on('slicer:done', recoverAfter);

        await Promise.all([
            scheduler.run(),
            getSlices().then((_slices) => { slices = _slices; }),
        ]);

        expect(slices).toBeArrayOfSize(expectedCount);
        expect(scheduler.ready).toBeTrue();
        expect(scheduler.isFinished).toBeTrue();
        expect(scheduler.stopped).toBeFalse();
        expect(scheduler.recovering).toBeFalse();
        expect(scheduler.slicersDone).toBeTrue();
    });

    it('should handle recovery with cleanup type correctly', async () => {
        let slices = [];

        scheduler.recoverExecution = true;
        scheduler.recovering = true;

        const recover = _.once(() => {
            scheduler.markRecoveryAsComplete(true);
        });

        const recoverAfter = _.after(expectedCount, recover);

        scheduler.events.on('slicer:done', recoverAfter);

        await Promise.all([
            scheduler.run(),
            getSlices().then((_slices) => { slices = _slices; }),
        ]);

        expect(slices).toBeArrayOfSize(expectedCount);
        expect(scheduler.ready).toBeFalse();
        expect(scheduler.isFinished).toBeTrue();
        expect(scheduler.stopped).toBeFalse();
        expect(scheduler.recovering).toBeFalse();
        expect(scheduler.slicersDone).toBeTrue();
    });
});
