require('dotenv').config();
require('../models/Flight');

const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const Booking = require('../models/Booking');
const createBullConnection = require('../queues/redisConnection');
const generateTicketPdf = require('../utils/generateTicketPdf');
const { sendBookingEmail } = require('../utils/sendEmail');

const startWorker = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const worker = new Worker('booking-confirmations', async (job) => {
    const booking = await Booking.findById(job.data.bookingId).populate('flight');
    if (!booking || !booking.flight) {
      throw new Error(`Booking or flight not found for job ${job.id}`);
    }

    const ticketPdf = await generateTicketPdf(booking, booking.flight);
    await sendBookingEmail(booking.passengerEmail, booking, booking.flight, ticketPdf);
    return { bookingId: booking._id.toString() };
  }, {
    connection: createBullConnection(),
    concurrency: 5
  });

  worker.on('completed', (job) => {
    console.log(`Booking confirmation job ${job.id} completed.`);
  });
  worker.on('failed', (job, error) => {
    console.error(`Booking confirmation job ${job?.id} failed:`, error.message);
  });
  worker.on('error', (error) => {
    console.error('Booking worker error:', error.message);
  });

  await worker.waitUntilReady();
  console.log('Booking confirmation worker is ready.');

  const shutdown = async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

startWorker().catch((error) => {
  console.error('Booking worker failed to start:', error.message);
  process.exit(1);
});