import 'jest-extended'; // require for type definitions
import {
    ParallelSlicer,
    SlicerFn,
    newTestExecutionConfig,
    TestContext,
    SlicerContext
} from '../../src';

describe('ParallelSlicer', () => {
    class ExampleParallelSlicer extends ParallelSlicer {
        subslice = false;
        newSlicerCalled = 0;
        public async newSlicer(): Promise<SlicerFn> {
            this.newSlicerCalled += 1;
            let called = 0;

            if (this.newSlicerCalled === 1) {
                return async () => {
                    called += 1;
                    if (called < 3) {
                        return this.subslice ? [{ hi: true }] : { hi: true };
                    }
                    return null;
                };
            }

            return async () => {
                called += 1;
                if (called < 3) {
                    return this.subslice ? [{ hello: true }] : { hello: true };
                }
                return null;
            };
        }
    }

    describe('when returning a single-slice', () => {
        let slicer: ExampleParallelSlicer;

        beforeAll(async () => {
            const context = new TestContext('teraslice-operations');
            const exConfig = newTestExecutionConfig();

            exConfig.operations.push({
                _op: 'example-op',
            });

            exConfig.slicers = 2;

            const opConfig = exConfig.operations[0];

            slicer = new ExampleParallelSlicer(context as SlicerContext, opConfig, exConfig);
            await slicer.initialize([]);
        });

        afterAll(() => {
            return slicer.shutdown();
        });

        describe('->handle', () => {
            describe('on the first call', () => {
                it('should resolve false and enqueue 2 slices', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeFalse();

                    const slice1 = slicer.getSlice();

                    if (!slice1) {
                        expect(slice1).toBeNil();
                    } else if (slice1.slicer_id === 0) {
                        expect(slice1).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice1).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    const slice2 = slicer.getSlice();

                    if (!slice2) {
                        expect(slice2).toBeNil();
                    } else if (slice2.slicer_id === 0) {
                        expect(slice2).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice2).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    expect(slicer.getSlice()).toBeNil();
                });
            });

            describe('on the second call', () => {
                it('should resolve false and enqueue 2 slices', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeFalse();

                    const slice1 = slicer.getSlice();

                    if (!slice1) {
                        expect(slice1).toBeNil();
                    } else if (slice1.slicer_id === 0) {
                        expect(slice1).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice1).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    const slice2 = slicer.getSlice();

                    if (!slice2) {
                        expect(slice2).toBeNil();
                    } else if (slice2.slicer_id === 0) {
                        expect(slice2).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice2).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    expect(slicer.getSlice()).toBeNil();
                });
            });

            describe('on the third call', () => {
                it('should resolve true and enqueue no slice', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeTrue();

                    expect(slicer.getSlice()).toBeNil();
                });
            });

            describe('on the fourth call', () => {
                it('should resolve true and enqueue no slice', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeTrue();

                    expect(slicer.getSlice()).toBeNil();
                });
            });
        });
    });

    describe('when returning a sub-slices', () => {
        let slicer: ExampleParallelSlicer;
        const onSlicerSubslice = jest.fn();

        beforeAll(async () => {
            const context = new TestContext('teraslice-operations');
            const events = context.apis.foundation.getSystemEvents();

            events.on('slicer:subslice', onSlicerSubslice);

            const exConfig = newTestExecutionConfig();

            exConfig.operations.push({
                _op: 'example-op',
            });

            exConfig.slicers = 2;

            const opConfig = exConfig.operations[0];

            slicer = new ExampleParallelSlicer(context as SlicerContext, opConfig, exConfig);
            slicer.subslice = true;

            await slicer.initialize([]);
        });

        afterAll(() => {
            return slicer.shutdown();
        });

        describe('->handle', () => {
            it('should not emit slicer:subslice yet', () => {
                expect(onSlicerSubslice).not.toHaveBeenCalled();
            });

            describe('on the first call', () => {
                it('should resolve false and enqueue 2 slices', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeFalse();

                    const slice1 = slicer.getSlice();

                    if (!slice1) {
                        expect(slice1).toBeNil();
                    } else if (slice1.slicer_id === 0) {
                        expect(slice1).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice1).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    const slice2 = slicer.getSlice();

                    if (!slice2) {
                        expect(slice2).toBeNil();
                    } else if (slice2.slicer_id === 0) {
                        expect(slice2).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice2).toMatchObject({
                            slicer_order: 1,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    expect(onSlicerSubslice).toHaveBeenCalledTimes(2);
                    expect(slicer.getSlice()).toBeNil();
                });
            });

            describe('on the second call', () => {
                it('should resolve false and enqueue 2 slices', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeFalse();

                    const slice1 = slicer.getSlice();

                    if (!slice1) {
                        expect(slice1).toBeNil();
                    } else if (slice1.slicer_id === 0) {
                        expect(slice1).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice1).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    const slice2 = slicer.getSlice();

                    if (!slice2) {
                        expect(slice2).toBeNil();
                    } else if (slice2.slicer_id === 0) {
                        expect(slice2).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 0,
                            request: {
                                hi: true,
                            }
                        });
                    } else {
                        expect(slice2).toMatchObject({
                            slicer_order: 2,
                            slicer_id: 1,
                            request: {
                                hello: true,
                            }
                        });
                    }

                    expect(onSlicerSubslice).toHaveBeenCalledTimes(4);
                    expect(slicer.getSlice()).toBeNil();
                });
            });

            describe('on the third call', () => {
                it('should resolve true and enqueue no slice', async () => {
                    const done = await slicer.handle();
                    expect(done).toBeTrue();

                    expect(onSlicerSubslice).toHaveBeenCalledTimes(4);
                    expect(slicer.getSlice()).toBeNil();
                });
            });

        });
    });
});