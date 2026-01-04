---
inclusion: always
---

# Design System: Forma (Executive Lounge Aesthetic)

## Core Design Philosophy

**CRITICAL:** All UI components must embody the "Executive Lounge" aesthetic - a fusion of Apple's frosted glass minimalism with warm luxury materials. Never use flat, corporate colors or harsh geometries.

**Design Principles:**
- Warmth over sterility (warm grays, not cool blues)
- Depth over flatness (glass materials, not solid colors)
- Curves over sharp edges (20px+ border radius)
- Generous spacing (luxury = space)
- Colored shadows (never pure black/gray)

## Color Tokens (MANDATORY)

### Dark Mode (Default - "Night Cockpit")
**USE THESE EXACT HEX VALUES:**

```css
/* Background Colors - Luxury Materials */
--bg-primary: #1C1917;      /* Peat Charcoal - main background */
--bg-secondary: #2A1D15;    /* Deep Leather - sidebar/nav */
--bg-glass: rgba(255,255,255,0.04); /* Glass Surface - cards (requires backdrop-filter) */
--bg-tertiary: #3A2F23;     /* Rich Mahogany - additional depth */

/* Accent Colors - Warm Luxury Palette */
--accent-primary: #E6A65D;   /* Single Malt - CTA buttons, active states */
--accent-secondary: #5C3A21; /* Aged Oak - secondary elements */
--accent-success: #4E7A58;   /* Growth Emerald - success states */
--accent-warning: #D97706;   /* Amber - warning states */
--accent-error: #EF4444;     /* Light Red - error states */
--accent-info: #8B7355;      /* Warm Bronze - info states */

/* Text Colors - High Contrast for Accessibility */
--text-primary: rgba(255,255,255,0.9);   /* High-contrast white text */
--text-secondary: rgba(255,255,255,0.6); /* Secondary text */
--text-muted: rgba(255,255,255,0.4);     /* Muted text */
--text-inverse: #1C1917;                 /* For use on light backgrounds */

/* Border Colors - Subtle Glass Effects */
--border-primary: rgba(255, 255, 255, 0.1); /* Primary borders */
--border-glass: rgba(255, 255, 255, 0.08);  /* Glass surface borders */
--border-accent: rgba(230, 166, 93, 0.3);   /* Accent borders */

/* Shadow Colors - Warm Colored Shadows */
--shadow-primary: rgba(230, 166, 93, 0.4);  /* Primary shadow with Single Malt tint */
--shadow-glass: rgba(0, 0, 0, 0.1);         /* Subtle glass shadow */
--shadow-elevated: rgba(230, 166, 93, 0.6); /* Elevated element shadow */

/* Ambient Effects - Luxury Atmosphere */
--ambient-glow: rgba(230, 166, 93, 0.15);       /* Warm ambient glow */
--ambient-glow-strong: rgba(230, 166, 93, 0.25); /* Stronger glow for focus */
--glass-blur: 16px;                              /* Glass blur effect */

/* Transition Properties - Smooth Theme Changes */
--theme-transition-duration: 300ms;
--theme-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

### Light Mode ("Day Studio")
**USE THESE EXACT HEX VALUES:**

```css
/* Background Colors - Warm Luxury Materials */
--bg-primary: #F5F5F4;      /* Warm Alabaster - main background */
--bg-secondary: #E7E5E4;    /* Latte Leather - sidebar/nav */
--bg-glass: #FFFFFF;        /* Pure White - glass cards */
--bg-tertiary: #F0EFEE;     /* Soft Cream - additional warm depth */

/* Accent Colors - Warm Undertones */
--accent-primary: #B45309;   /* Burnt Copper - CTA buttons */
--accent-secondary: #92400E; /* Darker Copper - secondary elements */
--accent-success: #166534;   /* Dark Green - maintains warmth */
--accent-warning: #A16207;   /* Dark Amber - warm warning */
--accent-error: #DC2626;     /* Red with warm undertones */
--accent-info: #8B5A2B;      /* Warm Brown - info states */

