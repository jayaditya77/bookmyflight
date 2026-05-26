import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ origin: '', destination: '', date: '' });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(search).toString();
    navigate(`/flights?${params}`);
  };

  return (
    <div className="home">
      {/* Hero */}
      <div className="hero">
        <div className="hero-content">
          <div className="hero-tag">✈ Your Journey Starts Here</div>
          <h1 className="hero-title">
            Book Flights,<br />
            <span className="hero-accent">Fly Anywhere.</span>
          </h1>
          <p className="hero-sub">
            Search available flights, pick your seat, and book in minutes.
          </p>

          <form className="search-box" onSubmit={handleSearch}>
            <div className="search-field">
              <label>From</label>
              <input
                type="text"
                placeholder="City or code (e.g. DEL)"
                value={search.origin}
                onChange={e => setSearch({ ...search, origin: e.target.value })}
              />
            </div>
            <div className="search-divider">→</div>
            <div className="search-field">
              <label>To</label>
              <input
                type="text"
                placeholder="City or code (e.g. BOM)"
                value={search.destination}
                onChange={e => setSearch({ ...search, destination: e.target.value })}
              />
            </div>
            <div className="search-field">
              <label>Date</label>
              <input
                type="date"
                value={search.date}
                onChange={e => setSearch({ ...search, date: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-gold search-btn">
              Search Flights
            </button>
          </form>
        </div>

        <div className="hero-deco">
          <div className="deco-circle c1"></div>
          <div className="deco-circle c2"></div>
          <span className="deco-plane">✈</span>
        </div>
      </div>

      {/* Features */}
      <div className="features container">
        <div className="feature-card">
          <div className="f-icon">🛫</div>
          <h3>Real Flights Only</h3>
          <p>All flights are added by verified admins. No dummy data, ever.</p>
        </div>
        <div className="feature-card">
          <div className="f-icon">💺</div>
          <h3>Pick Your Seat</h3>
          <p>Visual seat map — choose your spot before you book.</p>
        </div>
        <div className="feature-card">
          <div className="f-icon">🔐</div>
          <h3>Secure Booking</h3>
          <p>JWT-protected accounts. Your data stays safe.</p>
        </div>
        <div className="feature-card">
          <div className="f-icon">📋</div>
          <h3>Booking History</h3>
          <p>Track all your bookings and manage them from your dashboard.</p>
        </div>
      </div>
    </div>
  );
}
