'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import GoogleOAuthButton from './GoogleOAuthButton';
import { COUNTIES } from '@/lib/clubData';
import { clubsByCounty } from '@/lib/clubData';

const POSITIONS = [
  'Coach/Manager',
  'Goalkeeper',
  'Full Back Line',
  'Wing Back',
  'Centre Back',
  'Midfield',
  'Wing Forward',
  'Centre Forward',
  'Full Forward Line',
];

const PLAYER_POSITIONS = POSITIONS.filter((p) => p !== 'Coach/Manager');

export default function SignupForm() {
  const { signup, loginWithGoogle, loading } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [county, setCounty] = useState('');
  const [club, setClub] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPosition, setSecondaryPosition] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('');

  const isCoach = primaryPosition === 'Coach/Manager';
  const clubs = county ? clubsByCounty[county] || [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name) { setError('Please enter your name'); return; }
    if (!email || !password) { setError('Please enter email and password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    try {
      const result = await signup({
        email,
        password,
        name,
        dob: dob || undefined,
        county: county || undefined,
        club: club || undefined,
        primaryPosition: primaryPosition || undefined,
        secondaryPosition: secondaryPosition || undefined,
        preferredFoot: preferredFoot || undefined,
        primarySport: 'football',
      });
      if (result.needsConfirmation) {
        setSuccess('Check your email to confirm your account!');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
  const selectClass =
    'w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer';
  const labelClass = 'block text-sm font-medium text-text mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 text-danger text-sm px-4 py-2.5 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 text-success text-sm px-4 py-2.5 rounded-lg">
          {success}
        </div>
      )}

      {/* Account fields */}
      <div>
        <label htmlFor="signupEmail" className={labelClass}>Email</label>
        <input
          id="signupEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="signupPassword" className={labelClass}>Password</label>
        <input
          id="signupPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="signupConfirmPassword" className={labelClass}>Confirm Password</label>
        <input
          id="signupConfirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className={inputClass}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-4">
        <p className="text-sm text-text-muted mb-3">Player Information</p>
      </div>

      <div>
        <label htmlFor="signupName" className={labelClass}>Name</label>
        <input
          id="signupName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="signupDOB" className={labelClass}>Date of Birth</label>
        <input
          id="signupDOB"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="signupCounty" className={labelClass}>County</label>
        <select
          id="signupCounty"
          value={county}
          onChange={(e) => {
            setCounty(e.target.value);
            setClub('');
          }}
          className={selectClass}
        >
          <option value="">Select your county...</option>
          {COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="signupClub" className={labelClass}>Club</label>
        <select
          id="signupClub"
          value={club}
          onChange={(e) => setClub(e.target.value)}
          className={selectClass}
        >
          {!county ? (
            <option value="">Select county first...</option>
          ) : clubs.length === 0 ? (
            <>
              <option value="">No clubs listed yet</option>
              <option value="other">Other / Not Listed</option>
            </>
          ) : (
            <>
              <option value="">Select your club...</option>
              {clubs.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="other">Other / Not Listed</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label htmlFor="signupPosition" className={labelClass}>Role / Position</label>
        <select
          id="signupPosition"
          value={primaryPosition}
          onChange={(e) => {
            setPrimaryPosition(e.target.value);
            if (e.target.value === 'Coach/Manager') setSecondaryPosition('');
          }}
          className={selectClass}
        >
          <option value="">Select role/position...</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className={isCoach ? 'opacity-50 pointer-events-none' : ''}>
        <label htmlFor="signupSecondaryPosition" className={labelClass}>
          Secondary Position
        </label>
        <select
          id="signupSecondaryPosition"
          value={secondaryPosition}
          onChange={(e) => setSecondaryPosition(e.target.value)}
          disabled={isCoach}
          className={selectClass}
        >
          <option value="">Select position...</option>
          <option value="None">None</option>
          {PLAYER_POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="signupFoot" className={labelClass}>Preferred Foot</label>
        <select
          id="signupFoot"
          value={preferredFoot}
          onChange={(e) => setPreferredFoot(e.target.value)}
          className={selectClass}
        >
          <option value="">Select preferred foot...</option>
          <option value="Right">Right</option>
          <option value="Left">Left</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleOAuthButton onClick={handleGoogle} disabled={loading} />

      <p className="text-center text-sm text-text-muted mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
