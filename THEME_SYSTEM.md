# Forma Design System - Theme Implementation

## Overview

This project implements a comprehensive light and dark mode theme system based on the **Forma Design System** - an executive-grade aesthetic that bridges the tactile world (leather, wood, warm light) with the digital world (precision, glass, fluid data).

## Theme Philosophy

### Dark Mode: "Night Cockpit"
- **Primary Background**: Peat Charcoal (`#1C1917`) - Softer than pure black, mimics luxury car dashboard
- **Secondary Background**: Deep Leather (`#2A1D15`) - Connects to physical desk environment
- **Primary Accent**: Single Malt (`#E6A65D`) - Backlit liquid gold for CTAs and highlights
- **Glass Effects**: `rgba(255,255,255, 0.05)` with `backdrop-filter: blur(16px)`
- **Ambient Glow**: Radial gradient in top-right corner mimicking desk lamp

### Light Mode: "Day Studio"
- **Primary Background**: Warm Alabaster (`#F5F5F4`) - Stone white, feels like heavy stationery
- **Secondary Background**: Latte Leather (`#E7E5E4`) - Subtle shift for structure definition
- **Primary Accent**: Burnt Copper (`#B45309`) - Darker, richer version for light backgrounds
- **Glass Effects**: `rgba(255,255,255, 0.8)` with subtle shadows
- **Ambient Glow**: Softer copper-tinted radial gradient

## Implementation Architecture

### 1. Theme Provider (`src/contexts/ThemeContext.tsx`)
```typescript
interface ThemeContextType {
  theme: Theme; // 'light' | 'dark' | 'system'
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
```

**Features:**
- System preference detection
- LocalStorage persistence
- Automatic system theme change listening
- Hydration-safe mounting

### 2. CSS Custom Properties (`src/app/globals.css`)
```css
:root {
  /* Dark Mode Variables */
  --bg-primary: #1C1917;
  --text-primary: rgba(255, 255, 255, 0.95);
  --accent-primary: #E6A65D;
}

.light {
  /* Light Mode Variables */
  --bg-primary: #F5F5F4;
  --text-primary: #1C1917;
  --accent-primary: #B45309;
}
```

### 3. Tailwind Configuration (`tailwind.config.js`)
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          glass: 'var(--bg-glass)',
        },
        // ... semantic color tokens
      }
    }
  }
}
```

## Component System

### Glass Cards
```css
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 20px;
}
```

### Primary Buttons
```css
.primary-button {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%);
  border-radius: 999px;
  transition: all 0.3s ease;
}

.dark .primary-button {
  background: linear-gradient(135deg, #E6A65D 0%, #F4B76D 100%);
  color: #1C1917;
  box-shadow: 0 4px 20px -5px rgba(230, 166, 93, 0.4);
}

.light .primary-button {
  background: linear-gradient(135deg, #B45309 0%, #D97706 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 20px -5px rgba(180, 83, 9, 0.3);
}
```

### Input Fields
```css
.input-glass {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  color: var(--text-primary);
}

.input-glass:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary), 0.1);
}
```

## Theme Toggle Components

### Full Theme Toggle (`ThemeToggle`)
- Three options: Light, Dark, System
- Icons for each mode
- Active state highlighting
- Responsive text labels

### Compact Toggle (`ThemeToggleCompact`)
- Single button toggle
- Current mode icon
- Cycles through themes intelligently

### Client-Side Rendering
```typescript
// Prevents hydration mismatches
export const ClientThemeToggle = dynamic(
  () => import('./ThemeToggle').then((mod) => ({ default: mod.ThemeToggle })),
  {
    ssr: false,
    loading: () => <ThemeToggleFallback />,
  }
);
```

## Usage Examples

### Basic Theme Usage
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  
  return (
    <div className="bg-background-primary text-text-primary">
      <p>Current theme: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

### Card Components
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

function FinanceCard() {
  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-accent-primary text-3xl">$247,850</p>
      </CardContent>
    </Card>
  );
}
```

## Design Principles

### 1. Luxury Through Space
- Generous padding inside cards
- Significant border radius (20px-32px)
- Ample whitespace between elements

### 2. Glass & Leather Hierarchy
- **Level 1**: Matte background colors
- **Level 2**: Subtle gradients for sidebars
- **Level 3**: Frosted glass for content cards

### 3. Colored Shadows
- No black shadows
- Copper-tinted shadows for buttons
- Ambient glows match accent colors

### 4. Smooth Transitions
- All theme changes animated (300ms)
- Hover states with subtle transforms
- Progressive enhancement approach

## Accessibility

- **High Contrast**: Both themes meet WCAG AA standards
- **System Preference**: Respects `prefers-color-scheme`
- **Keyboard Navigation**: All toggles are keyboard accessible
- **Screen Readers**: Proper ARIA labels and descriptions
- **Reduced Motion**: Respects `prefers-reduced-motion`

## Performance Considerations

- **CSS Custom Properties**: Efficient theme switching
- **Dynamic Imports**: Theme toggles load only when needed
- **Minimal JavaScript**: Core theme logic is lightweight
- **SSR Safe**: Prevents hydration mismatches
- **LocalStorage**: Persists user preference

## File Structure

```
src/
├── contexts/
│   └── ThemeContext.tsx          # Theme provider and hooks
├── lib/
│   └── theme.ts                  # Theme utilities and types
├── components/ui/
│   ├── ThemeToggle.tsx           # Theme toggle components
│   ├── ClientThemeToggle.tsx     # SSR-safe wrappers
│   └── Card.tsx                  # Theme-aware card components
├── app/
│   ├── globals.css               # Theme CSS variables and styles
│   └── layout.tsx                # Theme provider integration
└── tailwind.config.js            # Theme-aware Tailwind config
```

## Testing Theme Implementation

1. **Build Test**: `npm run build` - Ensures SSR compatibility
2. **Visual Test**: Toggle between themes and verify smooth transitions
3. **System Test**: Change OS theme preference and verify system mode
4. **Persistence Test**: Refresh page and verify theme persists
5. **Accessibility Test**: Navigate with keyboard and screen reader

## Future Enhancements

- **Custom Theme Builder**: Allow users to create custom color schemes
- **Seasonal Themes**: Automatic theme switching based on time/season
- **High Contrast Mode**: Additional accessibility theme variant
- **Animation Preferences**: Respect reduced motion preferences
- **Theme Presets**: Multiple curated theme variations

This implementation provides a robust, accessible, and performant theme system that embodies the luxury and precision of the Forma design philosophy while maintaining excellent developer experience and user accessibility.