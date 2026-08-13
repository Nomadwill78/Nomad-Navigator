import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import './LoginView.css';

const C = 130; // compass center

function rot(deg: number, x: number, y: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const dx = x - C;
  const dy = y - C;
  return [C + dx * Math.cos(r) - dy * Math.sin(r), C + dx * Math.sin(r) + dy * Math.cos(r)];
}

const pts = (arr: [number, number][]) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Firebase's raw error codes aren't something a nonprofit admin should have to parse. */
function describeAuthError(err: any): string {
  switch (err?.code) {
    case 'auth/unauthorized-domain':
      return "Google sign-in isn't available from this address yet. Please use email and password, or contact support.";
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was closed before finishing. Try again.';
    case 'auth/network-request-failed':
      return "Couldn't reach Google. Check your connection and try again.";
    default:
      return err?.message || 'Google sign-in failed. Please try again.';
  }
}

const CompassRose: React.FC = () => {
  // graduated degree ring: a tick every 5°, longest at the cardinals
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const ang = i * 5;
    const isCardinal = i % 18 === 0;
    const isMajor = i % 9 === 0;
    const isMed = i % 3 === 0;
    const inner = isCardinal ? 96 : isMajor ? 100 : isMed ? 104 : 106;
    const [x1, y1] = rot(ang, C, C - 112);
    const [x2, y2] = rot(ang, C, C - inner);
    return { x1, y1, x2, y2, cls: isCardinal ? 'lv-tick-c' : isMajor ? 'lv-tick-mj' : 'lv-tick' };
  });

  // primary 4-point star — each cardinal split into a dark/light half (engraved look)
  const cardinals = [0, 90, 180, 270].map((a) => {
    const tip = rot(a, C, C - 92);
    const bl = rot(a, C - 9, C - 20);
    const br = rot(a, C + 9, C - 20);
    const ctr: [number, number] = [C, C];
    return { dark: pts([tip, bl, ctr]), light: pts([tip, br, ctr]) };
  });

  // secondary diagonal points — thin brass kites behind
  const diagonals = [45, 135, 225, 315].map((a) => {
    const tip = rot(a, C, C - 60);
    const bl = rot(a, C - 6, C - 16);
    const br = rot(a, C + 6, C - 16);
    return pts([tip, br, [C, C], bl]);
  });

  const letters: [string, number, boolean][] = [['N', 0, true], ['E', 90, false], ['S', 180, false], ['W', 270, false]];

  return (
    <svg className="lv-compass" viewBox="0 0 260 260" role="img" aria-label="Compass rose">
      <circle className="lv-ring-soft" cx={C} cy={C} r={118} />
      <circle className="lv-ring" cx={C} cy={C} r={112} />
      <circle className="lv-ring-soft" cx={C} cy={C} r={70} />

      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.cls} strokeLinecap="round" />
      ))}

      {letters.map(([ch, a, isN]) => {
        const [lx, ly] = rot(a, C, C - 122);
        return (
          <text key={ch} x={lx} y={ly + 4} textAnchor="middle" className={`lv-card-l ${isN ? 'lv-card-n' : ''}`}>
            {ch}
          </text>
        );
      })}

      {diagonals.map((d, i) => (
        <polygon key={`d${i}`} points={d} className="lv-star-diag" />
      ))}
      {cardinals.map((s, i) => (
        <g key={`c${i}`}>
          <polygon points={s.dark} className="lv-star-dark" />
          <polygon points={s.light} className="lv-star-light" />
        </g>
      ))}

      {/* magnetic needle — settles to true north on load */}
      <g className="lv-needle">
        <polygon points={pts([[C, C - 80], [C - 6, C], [C + 6, C]])} className="lv-needle-n" />
        <polygon points={pts([[C, C + 80], [C - 6, C], [C + 6, C]])} className="lv-needle-s" />
      </g>
      <circle className="lv-hub-outer" cx={C} cy={C} r={7} />
      <circle className="lv-hub-inner" cx={C} cy={C} r={3} />

      {/* true-north marker */}
      <polygon
        points={pts([[C, 6], [C + 3.5, 15], [C, 24], [C - 3.5, 15]])}
        className="lv-north-star"
      />
    </svg>
  );
};

