import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import './Auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('token');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState(location.state?.message || 'Check your inbox for a verification link.');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;

    API.post('/auth/verify-email', { token })
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'We could not verify this email address.');
      });
  }, [token]);

  const resend = async (event) => {
    event.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const { data } = await API.post('/auth/resend-verification', { email });
      setMessage(data.message);
      setStatus('sent');
    } catch {
      setMessage('We could not send a verification email. Please try again.');
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  const title = status === 'verifying'
    ? 'Verifying your email…'
    : status === 'success'
    ? 'Email verified'
    : 'Verify your email';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✉️</div>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        {status === 'success' ? (
          <Link to="/login" className="btn btn-gold auth-submit">Sign in</Link>
        ) : (
          <form onSubmit={resend}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-gold auth-submit" disabled={sending || status === 'verifying'}>
              {sending ? 'Sending...' : 'Send verification email'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
