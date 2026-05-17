import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap, Globe, Sparkles, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';

export const LoginView: React.FC = () => {
  const { login, loginWithEmail, registerWithEmail } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'choice' | 'email'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="max-w-md w-full relative z-10 text-center text-slate-100">
        <div className="flex justify-center mb-8">
           <div className="bg-gradient-to-br from-brand-500 to-purple-600 p-4 rounded-3xl shadow-2xl shadow-brand-500/40">
              <Activity size={48} className="text-white" />
           </div>
        </div>
        
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Nomad Compass</h1>
        <p className="text-slate-400 text-lg mb-12">The AI-powered impact intelligence platform for modern nonprofits.</p>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-xs text-red-200 font-medium">{error}</p>
            </div>
          )}

          {method === 'choice' ? (
            <div className="space-y-4">
              <button 
                onClick={login}
                className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
              >
                <Globe size={18} className="text-brand-500" />
                Continue with Google
              </button>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">or</span></div>
              </div>

              <button 
                onClick={() => setMethod('email')}
                className="w-full bg-white/5 text-white border border-white/10 py-4 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Mail size={18} className="text-brand-400" />
                Continue with Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white capitalize">{view}</h2>
                <button 
                  type="button"
                  onClick={() => setMethod('choice')}
                  className="text-xs font-bold text-brand-400 hover:text-brand-300"
                >
                  Back to options
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-400 transition-colors" size={16} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                    placeholder="name@organization.org"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-400 transition-colors" size={16} />
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-brand-500 transition-all active:scale-95 shadow-xl shadow-brand-600/20 flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    {view === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>

              <div className="text-center mt-6">
                <button 
                  type="button"
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <span className="text-brand-400 font-bold underline decoration-brand-400/30 underline-offset-4">
                    {view === 'login' ? 'Create one' : 'Sign in'}
                  </span>
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
             <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/5 rounded-lg text-slate-400"><ShieldCheck size={16} /></div>
                <p className="text-[10px] text-slate-500 font-medium">Secure Auth</p>
             </div>
             <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Sparkles size={16} /></div>
                <p className="text-[10px] text-slate-500 font-medium">AI Insights</p>
             </div>
          </div>
          
          <p className="text-slate-500 text-[10px] mt-6 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy. 
            Nomad Compass uses institutional-grade encryption for all impact data.
          </p>
        </div>
      </div>
    </div>
  );
};
