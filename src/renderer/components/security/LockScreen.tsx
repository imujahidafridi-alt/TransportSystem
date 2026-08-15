import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, ShieldCheck, AlertCircle, Delete, Clock, ArrowRight } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const LockScreen: React.FC = () => {
  const { isLocked, isLockedOut, lockoutRemainingSeconds, remainingAttempts, unlockApp } = useSecurity();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus invisible input on mount/render
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMsg('');
      inputRef.current?.focus();
    }
  }, [isLocked]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleVerify = useCallback(async (pinToVerify: string) => {
    if (pinToVerify.length < 4 || isVerifying || isLockedOut) return;
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await unlockApp(pinToVerify);
      if (!res.success) {
        setErrorMsg(res.error || 'Incorrect PIN');
        triggerShake();
        setPin('');
      } else {
        setPin('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed');
      triggerShake();
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [unlockApp, isVerifying, isLockedOut]);

  // Handle digit press
  const handleDigit = (digit: string) => {
    if (isLockedOut || isVerifying) return;
    if (pin.length < 8) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    if (isLockedOut || isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isLockedOut || isVerifying) return;
    setPin('');
    setErrorMsg('');
  };

  // Keyboard Handler
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLockedOut || isVerifying) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          handleVerify(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, isLockedOut, isVerifying, handleVerify]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F5FA] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Invisible focus catcher */}
      <input
        ref={inputRef}
        type="password"
        value={pin}
        onChange={() => {}}
        className="opacity-0 absolute pointer-events-none"
        autoFocus
      />

      <div
        className={`w-full max-w-sm bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-7 flex flex-col items-center text-center transition-transform ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* TripLedger Brand Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight block">
            TripLedger
          </h1>
          <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block mt-0.5">
            Transport & Fleet ERP
          </span>
          <span className="text-[10px] text-slate-400 font-medium italic block mt-0.5">
            Every Trip. Every Cost. Every Ledger.
          </span>
        </div>

        {/* Lock Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-2.5 shadow-sm">
          {isLockedOut ? (
            <Clock className="w-6 h-6 text-rose-500 animate-pulse" />
          ) : (
            <Lock className="w-6 h-6 text-violet-600" />
          )}
        </div>

        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
          <span>🔒 Application Locked</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Welcome back! Enter PIN to resume session
        </p>

        {/* Dynamic PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 mb-5 min-h-[24px]">
          {Array.from({ length: Math.max(4, Math.min(pin.length, 8)) }).map((_, index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? 'bg-violet-600 border-violet-600 scale-110 shadow-sm'
                    : 'bg-slate-100 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Status Alert */}
        {isLockedOut ? (
          <div className="w-full p-2.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Locked out. Retry in <strong>{lockoutRemainingSeconds}s</strong>
            </span>
          </div>
        ) : errorMsg ? (
          <div className="w-full p-2.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : remainingAttempts < 5 ? (
          <div className="w-full p-1.5 mb-3 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-medium">
            {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining before lockout
          </div>
        ) : (
          <div className="h-4 mb-2" />
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut || isVerifying}
              onClick={() => handleDigit(digit)}
              className="h-13 rounded-2xl bg-slate-50 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 active:bg-violet-100 border border-slate-200/90 text-lg font-bold text-slate-800 transition shadow-2xs flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
            >
              {digit}
            </button>
          ))}

          {/* Clear */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying || pin.length === 0}
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/90 text-xs font-bold text-slate-600 transition shadow-2xs flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none uppercase tracking-wider"
          >
            Clear
          </button>

          {/* 0 */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying}
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 active:bg-violet-100 border border-slate-200/90 text-lg font-bold text-slate-800 transition shadow-2xs flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            disabled={isLockedOut || isVerifying || pin.length === 0}
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:bg-rose-100 border border-slate-200/90 text-slate-700 transition shadow-2xs flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Unlock Action Button */}
        <button
          type="button"
          disabled={pin.length < 4 || isLockedOut || isVerifying}
          onClick={() => handleVerify(pin)}
          className="w-full max-w-[260px] h-11 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs transition shadow-md hover:shadow-violet-500/25 flex items-center justify-center gap-2 mb-4"
        >
          <span>{isVerifying ? 'Verifying PIN...' : 'Unlock Application'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Footer info */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
          <span>PBKDF2 Hardware-Level Cryptographic Security</span>
        </div>
      </div>
    </div>
  );
};
