'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ClientThemeToggle } from '@/components/ui/ClientThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeDemo() {
  const { theme, resolvedTheme } = useTheme();
  const [demoValue, setDemoValue] = useState('');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Live Theme Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Theme Status */}
          <div className="glass-card p-4">
            <h4 className="heading-primary text-sm mb-2">Current Theme Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Selected:</span>
                <span className="text-text-primary ml-2 font-medium">{theme}</span>
              </div>
              <div>
                <span className="text-text-muted">Resolved:</span>
                <span className="text-text-primary ml-2 font-medium">{resolvedTheme}</span>
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex justify-center">
            <ClientThemeToggle />
          </div>

          {/* Interactive Elements */}
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Test Input Field
              </label>
              <input
                type="text"
                value={demoValue}
                onChange={(e) => setDemoValue(e.target.value)}
                placeholder="Type something to test the theme..."
                className="input-glass w-full px-4 py-3"
              />
            </div>

            <div className="flex gap-3">
              <button className="primary-button px-6 py-2 flex-1">
                Primary Button
              </button>
              <button className="secondary-button px-6 py-2 flex-1">
                Secondary Button
              </button>
            </div>
          </div>

          {/* Color Palette Preview */}
          <div>
            <h4 className="heading-primary text-sm mb-3">Color Palette</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="glass-card p-3 text-center">
                <div className="w-8 h-8 bg-accent-primary rounded mx-auto mb-2"></div>
                <span className="text-xs text-text-muted">Primary</span>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="w-8 h-8 bg-accent-secondary rounded mx-auto mb-2"></div>
                <span className="text-xs text-text-muted">Secondary</span>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="w-8 h-8 bg-accent-success rounded mx-auto mb-2"></div>
                <span className="text-xs text-text-muted">Success</span>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="w-8 h-8 bg-background-glass rounded mx-auto mb-2"></div>
                <span className="text-xs text-text-muted">Glass</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}