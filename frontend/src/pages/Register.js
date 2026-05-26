import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'user', adminSecret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', form);
      login(data);
      navigate(data.role === 'admin' ? '/admin' : '/flights');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = form.role === 'admin';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">{isAdmin ? '🛡️' : '✈'}</div>
          <h2>Create Account</h2>
          <p>{isAdmin ? 'Register as an admin with your secret code' : 'Join BookMyFlight and start booking today'}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am registering as</label>
            <select
              className="role-select"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value, adminSecret: '' })}
            >
              <option value="user">✈ Tourist</option>
              <option value="admin">🛡️ Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" placeholder="+91 98765 43210" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Min. 6 characters" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>

          {isAdmin && (
            <div className="form-group">
              <label>Admin Secret Code</label>
              <input type="password" placeholder="Enter admin secret code" value={form.adminSecret}
                onChange={e => setForm({ ...form, adminSecret: e.target.value })} required />
            </div>
          )}

          <button type="submit" className={`btn auth-submit ${isAdmin ? 'btn-admin' : 'btn-gold'}`} disabled={loading}>
            {loading ? 'Creating account...' : (isAdmin ? 'Create Admin Account' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
