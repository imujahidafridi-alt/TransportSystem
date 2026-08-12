import React, { createContext, useContext, useEffect, useState } from 'react';

interface KeyboardShortcutContextType {
  registerAction: (actionName: string, handler: () => void) => () => void;
  isShortcutModalOpen: boolean;
  setIsShortcutModalOpen: (open: boolean) => void;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType | null>(null);

export const KeyboardShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<Record<string, () => void>>({});
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  const registerAction = (actionName: string, handler: () => void) => {
    setActions((prev) => ({ ...prev, [actionName]: handler }));
    return () => {
      setActions((prev) => {
        const copy = { ...prev };
        delete copy[actionName];
        return copy;
      });
    };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + N (New Record)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        actions['NEW_RECORD']?.();
      }
      // Ctrl + F (Search Focus)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        actions['SEARCH_FOCUS']?.();
      }
      // Ctrl + S (Save Form)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        actions['SAVE_FORM']?.();
      }
      // Esc (Close Modal)
      if (e.key === 'Escape') {
        actions['ESCAPE']?.();
        setIsShortcutModalOpen(false);
      }
      // ? (Show Shortcut Modal)
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        setIsShortcutModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  return (
    <KeyboardShortcutContext.Provider
      value={{
        registerAction,
        isShortcutModalOpen,
        setIsShortcutModalOpen,
      }}
    >
      {children}
    </KeyboardShortcutContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutProvider');
  }
  return context;
};
