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
/* Background Colors */
--bg-primary: #1C1917;      /* Peat Charcoal - main background */
--bg-secondary: #2A1D15;    /* Deep Leather - sidebar/nav */
--bg-glass: rgba(255,255,255,0.04); /* Glass Surface - cards (requires backdrop-filter) */

/* Accent Colors */
--accent-primary: #E6A65D;   /* Single Malt - CTA buttons, active states */
--accent-secondary: #5C3A21; /* Aged Oak - secondary elements */
--success: #4E7A58;          /* Growth Emerald - success states */

/* Text Colors */
--text-primary: rgba(255,255,255,0.9);
--text-secondary: rgba(255,255,255,0.6);
```

### Light Mode ("Day Studio")
```css
/* Background Colors */
--bg-primary: #F5F5F4;      /* Warm Alabaster */
--bg-secondary: #E7E5E4;    /* Latte Leather */
--bg-glass: #FFFFFF;        /* Pure White cards */

/* Accent Colors */
--accent-primary: #B45309;   /* Burnt Copper */
--text-primary: #1C1917;    /* Ink Grey */
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
  color: #1C1917;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}
```

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

This design system ensures every component maintains the Executive Lounge aesthetic while providing clear implementation guidance for AI assistants.