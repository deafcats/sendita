'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MESSAGE_MAX_LENGTH } from '@anon-inbox/shared';
import { ConfettiAnimation } from './ConfettiAnimation';

interface Profile {
  displayName: string | null;
  avatarUrl: string | null;
  slug: string;
}

interface Props {
  profile: Profile;
}

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error' | 'rate_limited' | 'captcha_required';

export function SubmissionPage({ profile }: Props) {
  const [body, setBody] = useState('');
  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const pageLoadTimeRef = useRef(Date.now());
  const idempotencyKeyRef = useRef(uuidv4());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const name = profile.displayName ?? 'Someone';
  const remaining = MESSAGE_MAX_LENGTH - body.length;

  // Load FingerprintJS async
  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const { default: FingerprintJS } = await import('@fingerprintjs/fingerprintjs');
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprintHash(result.visitorId);
      } catch {
        // Non-blocking — fingerprint is optional
      }
    };
    loadFingerprint();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || state === 'submitting') return;

    setState('submitting');

    const sendDelayMs = Date.now() - pageLoadTimeRef.current;

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: profile.slug,
          body: body.trim(),
          idempotencyKey: idempotencyKeyRef.current,
          fingerprintHash: fingerprintHash ?? undefined,
          sendDelayMs,
          captchaToken: captchaVerified ? 'verified-human' : undefined,
          website: '', // honeypot field — must remain empty
        }),
      });

      if (res.status === 202) {
        setState('success');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        setCaptchaVerified(false);
      } else if (res.status === 429) {
        const data = await res.json() as { requiresCaptcha?: boolean };
        if (data.requiresCaptcha) {
          setState('captcha_required');
          setErrorMessage('Please complete the verification step before sending more questions.');
        } else {
          setState('rate_limited');
          setErrorMessage("You're sending too many questions. Try again soon.");
        }
      } else {
        const data = await res.json() as { error?: string };
        setState('error');
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setState('error');
      setErrorMessage('Network error. Please check your connection.');
    }
  }, [body, state, profile.slug, fingerprintHash]);

  const handleSendAnother = () => {
    setBody('');
    setState('idle');
    setErrorMessage('');
    setCaptchaVerified(false);
    idempotencyKeyRef.current = uuidv4();
    pageLoadTimeRef.current = Date.now();
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex flex-col items-center justify-center px-4">
        {showConfetti && <ConfettiAnimation />}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Question sent</h2>
          <p className="text-gray-500 mb-6">Your question is on its way to {name}.</p>

          <button
            onClick={handleSendAnother}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-2xl font-semibold hover:bg-purple-700 transition-colors mb-4"
          >
            Send another question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Profile header */}
        <div className="text-center mb-6">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">
            Ask {name} a question
          </h1>
          <p className="text-sm text-gray-400 mt-1">No account needed. Works on mobile and desktop.</p>
        </div>

        {/* Message textarea */}
        <div className="relative mb-4">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            placeholder={`Ask ${name} anything...`}
            rows={4}
            disabled={state === 'submitting'}
            className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-base leading-relaxed disabled:opacity-50"
            maxLength={MESSAGE_MAX_LENGTH}
            autoFocus
          />
          <span
            className={`absolute bottom-3 right-4 text-xs ${
              remaining < 20 ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {remaining}
          </span>
        </div>

        {/* Error states */}
        {(state === 'error' || state === 'rate_limited') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {state === 'captcha_required' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-800 space-y-3">
            <p>{errorMessage || 'Too many attempts. Please complete a verification and try again.'}</p>
            <label className="flex items-center gap-2 text-sm text-yellow-900">
              <input
                type="checkbox"
                checked={captchaVerified}
                onChange={(event) => setCaptchaVerified(event.target.checked)}
              />
              I am a real person sending a genuine question
            </label>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || state === 'submitting'}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3.5 px-6 rounded-2xl font-bold text-base hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {state === 'submitting' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending...
            </>
          ) : (
            'Send question'
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your name is not shown to the streamer
        </p>
      </div>
    </div>
  );
}
