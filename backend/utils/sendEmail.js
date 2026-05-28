const { Resend } = require('resend');

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendBookingEmail = async (
  to,
  booking,
  flight
) => {

  try {

    const data = await resend.emails.send({

      from: 'onboarding@resend.dev',

      to,

      subject: 'Booking Confirmation ✈',

      html: `

        <h2>
          Booking Confirmed ✈
        </h2>

        <p>
          Passenger:
          ${booking.passengerName}
        </p>

        <p>
          Flight:
          ${flight.flightNumber}
        </p>

        <p>
          Seat:
          ${booking.seatNumber}
        </p>

        <p>
          Amount Paid:
          ₹${booking.amountPaid}
        </p>

      `
    });

    console.log("EMAIL SENT:", data);

  } catch (error) {

    console.log("EMAIL ERROR:", error);

  }

};

module.exports = sendBookingEmail;