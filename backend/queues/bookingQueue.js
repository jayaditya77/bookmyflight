const { Queue } = require('bullmq');
const createBullConnection = require('./redisConnection');

const bookingQueue = new Queue('booking-confirmations', {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

module.exports = bookingQueue;