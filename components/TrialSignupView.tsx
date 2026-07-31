import React, { useState } from 'react';
import { Mail, Building2, User, Check, AlertCircle, ArrowRight, Compass } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

export const TrialSignupView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [useCase, setUseCase] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !org.trim()) return;
    setStatus('submitting');
    setError(null);
    try {
      await addDoc(collection(db, 'trial_signups'), {
        name: name.trim(),
        email: email.trim(),
        org: org.trim(),
        useCase: useCase.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setStatus('done');
    } catch (err: any) {
      console.error('Trial signup failed:', err);
      setError('Something went wrong saving your request. Please try again in a moment.');
      setStatus('error');
    }
  };

  return (
    <div className="compass-canvas min-h-screen bg-ink text-parchment font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-lg relative z-10">
        {/* brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Compass size={26} className="text-brass" />
          <div className="text-center">
            <div className="font-sans font-extrabold tracking-[0.18em] text-sm text-parchment">NOMAD <span className="text-brass">COMPASS</span></div>
            <div className="font-mono2 text-[0.55rem] tracking-[0.3em] text-inkfaint uppercase mt-0.5">by Nomad Consulting</div>
          </div>
        </div>

        <div className="relative bg-surface border border-hairline rounded-md p-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)]">
          <span className="absolute top-1 left-1 w-3 h-3 border-t border-l border-brass" />
          <span className="absolute top-1 right-1 w-3 h-3 border-t border-r border-brass" />
          <span className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-brass" />
          <span className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-brass" />

          {status === 'done' ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-teal/12 border border-teal/30 flex items-center justify-center">
                <Check size={22} className="text-teal" />
              </div>
              <h1 className="font-display text-2xl font-semibold text-ivory mb-2">You’re on the list</h1>
              <p className="text-inkmute text-sm leading-relaxed max-w-sm mx-auto">
                Thanks, {name.split(' ')[0] || 'there'}. We’re opening Nomad Compass to the first 10 organizations —
                if you’re selected, we’ll email <span className="text-parchment">{email}</span> with your 30-day
                free-trial access.
              </p>
            </div>
          ) : (
            <>
              <div className="font-mono2 text-[0.6rem] tracking-[0.28em] uppercase text-brass mb-2">Limited · 10 spots</div>
              <h1 className="font-display text-3xl font-semibold text-ivory leading-tight mb-2">
                Start your 30-day free trial
              </h1>
              <p className="text-inkmute text-sm leading-relaxed mb-6">
                We’re inviting <span className="text-parchment">10 nonprofits</span> to steer their mission with
                Nomad Compass — free for 30 days. Tell us about your team and we’ll be in touch.
              </p>

              {error && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-md p-3 mb-4 text-left">
                  <AlertCircle size={16} className="text-red-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200 leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <Field label="Full name" icon={<User size={16} />}>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" />
                </Field>
                <Field label="Work email" icon={<Mail size={16} />}>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@yourorg.org" />
                </Field>
                <Field label="Organization" icon={<Building2 size={16} />}>
                  <input required value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Global Health Partners" />
                </Field>
                <div>
                  <label className="block font-mono2 text-[0.58rem] tracking-[0.2em] uppercase text-inkfaint mb-1.5">
                    What would you use it for? <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea value={useCase} onChange={(e) => setUseCase(e.target.value)} rows={3}
                    className="w-full bg-ink/70 border border-hairline/70 rounded-md px-3 py-2.5 text-sm text-ivory placeholder:text-inkfaint focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/25 transition"
                    placeholder="Tracking grant impact, reporting to funders…" />
                </div>

                <button type="submit" disabled={status === 'submitting'}
                  className="w-full bg-gradient-to-b from-brassbright to-brass text-[#26200e] font-bold rounded-md py-3.5 flex items-center justify-center gap-2 hover:brightness-105 transition active:scale-[0.99] disabled:opacity-60">
                  {status === 'submitting'
                    ? <span className="w-5 h-5 rounded-full border-2 border-[#26200e]/40 border-t-[#26200e] animate-spin" />
                    : <>Request my free trial <ArrowRight size={17} /></>}
                </button>
              </form>

              <p className="font-mono2 text-[0.58rem] tracking-[0.1em] uppercase text-inkfaint text-center mt-5">
                No card required · We’ll only email you about the trial
              </p>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-inkfaint hover:text-brass text-xs font-medium transition-colors">← Back to sign in</a>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className="block font-mono2 text-[0.58rem] tracking-[0.2em] uppercase text-inkfaint mb-1.5">{label}</label>
    <div className="relative [&_input]:w-full [&_input]:bg-ink/70 [&_input]:border [&_input]:border-hairline/70 [&_input]:rounded-md [&_input]:pl-9 [&_input]:pr-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-ivory [&_input]:placeholder:text-inkfaint [&_input]:outline-none [&_input:focus]:border-teal/50 [&_input:focus]:ring-2 [&_input:focus]:ring-teal/25 [&_input]:transition">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-inkfaint pointer-events-none">{icon}</span>
      {children}
    </div>
  </div>
);
