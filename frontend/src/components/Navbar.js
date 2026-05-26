import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Navbar.css';

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const openUpgradeModal = () => {
    setOpen(false);
    setSecretCode('');
    setUpgradeError('');
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    if (!secretCode.trim()) return;
    setUpgradeError('');
    setUpgradeLoading(true);
    try {
      const { data } = await API.post('/auth/upgrade-to-admin', { adminSecret: secretCode });
      login(data); // update stored user with new role + token
      setShowUpgradeModal(false);
      navigate('/admin');
    } catch (err) {
      setUpgradeError(err.response?.data?.message || 'Invalid secret code');
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">✈</span>
            <span className="brand-text">Book<span className="brand-accent">My</span>Flight</span>
          </Link>

          <div className="navbar-links">
            <Link to="/flights" className={`nav-link ${isActive('/flights') ? 'active' : ''}`}>Flights</Link>
            {user && <Link to="/my-bookings" className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}>My Bookings</Link>}
            {user?.role === 'admin' && (
              <Link to="/admin" className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                Admin
              </Link>
            )}
          </div>

          <div className="navbar-actions">
            {user ? (
              <div className="user-menu" onClick={() => setOpen(!open)}>
                <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.name.split(' ')[0]}</span>
                <span className="caret">▾</span>
                {open && (
                  <div className="dropdown">
                    <div className="dropdown-info">
                      <div className="d-name">{user.name}</div>
                      <div className="d-email">{user.email}</div>
                      <span className={`badge ${user.role === 'admin' ? 'badge-gold' : 'badge-tourist'}`} style={{ fontSize: '10px', marginTop: '4px' }}>
                        {user.role === 'admin' ? '🛡️ Admin' : '✈ Tourist'}
                      </span>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #e0d5b5', margin: '6px 0' }} />
                    {user.role === 'user' && (
                      <button className="dropdown-item upgrade-item" onClick={openUpgradeModal}>
                        🛡️ Convert to Admin
                      </button>
                    )}
                    <button className="dropdown-item" onClick={handleLogout}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/login" className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '12px' }}>Login</Link>
                <Link to="/register" className="btn btn-gold" style={{ padding: '8px 18px', fontSize: '12px' }}>Register</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Convert to Admin Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">🛡️</span>
              <h3>Convert to Admin</h3>
              <p>Enter the admin secret code to upgrade your account</p>
            </div>
            {upgradeError && <div className="alert alert-error" style={{ margin: '0 0 12px' }}>{upgradeError}</div>}
            <input
              type="password"
              className="modal-input"
              placeholder="Enter admin secret code"
              value={secretCode}
              onChange={e => setSecretCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-outline modal-btn" onClick={() => setShowUpgradeModal(false)}>Cancel</button>
              <button className="btn btn-admin modal-btn" onClick={handleUpgrade} disabled={upgradeLoading}>
                {upgradeLoading ? 'Verifying...' : 'Upgrade to Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
