import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './MyBookings.css';

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    API.get('/bookings/my').then(({ data }) => { setBookings(data); setLoading(false); }).catch(() => setLoading(false));
  }, [user, navigate]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(id);
    try {
      await API.put(`/bookings/${id}/cancel`);
      setBookings(bookings.map(b => b._id === id ? { ...b, bookingStatus: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusBadge = (s) => {
    if (s === 'confirmed') return 'badge-green';
    if (s === 'cancelled') return 'badge-red';
    return 'badge-gray';
  };

  if (loading) return <div className="loading">Loading your bookings...</div>;

  return (
    <div className="mybookings-page container">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>All your flight reservations in one place</p>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>No bookings yet.</p>
          <button className="btn btn-gold" style={{ marginTop: '14px' }} onClick={() => navigate('/flights')}>Browse Flights</button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map(b => (
            <div className="booking-card card" key={b._id}>
              <div className="booking-top">
                <div>
                  <span className="booking-ref"># {b.bookingReference}</span>
                  <span className={`badge ${statusBadge(b.bookingStatus)}`} style={{ marginLeft: '10px' }}>
                    {b.bookingStatus}
                  </span>
                </div>
                <span className="booking-date">{formatDate(b.createdAt)}</span>
              </div>

              <div className="booking-flight-info">
                <div className="bf-route">
                  <span className="bf-code">{b.flight?.originCode}</span>
                  <span className="bf-arrow">→</span>
                  <span className="bf-code">{b.flight?.destinationCode}</span>
                </div>
                <div className="bf-details">
                  <div><strong>{b.flight?.flightNumber}</strong> · {b.flight?.airline}</div>
                  <div>{formatDate(b.flight?.departureDate)} · {b.flight?.departureTime}</div>
                </div>
              </div>

              <div className="booking-meta">
                <div className="meta-item"><span>Seat</span><strong>{b.seatNumber} ({b.seatClass})</strong></div>
                <div className="meta-item"><span>Passenger</span><strong>{b.passengerName}</strong></div>
                <div className="meta-item"><span>Amount</span><strong>₹{b.amountPaid?.toLocaleString()}</strong></div>
                {b.bookingStatus === 'confirmed' && (
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: '12px', padding: '7px 16px' }}
                    onClick={() => handleCancel(b._id)}
                    disabled={cancelling === b._id}
                  >
                    {cancelling === b._id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
