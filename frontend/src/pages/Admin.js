import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Routes, Route } from 'react-router-dom';
import API from '../utils/api';
import AdminFlights from './AdminFlights';
import AdminBookings from './AdminBookings';
import './Admin.css';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/stats').then(({ data }) => { setStats(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage flights, bookings, and platform data</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">✈</div>
          <div className="stat-body">
            <div className="stat-label">Total Flights</div>
            <div className="stat-value">{stats?.totalFlights ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛫</div>
          <div className="stat-body">
            <div className="stat-label">Scheduled</div>
            <div className="stat-value">{stats?.scheduledFlights ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-body">
            <div className="stat-label">Total Bookings</div>
            <div className="stat-value">{stats?.totalBookings ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-body">
            <div className="stat-label">Registered Users</div>
            <div className="stat-value">{stats?.totalUsers ?? 0}</div>
          </div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon">₹</div>
          <div className="stat-body">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{(stats?.totalRevenue ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
        <Link to="/admin/flights" className="btn btn-gold">Manage Flights</Link>
        <Link to="/admin/bookings" className="btn btn-outline">View Bookings</Link>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page container">
      <div className="admin-nav">
        <Link to="/admin" className="admin-nav-link">Dashboard</Link>
        <Link to="/admin/flights" className="admin-nav-link">Flights</Link>
        <Link to="/admin/bookings" className="admin-nav-link">Bookings</Link>
      </div>

      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/flights" element={<AdminFlights />} />
        <Route path="/bookings" element={<AdminBookings />} />
      </Routes>
    </div>
  );
}
