import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Flights.css';

export default function Flights() {
  const [flights, setFlights] = useState([]);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const initialFilter = {
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    date: searchParams.get('date') || ''
  };
  const hasInitialRoute = Boolean(initialFilter.origin || initialFilter.destination);
  const [filter, setFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(hasInitialRoute);
  const [hasSearched, setHasSearched] = useState(hasInitialRoute);

  const fetchFlights = async () => {
    const origin = filter.origin.trim();
    const destination = filter.destination.trim();
    if (!origin && !destination) {
      setFlights([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setHasSearched(true);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (origin) params.set('origin', origin);
      if (destination) params.set('destination', destination);
      if (filter.date) params.set('date', filter.date);
      const { data } = await API.get(`/flights/search?${params}`);
      setFlights(data);
    } catch {
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialRoute) fetchFlights();
  }, []);

  const clearSearch = () => {
    setFilter({ origin: '', destination: '', date: '' });
    setFlights([]);
    setHasSearched(false);
    setLoading(false);
  };

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
            <label>From (departure)</label>
            <input type="text" placeholder="City or airport code"
              value={filter.origin} onChange={e => setFilter({ ...filter, origin: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>To (arrival)</label>
            <input type="text" placeholder="City or airport code"
              value={filter.destination} onChange={e => setFilter({ ...filter, destination: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>Date</label>
            <input type="date" value={filter.date}
              onChange={e => setFilter({ ...filter, date: e.target.value })} />
          </div>
          <button className="btn btn-gold" style={{ alignSelf: 'flex-end' }} onClick={fetchFlights}
            disabled={!filter.origin.trim() && !filter.destination.trim()}>Search</button>
          <button className="btn btn-outline" style={{ alignSelf: 'flex-end' }}
            onClick={clearSearch}>
            Clear
          </button>
        </div>
      </div>

      {!hasSearched ? (
        <div className="empty-state">
          <div className="icon">✈</div>
          <p>Search by departure or arrival city to see available flights.</p>
        </div>
      ) : loading ? (
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
