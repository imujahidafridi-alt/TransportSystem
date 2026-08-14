import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface KeyboardShortcutContextType {
  registerAction: (actionName: string, handler: () => void, tab?: string) => () => void;
  activeTab: string;
  isShortcutModalOpen: boolean;
  setIsShortcutModalOpen: (open: boolean) => void;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType | null>(null);

export const KeyboardShortcutProvider: React.FC<{ activeTab?: string; children: React.ReactNode }> = ({
  activeTab = 'dashboard',
  children,
}) => {
  const [actions, setActions] = useState<Record<string, () => void>>({});
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const registerAction = (actionName: string, handler: () => void, tab?: string) => {
    const key = tab ? `${tab}::${actionName}` : `GLOBAL::${actionName}`;
    setActions((prev) => ({ ...prev, [key]: handler }));
    return () => {
      setActions((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTab = activeTabRef.current;
      const currentActions = actionsRef.current;

      const trigger = (actionName: string) => {
        const scopedHandler = currentActions[`${currentTab}::${actionName}`];
        if (scopedHandler) {
          scopedHandler();
          return true;
        }
        const globalHandler = currentActions[`GLOBAL::${actionName}`];
        if (globalHandler) {
          globalHandler();
          return true;
        }
        return false;
      };

      // Ctrl + B (Cloud Backup Sync)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        trigger('CLOUD_BACKUP');
      }
      // Ctrl + N (New Record)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        trigger('NEW_RECORD');
      }
      // Ctrl + F (Search Focus)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        trigger('SEARCH_FOCUS');
      }
      // Ctrl + S (Save Form)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        trigger('SAVE_FORM');
      }
      // Esc (Close Modal)
      if (e.key === 'Escape') {
        trigger('ESCAPE');
        setIsShortcutModalOpen(false);
      }
      // ? (Show Shortcut Modal)
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        setIsShortcutModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <KeyboardShortcutContext.Provider
      value={{
        registerAction,
        activeTab,
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