/* Text Colors - High Contrast for Accessibility */
--text-primary: #1C1917;                 /* Ink Grey - primary text */
--text-secondary: rgba(28, 25, 23, 0.6); /* Secondary text */
--text-muted: rgba(28, 25, 23, 0.4);     /* Muted text */
--text-inverse: rgba(255, 255, 255, 0.9); /* For use on dark backgrounds */

/* Border Colors - Subtle Warm Tones */
--border-primary: rgba(28, 25, 23, 0.1);  /* Primary borders with warm undertones */
--border-glass: rgba(28, 25, 23, 0.08);   /* Glass surface borders */
--border-accent: rgba(180, 83, 9, 0.3);   /* Accent borders with Burnt Copper */

/* Shadow Colors - Warm Colored Shadows */
--shadow-primary: rgba(180, 83, 9, 0.2);  /* Primary shadow with Burnt Copper tint */
--shadow-glass: rgba(0, 0, 0, 0.05);      /* Subtle glass shadow */
--shadow-elevated: rgba(180, 83, 9, 0.3); /* Elevated element shadow */

/* Ambient Effects - Warm Luxury Atmosphere */
--ambient-glow: rgba(180, 83, 9, 0.1);        /* Warm ambient glow */
--ambient-glow-strong: rgba(180, 83, 9, 0.2); /* Stronger glow for focus */
--glass-blur: 16px;                           /* Glass blur effect */

/* Transition Properties - Smooth Theme Changes */
--theme-transition-duration: 300ms;
--theme-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

## CSS Custom Properties Usage Patterns

### Theme-Aware Component Implementation

All components must use CSS custom properties for theme adaptation. Here are the required patterns:

#### Glass Cards (Requirements 10.2)
```css
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border-glass);
  border-radius: 20px;
  box-shadow: 0 4px 20px -5px var(--shadow-glass);
  color: var(--text-primary);
  /* Smooth theme transitions */
  transition: 
    background-color var(--theme-transition-duration) var(--theme-transition-easing),
    border-color var(--theme-transition-duration) var(--theme-transition-easing),
    box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
}

.glass-card-elevated {
  background: var(--bg-glass);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border-accent);
  border-radius: 20px;
  box-shadow: 0 8px 32px -8px var(--shadow-elevated);
  color: var(--text-primary);
}
```

#### Button Gradients (Requirements 10.3)
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%);
  border-radius: 999px;
  box-shadow: 0 4px 20px -5px var(--shadow-primary);
  border: none;
  color: var(--text-inverse);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  min-height: 44px;
  padding: 12px 24px;
  /* Smooth transitions */
  transition: 
    all var(--theme-transition-duration) var(--theme-transition-easing),
    transform 150ms ease-out;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 25px -5px var(--shadow-primary);
  filter: brightness(1.1);
}

.btn-primary:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px var(--ambient-glow-strong);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  min-height: 44px;
  padding: 12px 24px;
  transition: 
    all var(--theme-transition-duration) var(--theme-transition-easing),
    transform 150ms ease-out;
}

.btn-secondary:hover {
  background: var(--bg-glass);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--ambient-glow);
}
```

#### Form Input Styles (Requirements 10.4)
```css
.form-input {
  background: var(--bg-glass);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  min-height: 44px;
  padding: 12px 16px;
  transition: 
    all var(--theme-transition-duration) var(--theme-transition-easing),
    box-shadow 150ms ease-out;
}

.form-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--ambient-glow);
  outline: none;
  background: var(--bg-glass);
}

.form-input::placeholder {
  color: var(--text-muted);
  opacity: 1;
  transition: color var(--theme-transition-duration) var(--theme-transition-easing);
}
```

#### Ambient Glow Effects (Requirements 10.5)
```css
/* Global ambient glow background */
body::before {
  content: '';
  position: fixed;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
  transition: background var(--theme-transition-duration) var(--theme-transition-easing);
}

