'use strict';

function initializeJob(context, job) {

    // TODO determine lifecyle functions for master
    var jobQueue = job.process.slice();
    var readerConfig = jobQueue.shift();
    var senderConfig = jobQueue.pop();

    var reader = require('../readers/' + readerConfig.op);
    var sender = require('../senders/' + senderConfig.op);
    var processors = jobQueue.map(function(job) {
        return require('../processors/' + job.op)
    });

    var queue = [];
    queue.push(reader.newReader(context, readerConfig));

    //using mutated jobQueue to provide opConfig
    processors.forEach(function(job, i) {
        queue.push(job.newProcessor(context, jobQueue[i]))
    });
    queue.push(sender.newSender(context, senderConfig));

    return {
        reader: reader,
        sender: sender,
        processors: processors,
        jobs: job.process,
        queue: queue,
        readerConfig: readerConfig
    };
}

module.exports = {
    initializeJob: initializeJob
};