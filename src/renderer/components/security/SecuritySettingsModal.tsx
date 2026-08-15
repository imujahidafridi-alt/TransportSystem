import React, { useState } from 'react';
import {
  Lock,
  Shield,
  ShieldCheck,
  KeyRound,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SelectDropdown } from '../common/SelectDropdown';
import { useSecurity } from '../../context/SecurityContext';

export const SecuritySettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    isPinSet,
    isEnabled,
    autoLockMinutes,
    setupPin,
    changePin,
    disablePin,
    updateAutoLock,
    lockApp,
  } = useSecurity();

  // Mode: 'VIEW' | 'SETUP' | 'CHANGE' | 'DISABLE'
  const [mode, setMode] = useState<'VIEW' | 'SETUP' | 'CHANGE' | 'DISABLE'>('VIEW');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setShowPin(false);
    setErrorMsg('');
    setSuccessMsg('');
    setMode('VIEW');
  };

  const handleClose = () => {
    resetForm();
    closeSettings();
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      setErrorMsg('PIN must be between 4 and 8 digits (numeric only).');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('PIN confirmation does not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setupPin(newPin);
      if (res.success) {
        setSuccessMsg('Security PIN configured and enabled successfully!');
        setTimeout(() => resetForm(), 1200);
      } else {
        setErrorMsg(res.error || 'Failed to set PIN.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error configuring PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      setErrorMsg('New PIN must be between 4 and 8 digits (numeric only).');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('New PIN confirmation does not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePin(currentPin, newPin);
      if (res.success) {
        setSuccessMsg('PIN changed successfully!');
        setTimeout(() => resetForm(), 1200);
      } else {
        setErrorMsg(res.error || 'Current PIN is incorrect.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error changing PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    setIsSubmitting(true);
    try {
      const res = await disablePin(currentPin);
      if (res.success) {
        setSuccessMsg('PIN lock disabled.');
        setTimeout(() => resetForm(), 1200);
      } else {
        setErrorMsg(res.error || 'Current PIN is incorrect.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error disabling PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={handleClose}
      title="App Security & PIN Lockscreen"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Status Header Banner */}
        <div
          className={`p-3.5 rounded-2xl border flex items-start gap-3.5 ${
            isEnabled
              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isEnabled
                ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                : 'bg-slate-200 border-slate-300 text-slate-600'
            }`}
          >
            {isEnabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm block">
                {isEnabled ? 'PIN Protection Active' : 'PIN Protection Disabled'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isEnabled
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isEnabled ? 'ENABLED' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isEnabled
                ? 'Protected with salted PBKDF2 cryptography and inactivity auto-lock.'
                : 'Secure your TripLedger ERP financial records and driver payroll with a numeric passcode.'}
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Mode: VIEW */}
        {mode === 'VIEW' && (
          <div className="space-y-4">
            {/* Auto Lock Duration Config */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-600" />
                Auto-Lock on Inactivity
              </label>
              <SelectDropdown
                options={[
                  { value: '0', label: 'Never (Disabled)' },
                  { value: '5', label: 'After 5 minutes of inactivity' },
                  { value: '15', label: 'After 15 minutes of inactivity (Recommended)' },
                  { value: '30', label: 'After 30 minutes of inactivity' },
                  { value: '60', label: 'After 1 hour of inactivity' },
                ]}
                value={autoLockMinutes.toString()}
                onChange={(val) => updateAutoLock(parseInt(val, 10))}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Automatically locks the screen when no keyboard or mouse activity is detected.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              {!isPinSet || !isEnabled ? (
                <Button
                  variant="primary"
                  icon={<KeyRound className="w-4 h-4" />}
                  onClick={() => setMode('SETUP')}
                >
                  Set Security PIN
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={() => setMode('CHANGE')}
                  >
                    Change PIN
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setMode('DISABLE')}
                  >
                    Disable PIN
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Lock className="w-4 h-4" />}
                    onClick={() => {
                      handleClose();
                      lockApp();
                    }}
                  >
                    Lock Now (Ctrl+L)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mode: SETUP */}
        {mode === 'SETUP' && (
          <form onSubmit={handleSetup} className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block text-xs">
                Set 4 to 8 Digit Passcode
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1 transition"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Hide Digits' : 'Show Digits'}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                New PIN Code (Numbers Only)
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4 to 8 digits"
                  className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Confirm PIN Code
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter to confirm"
                  className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('VIEW')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                Save & Enable PIN
              </Button>
            </div>
          </form>
        )}

        {/* Mode: CHANGE */}
        {mode === 'CHANGE' && (
          <form onSubmit={handleChange} className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block text-xs">
                Change Security PIN
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1 transition"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Hide Digits' : 'Show Digits'}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Current PIN Code
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current PIN"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                New PIN Code (4-8 digits)
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter new 4 to 8 digits"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Confirm New PIN Code
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter new PIN"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('VIEW')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                Update PIN
              </Button>
            </div>
          </form>
        )}

        {/* Mode: DISABLE */}
        {mode === 'DISABLE' && (
          <form onSubmit={handleDisable} className="space-y-3.5 bg-rose-50/60 p-4 rounded-2xl border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-950 block text-xs">
                Disable PIN Protection
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? 'Hide Digits' : 'Show Digits'}
              </button>
            </div>
            <p className="text-[11px] text-rose-800">
              Enter your current PIN code to confirm disabling lockscreen protection.
            </p>

            <div>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current PIN"
                className="h-10 w-full bg-white border border-rose-300 focus:border-rose-600 rounded-xl px-3 font-mono font-bold text-sm text-slate-900 focus:outline-none transition shadow-2xs"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('VIEW')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
                Confirm & Disable
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
