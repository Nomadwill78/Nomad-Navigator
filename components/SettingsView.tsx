import React, { useState } from 'react';
import { User, Mail, Shield, KeyRound, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';
import { ROLE_DESCRIPTIONS } from '../types';
import { describeAuthError } from '../src/lib/authErrors';

export const SettingsView: React.FC = () => {
  const { user, profile, organization, role, logout, updateDisplayName, changePassword } = useAuth();

  const [name, setName] = useState(profile?.displayName || '');
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const nameChanged = name.trim() !== '' && name.trim() !== profile?.displayName;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameChanged) return;
    setNameStatus('saving');
    setNameError(null);
    try {
      await updateDisplayName(name);
      setNameStatus('saved');
    } catch (error: any) {
      setNameStatus('error');
      setNameError(describeAuthError(error));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordStatus('error');
      setPasswordError('Please choose a new password with at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error');
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordStatus('saving');
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordStatus('saved');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordStatus('error');
      setPasswordError(describeAuthError(error));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-ivory flex items-center gap-2">
          <User className="text-teal" /> Account Settings
        </h2>
        <p className="text-inkmute">Manage your profile and how you sign in.</p>
      </div>

      {/* --- Account info --- */}
      <div className="bg-surface rounded-3xl border border-hairline shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-inkfaint uppercase tracking-widest">
          <Mail size={14} /> Account
        </div>

        <div>
          <label className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
            Email address
          </label>
          <p className="text-sm text-parchment font-medium">{user?.email}</p>
        </div>

        {organization && role && (
          <div>
            <label className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
              Organization &amp; role
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-parchment font-medium">{organization.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono2 font-bold uppercase tracking-wider bg-teal/10 text-teal border border-teal/25">
                <Shield size={10} className="inline mr-1 -mt-0.5" />
                {role.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-inkfaint mt-1">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        )}

        <form onSubmit={handleSaveName} className="pt-1">
          <label htmlFor="settings-name" className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
            Display name
          </label>
          <div className="flex gap-3">
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameStatus('idle');
              }}
              className="flex-1 px-4 py-2.5 bg-ink/50 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/40 transition-all font-medium text-sm"
            />
            <button
              type="submit"
              disabled={!nameChanged || nameStatus === 'saving'}
              className="px-4 py-2.5 bg-gradient-to-b from-brassbright to-brass text-[#26200e] rounded-xl font-bold text-sm hover:brightness-105 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nameStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
          {nameStatus === 'saved' && (
            <p className="flex items-center gap-1.5 text-xs text-teal mt-2">
              <CheckCircle2 size={14} /> Saved
            </p>
          )}
          {nameStatus === 'error' && nameError && (
            <p className="flex items-center gap-1.5 text-xs text-rose-300 mt-2">
              <AlertCircle size={14} /> {nameError}
            </p>
          )}
        </form>
      </div>

      {/* --- Change password --- */}
      <div className="bg-surface rounded-3xl border border-hairline shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-inkfaint uppercase tracking-widest">
          <KeyRound size={14} /> Change password
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="settings-current-pass" className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
              Current password
            </label>
            <input
              id="settings-current-pass"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-ink/50 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/40 transition-all font-medium text-sm"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-new-pass" className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
                New password
              </label>
              <input
                id="settings-new-pass"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-ink/50 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/40 transition-all font-medium text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-pass" className="block text-[10px] font-bold text-inkfaint uppercase tracking-widest mb-1.5">
                Confirm new password
              </label>
              <input
                id="settings-confirm-pass"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-ink/50 border border-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/40 transition-all font-medium text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {passwordStatus === 'error' && passwordError && (
            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              <AlertCircle size={16} className="text-rose-300 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200 leading-relaxed">{passwordError}</p>
            </div>
          )}
          {passwordStatus === 'saved' && (
            <div className="flex items-center gap-2 bg-teal/10 border border-teal/25 rounded-xl p-3">
              <CheckCircle2 size={16} className="text-teal shrink-0" />
              <p className="text-xs text-teal">Your password has been updated.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={passwordStatus === 'saving' || !currentPassword || !newPassword}
            className="bg-abyss text-ivory px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-surface2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordStatus === 'saving' ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* --- Sign out --- */}
      <div className="bg-surface rounded-3xl border border-hairline shadow-sm p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-parchment">Sign out of Nomad Compass</p>
          <p className="text-xs text-inkfaint">You'll need your email and password to sign back in.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-inkmute border border-hairline hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all shrink-0"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
};
