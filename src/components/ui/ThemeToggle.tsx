'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/lib/theme';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-background-glass backdrop-blur-glass border border-border-glass rounded-pill">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-pill text-sm font-medium transition-all duration-200
            ${
              theme === option.value
                ? 'bg-accent-primary text-ink-grey shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-glass'
            }
          `}
          aria-label={`Switch to ${option.label} theme`}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleCompact() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const currentIcon = resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;

  return (
    <button
      onClick={handleToggle}
      className="
        flex items-center justify-center w-10 h-10 
        bg-background-glass backdrop-blur-glass border border-border-glass rounded-pill
        text-text-secondary hover:text-text-primary hover:bg-background-secondary
        transition-all duration-200
      "
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {currentIcon}
    </button>
  );
}

// Fallback component for SSR
export function ThemeToggleFallback() {
  return (
    <div className="flex items-center gap-1 p-1 bg-background-glass backdrop-blur-glass border border-border-glass rounded-pill">
      <div className="flex items-center gap-2 px-3 py-2 rounded-pill text-sm font-medium bg-accent-primary text-ink-grey shadow-lg">
        <Moon className="w-4 h-4" />
        <span className="hidden sm:inline">Dark</span>
      </div>
    </div>
  );
}

export function ThemeToggleCompactFallback() {
  return (
    <div className="
      flex items-center justify-center w-10 h-10 
      bg-background-glass backdrop-blur-glass border border-border-glass rounded-pill
      text-text-secondary
    ">
      <Moon className="w-4 h-4" />
    </div>
  );
}