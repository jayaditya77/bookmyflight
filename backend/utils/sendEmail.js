const { Resend } = require('resend');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const { SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_USER && SMTP_PASS) {
    const nodemailer = require('nodemailer');
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE.toLowerCase() === 'true'
        : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    return transporter.sendMail({
      from: process.env.EMAIL_FROM || `BookMyFlight <${SMTP_USER}>`,
      to,
      subject,
      html,
      attachments
    });
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('Configure SMTP_USER and SMTP_PASS, or provide RESEND_API_KEY.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'BookMyFlight <onboarding@resend.dev>';
  const resendAttachments = attachments.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content.toString('base64')
  }));
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    ...(resendAttachments.length ? { attachments: resendAttachments } : {})
  });
  if (error) throw new Error(`Resend error (${error.statusCode ?? 'unknown'}): ${error.message}`);
  return data;
};

const sendBookingEmail = async (
  to,
  booking,
  flight,
  ticketPdf
) => {

  return sendEmail({
    to,
    subject: 'Booking Confirmation ✈',
    html: `
      <h2>Booking Confirmed ✈</h2>
      <p>Passenger: ${escapeHtml(booking.passengerName)}</p>
      <p>Flight: ${escapeHtml(flight.flightNumber)}</p>
      <p>Seat: ${escapeHtml(booking.seatNumber)}</p>
      <p>Amount Paid: ₹${escapeHtml(booking.amountPaid)}</p>
      <p>Your e-ticket is attached to this email.</p>
    `,
    attachments: ticketPdf ? [{
      filename: `ticket-${booking.bookingReference}.pdf`,
      content: ticketPdf
    }] : []
  });
};

const sendVerificationEmail = (to, url) => sendEmail({
  to,
  subject: 'Verify your BookMyFlight email address',
  html: `
    <h2>Verify your email address</h2>
    <p>Thanks for creating a BookMyFlight account. Verify your email to sign in and book flights.</p>
    <p><a href="${escapeHtml(url)}">Verify email address</a></p>
    <p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
  `
});

const sendPasswordResetEmail = (to, url) => sendEmail({
  to,
  subject: 'Reset your BookMyFlight password',
  html: `
    <h2>Reset your password</h2>
    <p>We received a request to reset your BookMyFlight password.</p>
    <p><a href="${escapeHtml(url)}">Choose a new password</a></p>
    <p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>
  `
});

module.exports = { sendBookingEmail, sendVerificationEmail, sendPasswordResetEmail };
