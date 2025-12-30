'use client';

import dynamic from 'next/dynamic';
import { ThemeToggleFallback, ThemeToggleCompactFallback } from './ThemeToggle';

// Dynamically import theme toggles with no SSR to prevent hydration issues
export const ClientThemeToggle = dynamic(
  () => import('./ThemeToggle').then((mod) => ({ default: mod.ThemeToggle })),
  {
    ssr: false,
    loading: () => <ThemeToggleFallback />,
  }
);

export const ClientThemeToggleCompact = dynamic(
  () => import('./ThemeToggle').then((mod) => ({ default: mod.ThemeToggleCompact })),
  {
    ssr: false,
    loading: () => <ThemeToggleCompactFallback />,
  }
);