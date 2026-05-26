import React, { useEffect, useState } from 'react';
import API from '../utils/api';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/bookings').then(({ data }) => { setBookings(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusBadge = (s) => {
    if (s === 'confirmed') return 'badge-green';
    if (s === 'cancelled') return 'badge-red';
    return 'badge-gray';
  };

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>All Bookings</h2>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>{bookings.length} booking(s) total</p>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Passenger</th>
                <th>Flight</th>
                <th>Route</th>
                <th>Seat</th>
                <th>Amount</th>
                <th>Booked On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--gold-dark)' }}>{b.bookingReference}</td>
                  <td>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{b.passengerName}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{b.user?.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{b.flight?.flightNumber}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{b.flight?.airline}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{b.flight?.originCode} → {b.flight?.destinationCode}</td>
                  <td style={{ fontSize: '12px' }}>{b.seatNumber} <span style={{ color: '#aaa' }}>({b.seatClass})</span></td>
                  <td style={{ fontWeight: 'bold', fontSize: '12px' }}>₹{b.amountPaid?.toLocaleString()}</td>
                  <td style={{ fontSize: '11px', color: '#888' }}>{formatDate(b.createdAt)}</td>
                  <td><span className={`badge ${statusBadge(b.bookingStatus)}`}>{b.bookingStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
