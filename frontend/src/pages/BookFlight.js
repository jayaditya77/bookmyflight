import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import API from '../utils/api';
import socket from '../utils/socket';
import './BookFlight.css';

export default function BookFlight() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [flight, setFlight] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatLocks, setSeatLocks] = useState({});
  const [clock, setClock] = useState(Date.now());

  const [passenger, setPassenger] = useState({
    passengerName: user?.name || '',
    passengerEmail: user?.email || '',
    passengerPhone: '',
    passengerAge: ''
  });

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const releaseSeatLock = async (seat) => {
    if (!seat) return;
    try {
      await API.post('/bookings/release-seat', {
        flightId: id,
        seatNumber: seat.seatNumber
      });
    } catch {
      // The Redis TTL still releases the lock if this request fails.
    }
  };

  // LOCK SEAT
  const lockSeat = async (seat) => {
    try {
      const { data } = await API.post(
        '/bookings/lock-seat',
        {
          flightId: id,
          seatNumber: seat.seatNumber
        }
      );

      setSeatLocks((current) => ({
        ...current,
        [seat.seatNumber]: { expiresAt: data.expiresAt, isMine: true }
      }));
      setSelectedSeat(seat);

      toast.success(
        `Seat ${seat.seatNumber} locked for 5 minutes!`
      );

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        'Seat lock failed'
      );
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'admin') {
      navigate('/flights');
      return;
    }

    API.get(`/flights/${id}`)
      .then(({ data }) => {
        setFlight(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  }, [id, user, navigate]);

  useEffect(() => {
    if (!id || !user) return undefined;

    const handleSeatLocked = ({ seatNumber, expiresAt }) => {
      setSeatLocks((current) => {
        const existing = current[seatNumber];
        if (existing && existing.expiresAt > expiresAt) return current;
        return { ...current, [seatNumber]: { expiresAt, isMine: false } };
      });
    };

    const handleSeatUnlocked = ({ seatNumber }) => {
      setSeatLocks((current) => {
        const next = { ...current };
        delete next[seatNumber];
        return next;
      });
      setSelectedSeat((current) => current?.seatNumber === seatNumber ? null : current);
    };

    const handleSeatBooked = ({ seatNumber }) => {
      setSeatLocks((current) => {
        const next = { ...current };
        delete next[seatNumber];
        return next;
      });
      setSelectedSeat((current) => current?.seatNumber === seatNumber ? null : current);
      setFlight((current) => {
        if (!current || current.seats.some((seat) => seat.seatNumber === seatNumber && seat.isBooked)) {
          return current;
        }
        return {
          ...current,
          availableSeats: Math.max(0, current.availableSeats - 1),
          seats: current.seats.map((seat) => seat.seatNumber === seatNumber
            ? { ...seat, isBooked: true }
            : seat)
        };
      });
    };

    socket.on('seatLocked', handleSeatLocked);
    socket.on('seatUnlocked', handleSeatUnlocked);
    socket.on('seatBooked', handleSeatBooked);
    socket.connect();
    socket.emit('joinFlight', id);

    return () => {
      socket.emit('leaveFlight', id);
      socket.off('seatLocked', handleSeatLocked);
      socket.off('seatUnlocked', handleSeatUnlocked);
      socket.off('seatBooked', handleSeatBooked);
      socket.disconnect();
    };
  }, [id, user]);

  useEffect(() => {
    if (!flight || !id || !user) return undefined;
    let cancelled = false;

    API.get(`/bookings/seat-locks/${id}`)
      .then(({ data }) => {
        if (cancelled) return;
        const locks = Object.fromEntries(data.map((lock) => [lock.seatNumber, lock]));
        setSeatLocks((current) => {
          const merged = { ...current };
          data.forEach((lock) => {
            if (!merged[lock.seatNumber] || merged[lock.seatNumber].expiresAt < lock.expiresAt) {
              merged[lock.seatNumber] = lock;
            }
          });
          return merged;
        });
        const ownLock = data.find((lock) => lock.isMine);
        if (ownLock) {
          const ownSeat = flight.seats.find((seat) => seat.seatNumber === ownLock.seatNumber);
          if (ownSeat) setSelectedSeat((current) => current || ownSeat);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [flight, id, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const expiredSeats = Object.entries(seatLocks)
      .filter(([, lock]) => lock.expiresAt <= clock)
      .map(([seatNumber]) => seatNumber);
    if (!expiredSeats.length) return;

    setSeatLocks((current) => {
      const next = { ...current };
      expiredSeats.forEach((seatNumber) => {
        if (next[seatNumber]?.expiresAt <= clock) delete next[seatNumber];
      });
      return next;
    });
    setSelectedSeat((current) => expiredSeats.includes(current?.seatNumber) ? null : current);
  }, [clock, seatLocks]);

  // RAZORPAY PAYMENT
  const handlePayment = async () => {
    if (!selectedSeat) {
      return setError('Please select a seat first.');
    }

    try {
      let paymentCompleted = false;
      let paymentFailed = false;
      const { data: order } = await API.post(
        '/payment/create-order',
        {
          amount: flight.priceEconomy
        }
      );

      const options = {
        key: order.key_id,

        amount: order.amount,

        currency: order.currency,

        name: 'BookMyFlight',

        description: 'Flight Booking Payment',

        order_id: order.id,

        handler: async function (response) {
          paymentCompleted = true;
          try {
            const verify = await API.post(
              '/payment/verify',
              response
            );

            if (verify.data.success) {
              handleBook();
            } else {
              setError('Payment verification failed.');
            }

          } catch {
            setError('Payment verification failed.');
          }
        },

        modal: {
          ondismiss: () => {
            if (!paymentCompleted && !paymentFailed) {
              releaseSeatLock(selectedSeat);
              setSelectedSeat(null);
              setError('Checkout closed. The seat hold has been released.');
            }
          }
        },

        theme: {
          color: '#d4af37'
        }
      };

      const razor = new window.Razorpay(options);
      razor.on('payment.failed', (response) => {
        paymentFailed = true;
        razor.close();
        releaseSeatLock(selectedSeat);
        setSelectedSeat(null);
        setError(response.error?.description || 'Payment failed. You can retry or close checkout.');
      });

      razor.open();

    } catch {
      await releaseSeatLock(selectedSeat);
      setSelectedSeat(null);
      setError('Payment failed.');
    }
  };

  // BOOK FLIGHT
  const handleBook = async () => {
    if (!selectedSeat) {
      return setError('Please select a seat first.');
    }

    setBooking(true);
    setError('');

    try {
      const { data } = await API.post('/bookings', {
        flightId: id,
        seatNumber: selectedSeat.seatNumber,
        ...passenger
      });

      setSuccess(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Booking failed. Please try again.'
      );

    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading flight details...
      </div>
    );
  }

  if (!flight) {
    return (
      <div
        className="container"
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#c62828'
        }}
      >
        Flight not found.
      </div>
    );
  }

  // GROUP SEATS
  const rows = {};

  flight.seats.forEach(seat => {
    const row = seat.seatNumber.slice(0, -1);

    if (!rows[row]) rows[row] = [];

    rows[row].push(seat);
  });

  const formatCountdown = (expiresAt) => {
    const seconds = Math.max(0, Math.ceil((expiresAt - clock) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const renderSeat = (seat) => {
    const lock = seatLocks[seat.seatNumber];
    const activeLock = lock && lock.expiresAt > clock;
    const isMine = lock?.isMine || selectedSeat?.seatNumber === seat.seatNumber;
    const stateClass = seat.isBooked ? 'booked' : isMine ? 'selected' : activeLock ? 'locked' : 'available';
    const seatTitle = seat.isBooked
      ? `Seat ${seat.seatNumber} · Booked`
      : activeLock && !isMine
      ? `Seat ${seat.seatNumber} · Temporarily locked · ${formatCountdown(lock.expiresAt)} remaining`
      : `Seat ${seat.seatNumber} · Economy · ₹${flight.priceEconomy?.toLocaleString()}`;

    return (
      <div
        key={seat.seatNumber}
        className={`seat economy ${stateClass}`}
        onClick={() => !seat.isBooked && (!activeLock || isMine) && lockSeat(seat)}
        title={seatTitle}
        aria-label={seatTitle}
      >
        <span>{seat.seatNumber}</span>
        {activeLock && <small>{formatCountdown(lock.expiresAt)}</small>}
      </div>
    );
  };

  // SUCCESS PAGE
  if (success) {
    return (
      <div
        className="container"
        style={{
          maxWidth: '500px',
          padding: '60px 20px'
        }}
      >
        <div className="card success-card">

          <div className="success-icon">
            ✅
          </div>

          <h2>
            Booking Confirmed!
          </h2>

          <p className="booking-ref">
            Ref:
            <strong>
              {success.bookingReference}
            </strong>
          </p>

          <div className="booking-detail-row">
            <span>Flight</span>
            <span>
              {flight.flightNumber} — {flight.airline}
            </span>
          </div>

          <div className="booking-detail-row">
            <span>Route</span>
            <span>
              {flight.originCode} →
              {flight.destinationCode}
            </span>
          </div>

          <div className="booking-detail-row">
            <span>Seat</span>
            <span>
              {success.seatNumber} (Economy)
            </span>
          </div>

          <div className="booking-detail-row">
            <span>Passenger</span>
            <span>
              {success.passengerName}
            </span>
          </div>

          <div className="booking-detail-row">
            <span>Amount Paid</span>

            <span>
              <strong>
                ₹{success.amountPaid?.toLocaleString()}
              </strong>
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px'
            }}
          >
            <button
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={() => navigate('/my-bookings')}
            >
              My Bookings
            </button>

            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => navigate('/flights')}
            >
              Book Another
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="book-page container">

      <div className="page-header">

        <h1>
          Select Seat & Book
        </h1>

        <p>
          {flight.flightNumber} ·
          {flight.origin} ({flight.originCode}) →
          {flight.destination} ({flight.destinationCode})
        </p>

      </div>

      <div className="book-layout">

        {/* SEAT MAP */}
        <div className="seat-section card">

          <h3 className="section-title">
            Choose Your Seat — Economy Class
          </h3>

          <div className="seat-legend">

            <div className="legend-item">
              <div className="seat-demo available"></div>
              Available
            </div>

            <div className="legend-item">
              <div className="seat-demo selected"></div>
              My selection
            </div>

            <div className="legend-item">
              <div className="seat-demo locked"></div>
              Temporarily locked
            </div>

            <div className="legend-item">
              <div className="seat-demo booked"></div>
              Booked
            </div>

          </div>

          <div className="seat-map">

            <div className="seat-cols-header">

              <span></span>

              <span>A</span>
              <span>B</span>
              <span>C</span>

              <span className="aisle"></span>

              <span>D</span>
              <span>E</span>
              <span>F</span>

            </div>

            {Object.entries(rows).map(([row, seats]) => (

              <div className="seat-row" key={row}>

                <span className="row-num">
                  {row}
                </span>

                {['A', 'B', 'C'].map(col => {

                  const seat = seats.find(
                    s => s.seatNumber.endsWith(col)
                  );

                  if (!seat) {
                    return (
                      <div
                        className="seat-placeholder"
                        key={col}
                      ></div>
                    );
                  }

                  return renderSeat(seat);
                })}

                <span className="aisle"></span>

                {['D', 'E', 'F'].map(col => {

                  const seat = seats.find(
                    s => s.seatNumber.endsWith(col)
                  );

                  if (!seat) {
                    return (
                      <div
                        className="seat-placeholder"
                        key={col}
                      ></div>
                    );
                  }

                  return renderSeat(seat);
                })}

              </div>
            ))}

          </div>

          {selectedSeat && (

            <div className="selected-seat-info">

              <strong>
                Selected:
              </strong>

              Seat {selectedSeat.seatNumber}
              · Economy ·

              <strong>
                ₹{flight.priceEconomy?.toLocaleString()}
              </strong>
              <span className="hold-countdown">
                Hold expires in {seatLocks[selectedSeat.seatNumber]
                  ? formatCountdown(seatLocks[selectedSeat.seatNumber].expiresAt)
                  : '0:00'}
              </span>

              <button
                style={{
                  marginLeft: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#c62828',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={async () => {
                  await releaseSeatLock(selectedSeat);
                  setSelectedSeat(null);
                }}
              >
                ✕ Clear
              </button>

            </div>
          )}

        </div>

        {/* PASSENGER INFO */}
        <div className="passenger-section card">

          <h3 className="section-title">
            Passenger Details
          </h3>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form>

            <div className="form-group">

              <label>
                Full Name
              </label>

              <input
                value={passenger.passengerName}
                onChange={e =>
                  setPassenger({
                    ...passenger,
                    passengerName: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>Email</label>

              <input
                type="email"
                value={passenger.passengerEmail}
                onChange={e =>
                  setPassenger({
                    ...passenger,
                    passengerEmail: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>
                Phone
              </label>

              <input
                type="tel"
                value={passenger.passengerPhone}
                placeholder="+91 98765 43210"
                onChange={e =>
                  setPassenger({
                    ...passenger,
                    passengerPhone: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>
                Age
              </label>

              <input
                type="number"
                min="1"
                max="120"
                value={passenger.passengerAge}
                onChange={e =>
                  setPassenger({
                    ...passenger,
                    passengerAge: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="booking-summary">

              <div className="summary-row">
                <span>Flight</span>
                <span>{flight.flightNumber}</span>
              </div>

              <div className="summary-row">
                <span>Route</span>
                <span>
                  {flight.originCode} →
                  {flight.destinationCode}
                </span>
              </div>

              <div className="summary-row">
                <span>Date</span>

                <span>
                  {new Date(
                    flight.departureDate
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }
                  )}
                </span>
              </div>

              <div className="summary-row">
                <span>Departure</span>
                <span>{flight.departureTime}</span>
              </div>

              <div className="summary-row">
                <span>Seat</span>

                <span>
                  {selectedSeat
                    ? `${selectedSeat.seatNumber} (Economy)`
                    : '—'}
                </span>
              </div>

              <div className="summary-row total">

                <span>Total</span>

                <span>
                  {selectedSeat
                    ? `₹${flight.priceEconomy?.toLocaleString()}`
                    : '—'}
                </span>

              </div>

            </div>

            <button
              type="button"
              className="btn btn-gold"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px'
              }}
              disabled={!selectedSeat || booking}
              onClick={handlePayment}
            >
              {booking
                ? 'Processing...'
                : 'Pay & Book Flight'}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}