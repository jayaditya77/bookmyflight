import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch {
      setError('We could not process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔐</div>
          <h2>Reset your password</h2>
          <p>Enter your account email and we’ll send a reset link.</p>
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {!message && (
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <button type="submit" className="btn btn-gold auth-submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="auth-footer"><Link to="/login">Back to sign in</Link></div>
      </div>
    </div>
  );
}