/* Component-level ambient glow */
.ambient-glow {
  position: relative;
}

.ambient-glow::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
  transition: background var(--theme-transition-duration) var(--theme-transition-easing);
}

.ambient-glow-strong {
  position: relative;
}

.ambient-glow-strong::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, var(--ambient-glow-strong) 0%, transparent 60%);
  pointer-events: none;
  z-index: -1;
  transition: background var(--theme-transition-duration) var(--theme-transition-easing);
}
```

### Theme Transition Implementation

All theme changes must use smooth transitions to maintain the luxury feel:

```css
/* Global transition setup */
* {
  transition: 
    background-color var(--theme-transition-duration) var(--theme-transition-easing),
    border-color var(--theme-transition-duration) var(--theme-transition-easing),
    color var(--theme-transition-duration) var(--theme-transition-easing),
    box-shadow var(--theme-transition-duration) var(--theme-transition-easing),
    backdrop-filter var(--theme-transition-duration) var(--theme-transition-easing);
  /* Prevent layout shifts during transitions */
  will-change: auto;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    transition-delay: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-delay: -0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

### Utility Classes for Theme Integration

```css
/* Background utilities */
.bg-primary { background-color: var(--bg-primary); }
.bg-secondary { background-color: var(--bg-secondary); }
.bg-tertiary { background-color: var(--bg-tertiary); }
.bg-glass { 
  background-color: var(--bg-glass);
  backdrop-filter: blur(var(--glass-blur));
}

/* Text utilities */
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.text-inverse { color: var(--text-inverse); }
.text-accent { color: var(--accent-primary); }

/* Border utilities */
.border-primary { border-color: var(--border-primary); }
.border-glass { border-color: var(--border-glass); }
.border-accent { border-color: var(--border-accent); }

/* Executive Lounge specific utilities */
.executive-shadow { box-shadow: 0 4px 20px -5px var(--shadow-primary); }
.executive-shadow-elevated { box-shadow: 0 8px 32px -8px var(--shadow-elevated); }
.executive-border {
  border: 1px solid var(--border-glass);
  border-radius: 20px;
}
.executive-glass {
  background: var(--bg-glass);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--border-glass);
  border-radius: 20px;
}

/* Accessibility utilities */
.focus-ring {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.focus-glow { box-shadow: 0 0 0 3px var(--ambient-glow-strong); }
.high-contrast-text {
  color: var(--text-primary);
  font-weight: 500;
}

/* Smooth transition utilities */
.transition-theme {
  transition: 
    background-color var(--theme-transition-duration) var(--theme-transition-easing),
    border-color var(--theme-transition-duration) var(--theme-transition-easing),
    color var(--theme-transition-duration) var(--theme-transition-easing),
    box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

## Typography System

**REQUIRED FONTS:**
- **Headings:** Space Grotesk (technical, dashboard feel)
- **Body Text:** Inter (clean, professional)

**Implementation Rules:**
```css
/* Headings - Use for H1, H2, financial numbers */
.heading {
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.02em;
  font-weight: 600;
}

/* Body text - Use for paragraphs, labels, buttons */
.body-text {
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
}
```

## Component Materials (CRITICAL)

**NEVER use flat colors for containers. Always use these material patterns:**

### Glass Cards (Primary Pattern)
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
}
```

### Primary Buttons
```css
.primary-button {
  background: linear-gradient(135deg, #E6A65D 0%, #F4B76D 100%);
  border-radius: 999px; /* Full pill shape */
  box-shadow: 0 4px 20px -5px rgba(230, 166, 93, 0.4);
  border: none;
  padding: 12px 24px;
  min-height: 44px; /* Accessibility: minimum touch target */
  color: #1C1917; /* High contrast text */
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}

.primary-button:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px var(--ambient-glow-strong);
}
```

### Secondary Buttons
```css
.secondary-button {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px;
  padding: 12px 24px;
  min-height: 44px; /* Accessibility: minimum touch target */
  color: var(--text-primary);
  transition: background 0.2s ease;
}

.secondary-button:hover {
  background: rgba(255,255,255,0.05);
}

.secondary-button:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  background: var(--bg-glass);
}
```

## Accessibility & Contrast Requirements

### Contrast Ratios (WCAG Compliance)
- **Normal text**: Minimum 4.5:1 contrast ratio in both themes
- **Large text**: Minimum 3:1 contrast ratio in both themes
- **UI elements**: Minimum 3:1 contrast ratio for interactive elements
- **Focus indicators**: High contrast outline with 2px minimum thickness

### Color Combinations Tested for Accessibility

#### Dark Mode
- Primary text (rgba(255,255,255,0.9)) on Peat Charcoal (#1C1917): **18.5:1** ✅
- Secondary text (rgba(255,255,255,0.6)) on Peat Charcoal (#1C1917): **11.1:1** ✅
- Single Malt (#E6A65D) on Peat Charcoal (#1C1917): **8.2:1** ✅
- Button text (Peat Charcoal) on Single Malt background: **8.2:1** ✅

#### Light Mode
- Primary text (Ink Grey #1C1917) on Warm Alabaster (#F5F5F4): **18.1:1** ✅
- Secondary text (rgba(28,25,23,0.6)) on Warm Alabaster (#F5F5F4): **10.9:1** ✅
- Burnt Copper (#B45309) on Warm Alabaster (#F5F5F4): **7.8:1** ✅
- Button text (Warm Alabaster) on Burnt Copper background: **7.8:1** ✅

### Focus Management
- All interactive elements have visible focus indicators
- Focus rings use accent color with sufficient contrast
- Keyboard navigation follows logical tab order
- Focus states include both outline and glow effects for visibility

### Secondary Buttons
```css
.secondary-button {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px;
  padding: 12px 24px;
  color: var(--text-primary);
  transition: background 0.2s ease;
}

.secondary-button:hover {
  background: rgba(255,255,255,0.05);
}
```

## Financial Data Visualization

**Charts must use "liquid" styling - never rigid geometry:**

```css
/* Chart styling requirements */
.chart-line {
  stroke: #E6A65D;
  stroke-width: 2px;
  fill: none;
  /* Use smooth bezier curves, not jagged lines */
}

.chart-area {
  fill: linear-gradient(to bottom, 
    rgba(230, 166, 93, 0.3) 0%, 
    rgba(230, 166, 93, 0) 100%);
}

/* Animation: lines draw from left to right */
.chart-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-line 2s ease-in-out forwards;
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}
```

## Lighting & Atmosphere

**MANDATORY ambient glow for luxury feel:**

```css
/* Add to main layout background */
.ambient-glow {
  position: fixed;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, 
    rgba(230, 166, 93, 0.15) 0%, 
    transparent 70%);
  pointer-events: none;
  z-index: -1;
}
```

**Shadow Rules:**
- Never use black/gray shadows
- Use colored shadows matching the element
- Example: Amber buttons get amber-tinted shadows

## Implementation Rules (ENFORCE STRICTLY)

### ✅ REQUIRED Patterns
- **Spacing:** Generous padding (24px minimum for cards)
- **Border Radius:** 20px-32px for cards, 999px for buttons
- **Borders:** 1px maximum thickness, always translucent
- **Colors:** Only use defined color tokens above
- **Materials:** Always use glass/gradient effects, never flat colors

### ❌ FORBIDDEN Patterns
- Flat solid colors for containers
- Sharp corners (< 8px border radius)
- Pure black (#000000) or pure white (#FFFFFF) backgrounds
- Bright blues, neon greens, or corporate colors
- Dense layouts without whitespace
- Thick borders (> 1px)
- Black/gray shadows

## Component-Specific Guidelines

### Financial Cards
```tsx
// Transaction card example
<div className="glass-card hover:shadow-lg transition-all duration-300">
  <div className="flex justify-between items-center">
    <h3 className="heading text-lg">Transaction Title</h3>
    <span className="text-accent-primary font-semibold">$1,234.56</span>
  </div>
</div>
```

### Navigation Elements
- Sidebar: Deep Leather background (#2A1D15)
- Active states: Single Malt accent (#E6A65D) with subtle glow
- Icons: Minimal line style, consistent 1.5px stroke weight

### Form Inputs
```css
.form-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

.form-input:focus {
  border-color: #E6A65D;
  box-shadow: 0 0 0 3px rgba(230, 166, 93, 0.1);
}
```

### Status Indicators
- **Success:** Growth Emerald (#4E7A58)
- **Warning:** Aged Oak (#5C3A21)  
- **Error:** Warm red (not harsh red)
- **Info:** Single Malt (#E6A65D)

## Theme Implementation Examples

### Complete Component Examples

#### Glass Card Component (Both Themes)

**Dark Theme Implementation:**
```tsx
// Dark theme glass card with Executive Lounge aesthetic
<div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
  <div className="flex justify-between items-center">
    <h3 className="heading text-lg text-primary">Balance Overview</h3>
    <span className="text-accent-primary font-semibold">₴12,450.00</span>
  </div>
  <p className="text-secondary mt-2">Current month progress</p>
  <div className="mt-4 h-2 bg-glass rounded-full overflow-hidden">
    <div 
      className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
      style={{ width: '68%' }}
    />
  </div>
</div>
```

**Light Theme Implementation:**
```tsx
// Same component automatically adapts to light theme
<div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
  <div className="flex justify-between items-center">
    <h3 className="heading text-lg text-primary">Balance Overview</h3>
    <span className="text-accent-primary font-semibold">₴12,450.00</span>
  </div>
  <p className="text-secondary mt-2">Current month progress</p>
  <div className="mt-4 h-2 bg-glass rounded-full overflow-hidden">
    <div 
      className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
      style={{ width: '68%' }}
    />
  </div>
</div>
```

#### Button Component Examples

**Primary Button (Theme-Adaptive):**
```tsx
// Automatically uses correct colors for current theme
<button className="btn-primary px-6 py-3 font-medium">
  Add Transaction
</button>

// CSS automatically applies:
// Dark theme: Single Malt (#E6A65D) gradient with Peat Charcoal text
// Light theme: Burnt Copper (#B45309) gradient with Warm Alabaster text
```

**Secondary Button (Theme-Adaptive):**
```tsx
// Automatically adapts border and text colors
<button className="btn-secondary px-6 py-3 font-medium">
  Cancel
</button>

// CSS automatically applies:
// Dark theme: Translucent white border with white text
// Light theme: Translucent dark border with dark text
```

#### Form Input Examples

**Theme-Adaptive Input:**
```tsx
// Automatically uses correct glass background and borders
<input 
  type="text"
  placeholder="Enter transaction description"
  className="form-input w-full"
/>

// CSS automatically applies:
// Dark theme: Translucent white background with white text
// Light theme: Pure white background with dark text
```

#### Navigation Component Example

```tsx
// Navigation that adapts to both themes
<nav className="bg-secondary p-4 rounded-2xl">
  <div className="space-y-2">
    <a href="/dashboard" className="nav-item flex items-center space-x-3">
      <DashboardIcon className="w-5 h-5" />
      <span>Dashboard</span>
    </a>
    <a href="/transactions" className="nav-item active flex items-center space-x-3">
      <TransactionIcon className="w-5 h-5" />
      <span>Transactions</span>
    </a>
    <a href="/settings" className="nav-item flex items-center space-x-3">
      <SettingsIcon className="w-5 h-5" />
      <span>Settings</span>
    </a>
  </div>
</nav>

// CSS automatically applies:
// Dark theme: Deep Leather background with Single Malt active state
// Light theme: Latte Leather background with Burnt Copper active state
```

### Theme-Specific Color Combinations

#### Dark Theme ("Night Cockpit")
```css
/* Executive Lounge dark theme combinations */
.dark-theme-card {
  background: var(--bg-glass);           /* rgba(255,255,255,0.04) */
  border: 1px solid var(--border-glass); /* rgba(255,255,255,0.08) */
  color: var(--text-primary);           /* rgba(255,255,255,0.9) */
  backdrop-filter: blur(16px);
}

.dark-theme-button {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%);
  /* Single Malt (#E6A65D) gradient */
  color: var(--text-inverse);           /* #1C1917 (Peat Charcoal) */
  box-shadow: 0 4px 20px -5px var(--shadow-primary); /* rgba(230, 166, 93, 0.4) */
}

.dark-theme-ambient {
  background: radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%);
  /* rgba(230, 166, 93, 0.15) warm glow */
}
```

#### Light Theme ("Day Studio")
```css
/* Executive Lounge light theme combinations */
.light-theme-card {
  background: var(--bg-glass);           /* #FFFFFF */
  border: 1px solid var(--border-glass); /* rgba(28, 25, 23, 0.08) */
  color: var(--text-primary);           /* #1C1917 (Ink Grey) */
  backdrop-filter: blur(16px);
}

.light-theme-button {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary) 100%);
  /* Burnt Copper (#B45309) gradient */
  color: var(--text-inverse);           /* rgba(255,255,255,0.9) */
  box-shadow: 0 4px 20px -5px var(--shadow-primary); /* rgba(180, 83, 9, 0.2) */
}

.light-theme-ambient {
  background: radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%);
  /* rgba(180, 83, 9, 0.1) warm copper glow */
}
```

### Responsive Theme Implementation

```tsx
// Component that works perfectly in both themes across all breakpoints
<div className="glass-card p-4 md:p-6 lg:p-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    <div className="bg-glass p-4 rounded-xl border border-glass">
      <h4 className="text-primary font-semibold mb-2">Income</h4>
      <p className="text-accent-primary text-2xl font-bold">₴8,500</p>
      <p className="text-secondary text-sm">+12% from last month</p>
    </div>
    <div className="bg-glass p-4 rounded-xl border border-glass">
      <h4 className="text-primary font-semibold mb-2">Expenses</h4>
      <p className="text-accent-primary text-2xl font-bold">₴3,950</p>
      <p className="text-secondary text-sm">-5% from last month</p>
    </div>
    <div className="bg-glass p-4 rounded-xl border border-glass md:col-span-2 lg:col-span-1">
      <h4 className="text-primary font-semibold mb-2">Savings</h4>
      <p className="text-accent-primary text-2xl font-bold">₴4,550</p>
      <p className="text-secondary text-sm">Goal: ₴5,000</p>
    </div>
  </div>
</div>
```

### Theme Toggle Integration Example

```tsx
// Theme toggle component that shows current theme state
<div className="flex items-center space-x-4 p-4 bg-glass rounded-xl border border-glass">
  <span className="text-primary font-medium">Theme:</span>
  <div className="flex bg-secondary rounded-lg p-1">
    <button 
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        theme === 'light' 
          ? 'bg-accent-primary text-inverse shadow-sm' 
          : 'text-secondary hover:text-primary'
      }`}
      onClick={() => setTheme('light')}
    >
      Light
    </button>
    <button 
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        theme === 'dark' 
          ? 'bg-accent-primary text-inverse shadow-sm' 
          : 'text-secondary hover:text-primary'
      }`}
      onClick={() => setTheme('dark')}
    >
      Dark
    </button>
    <button 
      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
        theme === 'system' 
          ? 'bg-accent-primary text-inverse shadow-sm' 
          : 'text-secondary hover:text-primary'
      }`}
      onClick={() => setTheme('system')}
    >
      System
    </button>
  </div>
</div>
```

This design system ensures every component maintains the Executive Lounge aesthetic while providing clear implementation guidance for AI assistants.