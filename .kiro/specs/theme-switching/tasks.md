# Implementation Plan: Theme Switching System

## Overview

This implementation plan breaks down the theme switching system into discrete, manageable tasks that build incrementally. Each task focuses on a specific component or functionality while maintaining the Executive Lounge aesthetic and ensuring seamless integration with existing components.

## Tasks

- [x] 1. Set up theme infrastructure and CSS custom properties
  - Create CSS custom properties for both light and dark themes
  - Update globals.css with theme-aware color variables
  - Implement smooth transition animations with reduced motion support
  - _Requirements: 1.4, 9.1, 9.2, 9.5, 10.1_

- [x] 1.1 Write property test for CSS custom properties update
  - **Property 4: CSS Custom Properties Update**
  - **Validates: Requirements 1.4, 10.1**

- [x] 2. Create theme detection and system integration
  - Implement useSystemTheme hook for OS preference detection
  - Add media query listeners for system theme changes
  - Handle graceful fallbacks when system detection fails
  - _Requirements: 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.1 Write property test for system theme detection
  - **Property 3: System Theme Detection**
  - **Validates: Requirements 1.3, 7.1, 7.3, 7.4**

- [x] 2.2 Write property test for system theme reactivity
  - **Property 10: System Theme Reactivity**
  - **Validates: Requirements 7.2, 7.5**

- [x] 3. Implement theme context and provider
  - Create ThemeContext with TypeScript interfaces
  - Implement ThemeProvider with state management
  - Add localStorage persistence with error handling
  - Integrate system theme detection
  - _Requirements: 1.1, 1.2, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3.1 Write property test for theme state management
  - **Property 1: Theme State Management**
  - **Validates: Requirements 1.1, 1.5**

- [x] 3.2 Write property test for theme persistence round trip
  - **Property 2: Theme Persistence Round Trip**
  - **Validates: Requirements 1.2, 8.1, 8.2**
  - **PBT Status**: ✅ PASSED - All 6 property tests pass with proper cleanup handling

- [x] 3.3 Write property test for persistence error handling
  - **Property 11: Persistence Error Handling**
  - **Validates: Requirements 8.3, 8.4, 8.5**
  - **PBT Status**: ✅ PASSED - All 7 property tests pass, error handling works correctly

- [x] 4. Create theme toggle component
  - Build ThemeToggle component with three options (Light, Dark, System)
  - Implement immediate theme switching on selection
  - Add visual indication of active theme
  - Ensure keyboard accessibility and screen reader compatibility
  - _Requirements: 2.2, 2.3, 2.5, 6.5_

- [x] 4.1 Write property test for theme toggle interaction
  - **Property 5: Theme Toggle Interaction**
  - **Validates: Requirements 2.3, 2.5**

- [x] 5. Integrate theme toggle into settings page
  - Add ThemeToggle component to workspace settings
  - Position appropriately within settings layout
  - Test integration with existing settings functionality
  - _Requirements: 2.1_

- [x] 5.1 Write integration test for settings page placement
  - Test that theme toggle is accessible from settings page
  - **Validates: Requirements 2.1**

- [x] 6. Update design system and color definitions
  - Define complete light and dark theme color palettes
  - Ensure warm undertones in light mode and luxury feel in dark mode
  - Implement proper contrast ratios for accessibility
  - Update ambient glow effects for both themes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6.1 Write property test for light mode color consistency
  - **Property 6: Light Mode Color Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 6.2 Write property test for dark mode color consistency
  - **Property 7: Dark Mode Color Consistency**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

- [x] 7. Checkpoint - Ensure core theme switching works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update existing UI components for theme adaptation
  - Modify glass card styles to work with both themes
  - Update button gradients for theme-appropriate colors
  - Adapt form input styles for both light and dark modes
  - Update navigation elements for theme switching
  - Ensure text elements maintain proper contrast
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.1 Write property test for component theme adaptation
  - **Property 8: Component Theme Adaptation**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 9. Implement accessibility and contrast validation
  - Ensure 4.5:1 contrast ratio for normal text in both themes
  - Ensure 3:1 contrast ratio for large text and UI elements
  - Test keyboard navigation and screen reader compatibility
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Write property test for accessibility contrast compliance
  - **Property 9: Accessibility Contrast Compliance**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - **PBT Status**: ✅ PASSED - All 8 property tests pass with proper contrast ratio validation

