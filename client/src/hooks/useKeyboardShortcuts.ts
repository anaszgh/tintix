import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Safety check to prevent undefined key errors
      if (!event.key) return;
      
      const shortcut = shortcuts.find(s => 
        s.key.toLowerCase() === event.key.toLowerCase() &&
        (s.ctrlKey ?? false) === event.ctrlKey &&
        (s.altKey ?? false) === event.altKey &&
        (s.shiftKey ?? false) === event.shiftKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Global keyboard shortcuts
export function useGlobalKeyboardShortcuts() {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      action: () => {
        // Trigger help dialog
        const helpButton = document.querySelector('[data-help-trigger]') as HTMLElement;
        if (helpButton) helpButton.click();
      },
      description: 'Open Help'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="search" i], input[placeholder*="job" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus Search'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Trigger new entry button
        const newButton = document.querySelector('[data-tour="add-job"] button') as HTMLElement;
        if (newButton) newButton.click();
      },
      description: 'New Job Entry'
    }
  ];

  useKeyboardShortcuts(shortcuts);
}