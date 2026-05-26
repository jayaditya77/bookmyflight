import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Flights.css';

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filter, setFilter] = useState({
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    date: searchParams.get('date') || ''
  });

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.origin) params.set('origin', filter.origin);
      if (filter.destination) params.set('destination', filter.destination);
      if (filter.date) params.set('date', filter.date);
      const endpoint = params.toString() ? `/flights/search?${params}` : '/flights';
      const { data } = await API.get(endpoint);
      setFlights(data);
    } catch {
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlights(); }, []);

  const handleBook = (flightId) => {
    if (!user) { navigate('/login'); return; }
    navigate(`/book/${flightId}`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flights-page container">
      <div className="page-header">
        <h1>Available Flights</h1>
        <p>All flights are economy class</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar card">
        <div className="filter-row">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>From</label>
            <input type="text" placeholder="Origin code (e.g. DEL)"
              value={filter.origin} onChange={e => setFilter({ ...filter, origin: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>To</label>
            <input type="text" placeholder="Destination code (e.g. BOM)"
              value={filter.destination} onChange={e => setFilter({ ...filter, destination: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>Date</label>
            <input type="date" value={filter.date}
              onChange={e => setFilter({ ...filter, date: e.target.value })} />
          </div>
          <button className="btn btn-gold" style={{ alignSelf: 'flex-end' }} onClick={fetchFlights}>Search</button>
          <button className="btn btn-outline" style={{ alignSelf: 'flex-end' }}
            onClick={() => { setFilter({ origin: '', destination: '', date: '' }); setTimeout(fetchFlights, 100); }}>
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading flights...</div>
      ) : flights.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✈</div>
          <p>No flights found. Try different filters or check back later.</p>
        </div>
      ) : (
        <div className="flights-list">
          {flights.map(flight => (
            <div className="flight-card card" key={flight._id}>
              <div className="flight-top">
                <div className="airline-info">
                  <span className="flight-number">{flight.flightNumber}</span>
                  <span className="airline-name">{flight.airline}</span>
                </div>
                <span className={`badge ${flight.status === 'scheduled' ? 'badge-green' : 'badge-gray'}`}>
                  {flight.status}
                </span>
              </div>

              <div className="flight-route">
                <div className="route-point">
                  <div className="route-code">{flight.originCode}</div>
                  <div className="route-city">{flight.origin}</div>
                  <div className="route-time">{flight.departureTime}</div>
                </div>
                <div className="route-mid">
                  <div className="route-duration">{flight.duration}</div>
                  <div className="route-line"><span>•——————✈——————•</span></div>
                  <div className="route-date">{formatDate(flight.departureDate)}</div>
                </div>
                <div className="route-point right">
                  <div className="route-code">{flight.destinationCode}</div>
                  <div className="route-city">{flight.destination}</div>
                  <div className="route-time">{flight.arrivalTime}</div>
                </div>
              </div>

              <div className="flight-footer">
                <div className="flight-meta">
                  <span>🛩 {flight.aircraft}</span>
                  <span>💺 {flight.availableSeats} seats left</span>
                  <span>🪑 Economy</span>
                </div>
                <div className="flight-price-book">
                  <div className="price-block">
                    <span className="price-label">per seat</span>
                    <span className="price-amount">₹{flight.priceEconomy?.toLocaleString()}</span>
                  </div>
                  {user?.role === 'admin' ? (
                    <span className="admin-no-book">Admins can't book</span>
                  ) : (
                    <button
                      className="btn btn-gold"
                      onClick={() => handleBook(flight._id)}
                      disabled={flight.availableSeats === 0}
                    >
                      {flight.availableSeats === 0 ? 'Full' : user ? 'Book Now' : 'Login to Book'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
