# Design System: Forma (Project VZ)

**Version:** 1.0  
**Aesthetic Core:** "The Executive Lounge" / "Digital Ambient"

## 1. Design Philosophy

The UI is not just a tool; it is a **prolongation of the physical workspace**. It bridges the gap between the tactile world (leather, wood, plants, warm light) and the digital world (precision, glass, fluid data).

* **The Vibe:** Sitting in a Cupra Formentor VZ at night, parked outside a high-end whiskey bar.
* **The Approach:** Apple's frosted glass minimalism meets the warmth of aged saddle leather.
* **The feeling:** "Distilled Control."

---

## 2. Color System

### A. Dark Mode (The "Night Cockpit")
*Default State. Designed to reduce eye strain and merge seamlessly with a dark room environment.*

| Token Name | Hex Code | Usage | Visual Rationale |
| :--- | :--- | :--- | :--- |
| **Peat Charcoal** | `#1C1917` | Main Background | Softer than pure black. Mimics the matte dashboard of a luxury car. |
| **Deep Leather** | `#2A1D15` | Sidebar / Nav | Connects to the physical desk mat. Adds grounding. |
| **Single Malt** | `#E6A65D` | **Primary Accent** | Used for CTA buttons, active states, and "profit" highlights. Like backlit liquid gold. |
| **Aged Oak** | `#5C3A21` | Secondary Accent | Used for less urgent tags or background shapes. |
| **Growth Emerald**| `#4E7A58` | Success / Data | A natural, leafy green (not neon). Connects to the office plants. |
| **Glass Surface** | `rgba(255,255,255, 0.04)` | Card Backgrounds | **Requires `backdrop-filter: blur(20px)`**. Creates depth. |

### B. Light Mode (The "Day Studio")
*Secondary State. Designed for high-contrast visibility while maintaining the "warm luxury" signature. No harsh blue-whites.*

| Token Name | Hex Code | Usage | Visual Rationale |
| :--- | :--- | :--- | :--- |
| **Warm Alabaster**| `#F5F5F4` | Main Background | A "Stone" white. Feels like heavy stationery paper, not a lightbulb. |
| **Latte Leather** | `#E7E5E4` | Secondary/Sidebar | A subtle shift from the background to define structure without borders. |
| **Burnt Copper** | `#B45309` | **Primary Accent** | A darker, richer version of the "Single Malt" to stand out against light backgrounds. |
| **Ink Grey** | `#1C1917` | Primary Text | High contrast but softer than `#000000`. |
| **Pure White** | `#FFFFFF` | Card Surfaces | Used with a warm drop shadow (see "Shadows"). |

---

## 3. Typography

We mix technical precision with human readability.

### Primary Headings: **Space Grotesk**
* **Why:** It has a "dashboard" technical feel. It looks like the speedometer font in a modern EV.
* **Usage:** H1, H2, Big Numbers (Net Worth).
* **Tracking:** Tight (`-0.02em`) for a compact, modern look.

### Body Text: **Inter** (or San Francisco)
* **Why:** The standard for "Apple Minimalism." Invisible, highly legible, professional.
* **Usage:** Paragraphs, labels, button text, lists.

---

## 4. UI Components & Materials

### The "Glass & Leather" Hierarchy
Do not use flat colors for containers. Use **Materials**.

1. **Level 1 (Background):** Matte `Peat Charcoal`.
2. **Level 2 (Sidebar/Static):** Subtle `Deep Leather` gradient. It implies texture without being skeuomorphic.
3. **Level 3 (Content Cards):** **Frosted Glass**.
   * *CSS:* `background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08);`
   * *Effect:* The background colors should bleed through slightly.

### Buttons & Actions
* **Primary Button:**
  * Background: Linear Gradient (`Single Malt` to a slightly lighter Gold).
  * Shape: Fully rounded pills (`border-radius: 999px`).
  * Glow: `box-shadow: 0 4px 20px -5px rgba(230, 166, 93, 0.4)`.

* **Secondary Button:**
  * Background: Transparent.
  * Border: 1px solid `rgba(255,255,255,0.1)`.
  * Hover: Background fills with `White/5%`.

### Data Visualization (The "Liquid" Charts)
Charts should look like flowing liquid, not rigid geometry.

* **Line Style:** Bezier curves (smooth), not jagged.
* **Fill:** Vertical Gradient.
  * *Top:* `Single Malt` (100% opacity).
  * *Bottom:* Transparent (0% opacity).
* **Animation:** Lines should "draw" themselves slowly from left to right.

---

## 5. Lighting & Atmosphere (Crucial)

To achieve the "Prolongation of Desktop" feel, lighting is more important than layout.

* **The Ambient Glow:**
  * Place a large, highly blurred radial gradient (`radial-gradient`) in the top-right corner of the screen.
  * *Color:* `rgba(230, 166, 93, 0.15)` (Amber).
  * *Concept:* This mimics the desk lamp casting light onto the screen.

* **Shadows:**
  * Do not use black shadows. Use **colored shadows**.
  * Example: A copper button should cast a copper-tinted shadow, not a grey one.

---

## 6. Implementation Guidelines for Components

### Card Components
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
}
```

### Primary Button
```css
.primary-button {
  background: linear-gradient(135deg, #E6A65D 0%, #F4B76D 100%);
  border-radius: 999px;
  box-shadow: 0 4px 20px -5px rgba(230, 166, 93, 0.4);
  border: none;
  padding: 12px 24px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #1C1917;
}
```

### Typography Classes
```css
.heading-primary {
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.02em;
  font-weight: 600;
}

.body-text {
  font-family: 'Inter', sans-serif;
  color: rgba(255, 255, 255, 0.9);
}
```

---

## 7. Do's and Don'ts for Implementation

| ✅ DO | ❌ DON'T |
| :--- | :--- |
| **DO** use generous whitespace (padding) inside cards. Luxury = Space. | **DON'T** pack information densely like an Excel sheet. |
| **DO** use warm greys and browns instead of true black (`#000`). | **DON'T** use default bright blues or neon greens. |
| **DO** make borders extremely thin (1px) and translucent. | **DON'T** use thick, solid borders. |
| **DO** add subtle noise/grain texture to the darkest backgrounds (Leather feel). | **DON'T** use literal photos of leather textures (too old school). |
| **DO** round corners significantly (`20px` to `32px`) for cards. | **DON'T** use sharp, square corners (too aggressive). |

---

## 8. Component Hierarchy for Personal Finance App

### Financial Data Display
* **Net Worth:** Large heading with `Space Grotesk`, `Single Malt` color
* **Transaction Cards:** Glass surface with subtle glow on hover
* **Budget Progress:** Liquid-style progress bars with gradient fills
* **Charts:** Smooth bezier curves with amber gradients

### Navigation
* **Sidebar:** `Deep Leather` background with glass card overlays
* **Active States:** `Single Malt` accent with subtle glow
* **Icons:** Minimal line icons with consistent stroke weight

### Forms & Inputs
* **Input Fields:** Glass surface with focused amber border
* **Labels:** `Inter` font with reduced opacity
* **Validation:** `Growth Emerald` for success, warm red for errors

This design system ensures every component maintains the "Executive Lounge" aesthetic while providing excellent usability for financial data management.