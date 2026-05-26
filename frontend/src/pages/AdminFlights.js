```js
import React, { useEffect, useState } from 'react';
import API from '../utils/api';

const emptyForm = {
  flightNumber: '',
  airline: '',
  origin: '',
  originCode: '',
  destination: '',
  destinationCode: '',
  departureDate: '',
  departureTime: '',
  arrivalTime: '',
  duration: '',
  aircraft: 'Boeing 737',
  totalSeats: 120,
  priceEconomy: '',
  status: 'scheduled'
};

export default function AdminFlights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFlights = () => {
    API.get('/admin/flights')
      .then(({ data }) => {
        setFlights(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editing) {
        await API.put(`/flights/${editing}`, form);
        setSuccess('Flight updated successfully.');
      } else {
        await API.post('/flights', form);
        setSuccess('Flight added successfully.');
      }

      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);

      fetchFlights();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (flight) => {
    setForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      origin: flight.origin,
      originCode: flight.originCode,
      destination: flight.destination,
      destinationCode: flight.destinationCode,
      departureDate: flight.departureDate?.split('T')[0],
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      aircraft: flight.aircraft || 'Boeing 737',
      totalSeats: flight.totalSeats,
      priceEconomy: flight.priceEconomy,
      status: flight.status
    });

    setEditing(flight._id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flight? This cannot be undone.')) return;

    try {
      await API.delete(`/flights/${id}`);
      setSuccess('Flight deleted.');
      fetchFlights();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const f = (key, val) => {
    setForm({ ...form, [key]: val });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Manage Flights
          </h2>

          <p
            style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '3px'
            }}
          >
            {flights.length} flight(s) in system
          </p>
        </div>

        <button
          className="btn btn-gold"
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm(emptyForm);
            setError('');
            setSuccess('');
          }}
        >
          {showForm ? '✕ Close' : '+ Add Flight'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '18px',
              paddingBottom: '10px',
              borderBottom: '1px solid var(--border)'
            }}
          >
            {editing ? 'Edit Flight' : 'Add New Flight'}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Flight Number</label>

                <input
                  placeholder="e.g. AI101"
                  value={form.flightNumber}
                  onChange={(e) => f('flightNumber', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Airline Name</label>

                <input
                  placeholder="e.g. Air India"
                  value={form.airline}
                  onChange={(e) => f('airline', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Origin City</label>

                <input
                  placeholder="e.g. New Delhi"
                  value={form.origin}
                  onChange={(e) => f('origin', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Origin IATA Code</label>

                <input
                  placeholder="e.g. DEL"
                  value={form.originCode}
                  maxLength={4}
                  onChange={(e) =>
                    f('originCode', e.target.value.toUpperCase())
                  }
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Destination City</label>

                <input
                  placeholder="e.g. Mumbai"
                  value={form.destination}
                  onChange={(e) => f('destination', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Destination IATA Code</label>

                <input
                  placeholder="e.g. BOM"
                  value={form.destinationCode}
                  maxLength={4}
                  onChange={(e) =>
                    f('destinationCode', e.target.value.toUpperCase())
                  }
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Departure Date</label>

                <input
                  type="date"
                  value={form.departureDate}
                  onChange={(e) => f('departureDate', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Aircraft Type</label>

                <input
                  placeholder="e.g. Boeing 737"
                  value={form.aircraft}
                  onChange={(e) => f('aircraft', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Departure Time</label>

                <input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => f('departureTime', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Arrival Time</label>

                <input
                  type="time"
                  value={form.arrivalTime}
                  onChange={(e) => f('arrivalTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Duration (e.g. 2h 15m)</label>

                <input
                  placeholder="2h 15m"
                  value={form.duration}
                  onChange={(e) => f('duration', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Total Seats</label>

                <input
                  type="number"
                  min="10"
                  max="500"
                  value={form.totalSeats}
                  onChange={(e) => f('totalSeats', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Price per Seat (₹) — Economy</label>

                <input
                  type="number"
                  min="100"
                  placeholder="e.g. 4500"
                  value={form.priceEconomy}
                  onChange={(e) =>
                    f('priceEconomy', e.target.value)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>

                <select
                  value={form.status}
                  onChange={(e) => f('status', e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="btn btn-gold"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editing
                  ? 'Update Flight'
                  : 'Add Flight'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : flights.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✈</div>
          <p>No flights added yet. Add the first one!</p>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th>Flight</th>
                <th>Route</th>
                <th>Date & Time</th>
                <th>Seats</th>
                <th>Price (Economy)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {flights.map((flight) => (
                <tr key={flight._id}>
                  <td>
                    <div
                      style={{
                        fontWeight: 'bold',
                        color: 'var(--gold-dark)'
                      }}
                    >
                      {flight.flightNumber}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888'
                      }}
                    >
                      {flight.airline}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 'bold' }}>
                      {flight.originCode} → {flight.destinationCode}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888'
                      }}
                    >
                      {flight.origin} → {flight.destination}
                    </div>
                  </td>

                  <td>
                    <div>
                      {new Date(flight.departureDate).toLocaleDateString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888'
                      }}
                    >
                      {flight.departureTime} → {flight.arrivalTime}
                    </div>
                  </td>

                  <td>
                    <div>
                      {flight.availableSeats} / {flight.totalSeats}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888'
                      }}
                    >
                      available
                    </div>
                  </td>

                  <td>
                    ₹{flight.priceEconomy?.toLocaleString()}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        flight.status === 'scheduled'
                          ? 'badge-green'
                          : flight.status === 'cancelled'
                          ? 'badge-red'
                          : 'badge-gray'
                      }`}
                    >
                      {flight.status}
                    </span>
                  </td>

                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px'
                      }}
                    >
                      <button
                        className="btn btn-dark"
                        style={{
                          padding: '5px 12px',
                          fontSize: '11px'
                        }}
                        onClick={() => handleEdit(flight)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-danger"
                        style={{
                          padding: '5px 12px',
                          fontSize: '11px'
                        }}
                        onClick={() => handleDelete(flight._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```
