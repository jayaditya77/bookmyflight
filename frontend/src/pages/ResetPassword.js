import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(token ? '' : 'This password-reset link is invalid.');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/reset-password', { token, password });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'We could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h2>Choose a new password</h2>
          <p>Your new password must contain at least 6 characters.</p>
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {!message && token && (
          <form onSubmit={submit}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
            </div>
            <button type="submit" className="btn btn-gold auth-submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        <div className="auth-footer"><Link to="/login">Back to sign in</Link></div>
      </div>
    </div>
  );
}
