const PDFDocument = require('pdfkit');

const generateTicketPdf = (booking, flight) => new Promise((resolve, reject) => {
  const ticket = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks = [];

  ticket.on('data', (chunk) => chunks.push(chunk));
  ticket.once('error', reject);
  ticket.once('end', () => resolve(Buffer.concat(chunks)));

  ticket
    .fillColor('#172b4d')
    .fontSize(22)
    .text('BookMyFlight e-ticket');
  ticket.moveDown(0.5);
  ticket.fillColor('#555555').fontSize(11).text(`Booking reference: ${booking.bookingReference}`);
  ticket.moveDown();
  ticket.fillColor('#172b4d').fontSize(15).text('Passenger');
  ticket.fillColor('#333333').fontSize(11)
    .text(`Name: ${booking.passengerName}`)
    .text(`Email: ${booking.passengerEmail}`)
    .text(`Seat: ${booking.seatNumber} (${booking.seatClass})`);
  ticket.moveDown();
  ticket.fillColor('#172b4d').fontSize(15).text('Flight');
  ticket.fillColor('#333333').fontSize(11)
    .text(`Flight: ${flight.flightNumber} - ${flight.airline}`)
    .text(`Route: ${flight.origin} (${flight.originCode}) to ${flight.destination} (${flight.destinationCode})`)
    .text(`Date: ${new Date(flight.departureDate).toLocaleDateString('en-IN')}`)
    .text(`Departure: ${flight.departureTime}`)
    .text(`Arrival: ${flight.arrivalTime}`)
    .text(`Amount paid: INR ${booking.amountPaid}`);

  ticket.end();
});

module.exports = generateTicketPdf;