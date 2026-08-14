import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface SecurityContextType {
  isLocked: boolean;
  isPinSet: boolean;
  isEnabled: boolean;
  autoLockMinutes: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  remainingAttempts: number;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<{ success: boolean; error?: string; lockoutSeconds?: number }>;
  setupPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  disablePin: (currentPin: string) => Promise<{ success: boolean; error?: string }>;
  updateAutoLock: (minutes: number) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<any>(null);

  const refreshStatus = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const status = await window.electronAPI.getSecurityStatus();
      setIsPinSet(status.isPinSet);
      setIsEnabled(status.isEnabled);
      setAutoLockMinutes(status.autoLockMinutes);
      setIsLockedOut(status.isLockedOut);
      setLockoutRemainingSeconds(status.lockoutRemainingSeconds);
      setRemainingAttempts(status.remainingAttempts);

      // Lock on initial load if PIN is enabled
      if (status.isEnabled && status.isPinSet && !sessionStorage.getItem('app_unlocked')) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Failed to load security status:', err);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const lockApp = useCallback(() => {
    if (isEnabled && isPinSet) {
      sessionStorage.removeItem('app_unlocked');
      setIsLocked(true);
    }
  }, [isEnabled, isPinSet]);

  const unlockApp = useCallback(async (pin: string) => {
    if (!window.electronAPI) return { success: true };
    const res = await window.electronAPI.verifyPin(pin);
    if (res.success) {
      sessionStorage.setItem('app_unlocked', 'true');
      setIsLocked(false);
      setIsLockedOut(false);
      setLockoutRemainingSeconds(0);
      setRemainingAttempts(5);
      lastActivityRef.current = Date.now();
    } else {
      if (res.lockoutSeconds && res.lockoutSeconds > 0) {
        setIsLockedOut(true);
        setLockoutRemainingSeconds(res.lockoutSeconds);
      }
      if (res.remainingAttempts !== undefined) {
        setRemainingAttempts(res.remainingAttempts);
      }
    }
    return res;
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    if (!window.electronAPI) return { success: false };
    const res = await window.electronAPI.setPin(pin);
    if (res.success) {
      sessionStorage.setItem('app_unlocked', 'true');
      await refreshStatus();
    }
    return res;
  }, [refreshStatus]);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    if (!window.electronAPI) return { success: false };
    const res = await window.electronAPI.changePin(currentPin, newPin);
    if (res.success) {
      await refreshStatus();
    }
    return res;
  }, [refreshStatus]);

  const disablePin = useCallback(async (currentPin: string) => {
    if (!window.electronAPI) return { success: false };
    const res = await window.electronAPI.disablePin(currentPin);
    if (res.success) {
      setIsLocked(false);
      sessionStorage.removeItem('app_unlocked');
      await refreshStatus();
    }
    return res;
  }, [refreshStatus]);

  const updateAutoLock = useCallback(async (minutes: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.updateSecuritySettings(minutes);
    setAutoLockMinutes(minutes);
  }, []);

  // Inactivity Auto-Lock Loop
  useEffect(() => {
    if (!isEnabled || !isPinSet || isLocked || autoLockMinutes <= 0) {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      return;
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('mousedown', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });
    window.addEventListener('scroll', resetActivity, { passive: true });

    inactivityTimerRef.current = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        lockApp();
      }
    }, 15000); // check every 15s

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('mousedown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    };
  }, [isEnabled, isPinSet, isLocked, autoLockMinutes, lockApp]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (!isLockedOut || lockoutRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLockedOut, lockoutRemainingSeconds]);

  // Global Ctrl + L Shortcut to Lock App Immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockApp]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        isPinSet,
        isEnabled,
        autoLockMinutes,
        isLockedOut,
        lockoutRemainingSeconds,
        remainingAttempts,
        isSettingsOpen,
        openSettings,
        closeSettings,
        lockApp,
        unlockApp,
        setupPin,
        changePin,
        disablePin,
        updateAutoLock,
        refreshStatus,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
