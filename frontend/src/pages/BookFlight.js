import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './BookFlight.css';

export default function BookFlight() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flight, setFlight] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [passenger, setPassenger] = useState({
    passengerName: user?.name || '',
    passengerEmail: user?.email || '',
    passengerPhone: '',
    passengerAge: ''
  });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'admin') { navigate('/flights'); return; }
    API.get(`/flights/${id}`)
      .then(({ data }) => { setFlight(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, user, navigate]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSeat) return setError('Please select a seat first.');
    setBooking(true); setError('');
    try {
      const { data } = await API.post('/bookings', {
        flightId: id,
        seatNumber: selectedSeat.seatNumber,
        ...passenger
      });
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="loading">Loading flight details...</div>;
  if (!flight) return <div className="container" style={{ padding: '40px', textAlign: 'center', color: '#c62828' }}>Flight not found.</div>;

  // Group seats into rows of 6
  const rows = {};
  flight.seats.forEach(seat => {
    const row = seat.seatNumber.slice(0, -1);
    if (!rows[row]) rows[row] = [];
    rows[row].push(seat);
  });

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '500px', padding: '60px 20px' }}>
        <div className="card success-card">
          <div className="success-icon">✅</div>
          <h2>Booking Confirmed!</h2>
          <p className="booking-ref">Ref: <strong>{success.bookingReference}</strong></p>
          <div className="booking-detail-row"><span>Flight</span><span>{flight.flightNumber} — {flight.airline}</span></div>
          <div className="booking-detail-row"><span>Route</span><span>{flight.originCode} → {flight.destinationCode}</span></div>
          <div className="booking-detail-row"><span>Seat</span><span>{success.seatNumber} (Economy)</span></div>
          <div className="booking-detail-row"><span>Passenger</span><span>{success.passengerName}</span></div>
          <div className="booking-detail-row"><span>Amount Paid</span><span><strong>₹{success.amountPaid?.toLocaleString()}</strong></span></div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => navigate('/my-bookings')}>My Bookings</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/flights')}>Book Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="book-page container">
      <div className="page-header">
        <h1>Select Seat & Book</h1>
        <p>{flight.flightNumber} · {flight.origin} ({flight.originCode}) → {flight.destination} ({flight.destinationCode})</p>
      </div>

      <div className="book-layout">
        {/* Seat Map */}
        <div className="seat-section card">
          <h3 className="section-title">Choose Your Seat — Economy Class</h3>
          <div className="seat-legend">
            <div className="legend-item"><div className="seat-demo available"></div> Available</div>
            <div className="legend-item"><div className="seat-demo booked"></div> Booked</div>
            <div className="legend-item"><div className="seat-demo selected"></div> Selected</div>
          </div>

          <div className="seat-map">
            <div className="seat-cols-header">
              <span></span>
              <span>A</span><span>B</span><span>C</span>
              <span className="aisle"></span>
              <span>D</span><span>E</span><span>F</span>
            </div>
            {Object.entries(rows).map(([row, seats]) => (
              <div className="seat-row" key={row}>
                <span className="row-num">{row}</span>
                {['A','B','C'].map(col => {
                  const seat = seats.find(s => s.seatNumber.endsWith(col));
                  if (!seat) return <div className="seat-placeholder" key={col}></div>;
                  return (
                    <div
                      key={seat.seatNumber}
                      className={`seat economy ${seat.isBooked ? 'booked' : ''} ${selectedSeat?.seatNumber === seat.seatNumber ? 'selected' : ''}`}
                      onClick={() => !seat.isBooked && setSelectedSeat(seat)}
                      title={`Seat ${seat.seatNumber} · Economy · ₹${flight.priceEconomy?.toLocaleString()}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
                <span className="aisle"></span>
                {['D','E','F'].map(col => {
                  const seat = seats.find(s => s.seatNumber.endsWith(col));
                  if (!seat) return <div className="seat-placeholder" key={col}></div>;
                  return (
                    <div
                      key={seat.seatNumber}
                      className={`seat economy ${seat.isBooked ? 'booked' : ''} ${selectedSeat?.seatNumber === seat.seatNumber ? 'selected' : ''}`}
                      onClick={() => !seat.isBooked && setSelectedSeat(seat)}
                      title={`Seat ${seat.seatNumber} · Economy · ₹${flight.priceEconomy?.toLocaleString()}`}
                    >
                      {seat.seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {selectedSeat && (
            <div className="selected-seat-info">
              <strong>Selected:</strong> Seat {selectedSeat.seatNumber} · Economy · <strong>₹{flight.priceEconomy?.toLocaleString()}</strong>
              <button style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '12px' }} onClick={() => setSelectedSeat(null)}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* Passenger Info */}
        <div className="passenger-section card">
          <h3 className="section-title">Passenger Details</h3>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleBook}>
            <div className="form-group">
              <label>Full Name</label>
              <input value={passenger.passengerName} onChange={e => setPassenger({...passenger, passengerName: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={passenger.passengerEmail} onChange={e => setPassenger({...passenger, passengerEmail: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={passenger.passengerPhone} placeholder="+91 98765 43210"
                onChange={e => setPassenger({...passenger, passengerPhone: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input type="number" min="1" max="120" value={passenger.passengerAge}
                onChange={e => setPassenger({...passenger, passengerAge: e.target.value})} required />
            </div>

            <div className="booking-summary">
              <div className="summary-row"><span>Flight</span><span>{flight.flightNumber}</span></div>
              <div className="summary-row"><span>Route</span><span>{flight.originCode} → {flight.destinationCode}</span></div>
              <div className="summary-row"><span>Date</span><span>{new Date(flight.departureDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</span></div>
              <div className="summary-row"><span>Departure</span><span>{flight.departureTime}</span></div>
              <div className="summary-row"><span>Seat</span><span>{selectedSeat ? `${selectedSeat.seatNumber} (Economy)` : '—'}</span></div>
              <div className="summary-row total"><span>Total</span><span>{selectedSeat ? `₹${flight.priceEconomy?.toLocaleString()}` : '—'}</span></div>
            </div>

            <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={!selectedSeat || booking}>
              {booking ? 'Processing...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
