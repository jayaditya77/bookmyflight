const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({

  service: 'gmail',

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }

});

const sendBookingEmail = async (
  to,
  booking,
  flight
) => {

  await transporter.sendMail({

    from: process.env.EMAIL_USER,

    to,

    subject: 'BookMyFlight Booking Confirmation',

    html: `

      <div style="font-family: Arial; padding: 20px;">

        <h2>
          Booking Confirmed ✈
        </h2>

        <p>
          Your flight has been booked successfully.
        </p>

        <hr />

        <p>
          <strong>Booking Reference:</strong>
          ${booking.bookingReference}
        </p>

        <p>
          <strong>Passenger:</strong>
          ${booking.passengerName}
        </p>

        <p>
          <strong>Flight:</strong>
          ${flight.flightNumber}
        </p>

        <p>
          <strong>Route:</strong>
          ${flight.originCode}
          →
          ${flight.destinationCode}
        </p>

        <p>
          <strong>Seat:</strong>
          ${booking.seatNumber}
        </p>

        <p>
          <strong>Amount Paid:</strong>
          ₹${booking.amountPaid}
        </p>

        <hr />

        <p>
          Thank you for choosing
          BookMyFlight.
        </p>

      </div>

    `
  });

};

module.exports = sendBookingEmail;