- [x] 10. Add smooth transitions and animations
  - Implement 300ms CSS transitions for theme changes
  - Ensure transitions don't cause layout shifts
  - Maintain ambient glow effect during transitions
  - Add prefers-reduced-motion support
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10.1 Write property test for smooth theme transitions
  - **Property 12: Smooth Theme Transitions**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 10.2 Write property test for reduced motion accessibility
  - **Property 13: Reduced Motion Accessibility**
  - **Validates: Requirements 9.5**

- [x] 11. Integrate with root layout and application
  - Wrap root layout with ThemeProvider
  - Ensure theme persistence across page navigation
  - Test theme switching on all major pages
  - _Requirements: 1.1, 1.2, 8.2_

- [x] 12. Update design system documentation
  - Update design-system.md steering file with light mode specifications
  - Document new CSS custom properties and usage patterns
  - Add examples for both light and dark theme implementations
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 12.1 Write property test for design system integration
  - **Property 14: Design System Integration**
  - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

- [x] 13. Final testing and validation
  - Test theme switching across different screen resolutions
  - Validate color contrast ratios meet accessibility standards
  - Test localStorage persistence and error handling
  - Verify system theme detection works correctly
  - Test reduced motion preferences
  - _Requirements: All requirements validation_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - **Status**: ✅ COMPLETED - All theme-related tests are passing (81/81 theme tests pass)

- [x] 15. **FIX: Update Tailwind configuration for theme integration**
- [x] 15.1 Configure Tailwind to use CSS custom properties
  - Update tailwind.config.js to reference CSS variables
  - Create theme-aware color palette
  - _Requirements: 12.1, 12.2, 12.4_

- [x] 15.2 Add theme-aware utility classes
  - Create utilities that automatically use CSS custom properties
  - Replace hardcoded color references
  - _Requirements: 12.2, 12.3_

- [x] 16. **FIX: Migrate Settings page to theme-aware styling**
- [x] 16.1 Update settings page header
  - Replace hardcoded text colors with theme-aware classes
  - _Requirements: 11.1_

- [x] 16.2 Fix page layout and spacing
  - Ensure proper visual hierarchy in both themes
  - _Requirements: 11.1_

- [x] 17. **FIX: Migrate WorkspaceSettings component**
- [x] 17.1 Replace hardcoded colors with CSS custom properties
  - Update all text, background, and border colors
  - _Requirements: 11.2_

- [x] 17.2 Fix form elements styling
  - Update form inputs, selects, and labels
  - _Requirements: 11.3_

- [x] 17.3 Fix card and dialog components
  - Update ConfirmationDialog and Card components
  - _Requirements: 11.5_

- [x] 18. **FIX: Update UI component library**
- [x] 18.1 Migrate Button component
  - Ensure buttons use theme-aware styling
  - _Requirements: 11.4_

- [x] 18.2 Migrate Input component
  - Update form input styling to use CSS variables
  - _Requirements: 11.3_

- [x] 18.3 Migrate Card components
  - Update Card, CardHeader, CardTitle, CardContent
  - _Requirements: 11.5_

- [x] 19. **FIX: Improve light theme visual hierarchy**
- [x] 19.1 Enhance glass card contrast in light mode
  - Improve backdrop-filter and border visibility
  - _Requirements: 3.3, 5.1_

- [x] 19.2 Fix ambient glow effects for light theme
  - Ensure proper glow visibility and color
  - _Requirements: 3.6_

- [x] 20. **FIX: Add comprehensive theme validation**
- [x] 20.1 Create theme consistency tests
  - Test all components in both themes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 20.2 Add visual regression prevention
  - Ensure no hardcoded colors remain
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 21. Final validation and testing
- [x] 21.1 Test complete theme switching flow
  - Verify all pages and components work in both themes
  - _Requirements: All_

- [x] 21.2 Performance and accessibility validation
  - Ensure smooth transitions and proper contrast ratios
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5_

## Notes

- All tasks are required for comprehensive theme switching implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate component adaptation and settings placement
- Focus on maintaining Executive Lounge aesthetic in both themes
- Ensure no existing functionality is broken during implementation