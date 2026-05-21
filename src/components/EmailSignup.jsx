import { useState } from 'react';
import { APPS_SCRIPT_URL } from '../game/config';

export function EmailSignup() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'done' | 'error'

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'submitting') return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;

    setStatus('submitting');
    try {
      if (!APPS_SCRIPT_URL) throw new Error('APPS_SCRIPT_URL is not configured');
      // text/plain avoids the CORS preflight that Apps Script Web Apps
      // don't handle — see NEWSLETTER_PLAN.md.
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ email, source: 'homepage', website }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="signup-section">
        <div className="signup-success">You’re on the list. See you Saturday. 🐷</div>
      </div>
    );
  }

  return (
    <div className="signup-section">
      <div className="signup-pre">One new ladder in your inbox each Saturday.</div>
      <form className="signup-form" onSubmit={submit}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          required
          disabled={status === 'submitting'}
        />
        <input
          type="text"
          name="website"
          className="signup-honeypot"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
        />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Signing up…' : 'Sign up →'}
        </button>
      </form>
      {status === 'error' && (
        <div className="signup-error" role="alert">
          Something went wrong. Try again?
        </div>
      )}
    </div>
  );
}