export const LoginView: React.FC = () => {
  const { login, loginWithEmail, registerWithEmail } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'choice' | 'email'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await login();
    } catch (err: any) {
      setError(describeAuthError(err));
      setIsGoogleSubmitting(false);
    }
    // On success, signInWithRedirect navigates away — no need to clear isGoogleSubmitting.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (view === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lv-root">
      {/* LEFT — the instrument */}
      <section className="lv-hero">
        <div className="lv-brand">
          <svg className="lv-brand-mark" viewBox="0 0 100 100" fill="none" stroke="#f1e9d6" aria-hidden="true">
            <circle cx="50" cy="50" r="30" strokeWidth="2" opacity="0.5" />
            <polygon points="50,18 55,50 50,82 45,50" fill="#cba85c" stroke="none" />
            <polygon points="18,50 50,45 82,50 50,55" fill="#f1e9d6" stroke="none" opacity="0.7" />
            <circle cx="50" cy="50" r="4" fill="#0a1a30" stroke="#cba85c" strokeWidth="1.5" />
          </svg>
          <div>
            <div className="lv-brand-name">NOMAD <span>COMPASS</span></div>
            <div className="lv-brand-sub">by Nomad Consulting</div>
          </div>
        </div>

        <div className="lv-hero-mid">
          <span className="lv-eyebrow">Impact intelligence · for nonprofits</span>
          <h1 className="lv-headline">
            Steer your mission by the <em>numbers that matter.</em>
          </h1>
          <p className="lv-sub">
            Nomad Compass turns scattered program data into a clear read on your impact,
            your funding, and the one move that should come next.
          </p>

          <div className="lv-bearings">
            <div className="lv-bearing">
              <span className="lv-bearing-deg">N&nbsp;000°</span>
              <span className="lv-bearing-key">Impact</span>
              <span className="lv-bearing-val">Lives improved, tracked program by program.</span>
            </div>
            <div className="lv-bearing">
              <span className="lv-bearing-deg">E&nbsp;090°</span>
              <span className="lv-bearing-key">Funding</span>
              <span className="lv-bearing-val">Every dollar allocated, and visible.</span>
            </div>
            <div className="lv-bearing">
              <span className="lv-bearing-deg">W&nbsp;270°</span>
              <span className="lv-bearing-key">Direction</span>
              <span className="lv-bearing-val">AI reads the data and points to your next step.</span>
            </div>
          </div>
        </div>

        <div className="lv-compass-wrap" aria-hidden="true">
          <CompassRose />
        </div>
      </section>

      {/* RIGHT — the cartouche sign-in */}
      <section className="lv-panel">
        <div className="lv-cartouche">
          <span className="lv-corner tl" /><span className="lv-corner tr" />
          <span className="lv-corner bl" /><span className="lv-corner br" />

          <div className="lv-panel-eyebrow">{method === 'email' ? (view === 'login' ? 'Return to your chart' : 'Register your organization') : 'Set your bearing'}</div>
          <h2 className="lv-panel-title">
            {method === 'email'
              ? (view === 'login' ? 'Sign in to your dashboard' : 'Create your account')
              : 'Welcome to Compass'}
          </h2>

          {error && (
            <div className="lv-error">
              <AlertCircle size={16} className="shrink-0 text-alerttext" />
              <p>{error}</p>
            </div>
          )}

          {method === 'choice' ? (
            <div className="lv-stack">
              <button className="lv-btn lv-btn-google" onClick={handleGoogleLogin} disabled={isGoogleSubmitting}>
                {isGoogleSubmitting ? (
                  <span className="lv-spinner" />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.44 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z" />
                  </svg>
                )}
                {isGoogleSubmitting ? 'Connecting…' : 'Continue with Google'}
              </button>

              <div className="lv-or"><span>or</span></div>

              <button className="lv-btn lv-btn-ghost" onClick={() => setMethod('email')}>
                <Mail size={17} />
                Continue with email
              </button>
            </div>
          ) : (
            <form className="lv-form" onSubmit={handleSubmit}>
              <div className="lv-form-head">
                <button type="button" className="lv-back" onClick={() => setMethod('choice')}>
                  ← All options
                </button>
              </div>

              <div className="lv-field">
                <label htmlFor="lv-email">Email address</label>
                <div className="lv-input-wrap">
                  <Mail size={16} />
                  <input
                    id="lv-email"
                    className="lv-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.org"
                  />
                </div>
              </div>

              <div className="lv-field">
                <label htmlFor="lv-pass">Password</label>
                <div className="lv-input-wrap">
                  <Lock size={16} />
                  <input
                    id="lv-pass"
                    className="lv-input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" className="lv-btn lv-btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <span className="lv-spinner" /> : view === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="lv-swap">
                {view === 'login' ? "New to Compass? " : 'Already have an account? '}
                <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
                  {view === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          <div className="lv-foot">
            <ShieldCheck size={13} />
            <span>Your impact data stays encrypted, always</span>
          </div>
        </div>
      </section>
    </div>
  );
};
