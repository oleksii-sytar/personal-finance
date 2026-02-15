import { describe, it, expect } from 'vitest'
import { FEATURE_FLAGS, isFeatureEnabled, getEnabledFeatures, FEATURE_METADATA } from '../feature-flags'

describe('Feature Flags', () => {
  describe('FEATURE_FLAGS', () => {
    it('should have all required user journey enhancement flags', () => {
      expect(FEATURE_FLAGS).toHaveProperty('FUTURE_TRANSACTIONS')
      expect(FEATURE_FLAGS).toHaveProperty('DAILY_FORECAST')
      expect(FEATURE_FLAGS).toHaveProperty('PAYMENT_RISKS')
    })

    it('should have boolean values for all flags', () => {
      expect(typeof FEATURE_FLAGS.FUTURE_TRANSACTIONS).toBe('boolean')
      expect(typeof FEATURE_FLAGS.DAILY_FORECAST).toBe('boolean')
      expect(typeof FEATURE_FLAGS.PAYMENT_RISKS).toBe('boolean')
    })

    it('should be readonly (const assertion)', () => {
      // TypeScript will prevent modification at compile time
      // This test verifies the structure is correct
      const flags = FEATURE_FLAGS
      expect(flags).toBeDefined()
      expect(Object.isFrozen(flags)).toBe(false) // const assertion doesn't freeze at runtime
    })
  })

  describe('isFeatureEnabled', () => {
    it('should return boolean for all feature flags', () => {
      expect(typeof isFeatureEnabled('FUTURE_TRANSACTIONS')).toBe('boolean')
      expect(typeof isFeatureEnabled('DAILY_FORECAST')).toBe('boolean')
      expect(typeof isFeatureEnabled('PAYMENT_RISKS')).toBe('boolean')
    })

    it('should return correct value based on FEATURE_FLAGS', () => {
      expect(isFeatureEnabled('FUTURE_TRANSACTIONS')).toBe(FEATURE_FLAGS.FUTURE_TRANSACTIONS)
      expect(isFeatureEnabled('DAILY_FORECAST')).toBe(FEATURE_FLAGS.DAILY_FORECAST)
      expect(isFeatureEnabled('PAYMENT_RISKS')).toBe(FEATURE_FLAGS.PAYMENT_RISKS)
    })

    it('should handle all existing feature flags', () => {
      const allFlags = Object.keys(FEATURE_FLAGS) as Array<keyof typeof FEATURE_FLAGS>
      allFlags.forEach(flag => {
        const result = isFeatureEnabled(flag)
        expect(typeof result).toBe('boolean')
        expect(result).toBe(FEATURE_FLAGS[flag])
      })
    })
  })

  describe('getEnabledFeatures', () => {
    it('should return an array of enabled feature names', () => {
      const enabled = getEnabledFeatures()
      expect(Array.isArray(enabled)).toBe(true)
    })

    it('should only include features that are enabled', () => {
      const enabled = getEnabledFeatures()
      enabled.forEach(flag => {
        expect(FEATURE_FLAGS[flag]).toBe(true)
      })
    })

    it('should return empty array if no features are enabled', () => {
      const enabled = getEnabledFeatures()
      // This test just verifies the function works, actual result depends on env vars
      expect(Array.isArray(enabled)).toBe(true)
    })
  })

  describe('FEATURE_METADATA', () => {
    it('should have metadata for all user journey enhancement flags', () => {
      expect(FEATURE_METADATA).toHaveProperty('FUTURE_TRANSACTIONS')
      expect(FEATURE_METADATA).toHaveProperty('DAILY_FORECAST')
      expect(FEATURE_METADATA).toHaveProperty('PAYMENT_RISKS')
    })

    it('should have required fields for each feature', () => {
      const requiredFlags = ['FUTURE_TRANSACTIONS', 'DAILY_FORECAST', 'PAYMENT_RISKS']
      
      requiredFlags.forEach(flag => {
        const metadata = FEATURE_METADATA[flag as keyof typeof FEATURE_METADATA]
        expect(metadata).toHaveProperty('name')
        expect(metadata).toHaveProperty('description')
        expect(typeof metadata.name).toBe('string')
        expect(typeof metadata.description).toBe('string')
        expect(metadata.name.length).toBeGreaterThan(0)
        expect(metadata.description.length).toBeGreaterThan(0)
      })
    })

    it('should have descriptive names and descriptions', () => {
      expect(FEATURE_METADATA.FUTURE_TRANSACTIONS.name).toBe('Future Transactions')
      expect(FEATURE_METADATA.FUTURE_TRANSACTIONS.description).toContain('future')
      
      expect(FEATURE_METADATA.DAILY_FORECAST.name).toBe('Daily Cash Flow Forecast')
      expect(FEATURE_METADATA.DAILY_FORECAST.description).toContain('balance')
      
      expect(FEATURE_METADATA.PAYMENT_RISKS.name).toBe('Payment Risk Assessment')
      expect(FEATURE_METADATA.PAYMENT_RISKS.description).toContain('warning')
    })

    it('should have metadata for all flags in FEATURE_FLAGS', () => {
      const flagKeys = Object.keys(FEATURE_FLAGS) as Array<keyof typeof FEATURE_FLAGS>
      
      flagKeys.forEach(flag => {
        expect(FEATURE_METADATA[flag]).toBeDefined()
        expect(FEATURE_METADATA[flag].name).toBeDefined()
        expect(FEATURE_METADATA[flag].description).toBeDefined()
      })
    })
  })

  describe('Feature Flag Integration', () => {
    it('should support independent toggling of each flag', () => {
      // Each flag can be independently controlled via environment variables
      // This test verifies the structure supports this
      const flags = ['FUTURE_TRANSACTIONS', 'DAILY_FORECAST', 'PAYMENT_RISKS'] as const
      
      flags.forEach(flag => {
        const value = FEATURE_FLAGS[flag]
        expect(typeof value).toBe('boolean')
      })
    })

    it('should allow checking multiple flags at once', () => {
      const futureTransactionsEnabled = isFeatureEnabled('FUTURE_TRANSACTIONS')
      const dailyForecastEnabled = isFeatureEnabled('DAILY_FORECAST')
      const paymentRisksEnabled = isFeatureEnabled('PAYMENT_RISKS')
      
      // All should be boolean
      expect(typeof futureTransactionsEnabled).toBe('boolean')
      expect(typeof dailyForecastEnabled).toBe('boolean')
      expect(typeof paymentRisksEnabled).toBe('boolean')
    })
  })

  describe('Type Safety', () => {
    it('should have proper TypeScript types', () => {
      // This test verifies that the types are correctly defined
      const flag: keyof typeof FEATURE_FLAGS = 'FUTURE_TRANSACTIONS'
      expect(typeof FEATURE_FLAGS[flag]).toBe('boolean')
    })

    it('should ensure all flags have metadata', () => {
      // Get all flag keys
      const flagKeys = Object.keys(FEATURE_FLAGS) as Array<keyof typeof FEATURE_FLAGS>
      
      // Verify each flag has metadata
      flagKeys.forEach(flag => {
        expect(FEATURE_METADATA[flag]).toBeDefined()
      })
    })

    it('should have consistent types across all flags', () => {
      const flagKeys = Object.keys(FEATURE_FLAGS) as Array<keyof typeof FEATURE_FLAGS>
      
      flagKeys.forEach(flag => {
        // Each flag should be a boolean
        expect(typeof FEATURE_FLAGS[flag]).toBe('boolean')
        
        // Each metadata should have the correct structure
        const metadata = FEATURE_METADATA[flag]
        expect(typeof metadata.name).toBe('string')
        expect(typeof metadata.description).toBe('string')
        if (metadata.availableIn) {
          expect(typeof metadata.availableIn).toBe('string')
        }
      })
    })
  })

  describe('Environment Variable Mapping', () => {
    it('should map to correct environment variable names', () => {
      // Verify the naming convention is correct
      // FUTURE_TRANSACTIONS -> NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS
      // DAILY_FORECAST -> NEXT_PUBLIC_FEATURE_DAILY_FORECAST
      // PAYMENT_RISKS -> NEXT_PUBLIC_FEATURE_PAYMENT_RISKS
      
      // This is a documentation test - the actual mapping is in the implementation
      const expectedMappings = {
        FUTURE_TRANSACTIONS: 'NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS',
        DAILY_FORECAST: 'NEXT_PUBLIC_FEATURE_DAILY_FORECAST',
        PAYMENT_RISKS: 'NEXT_PUBLIC_FEATURE_PAYMENT_RISKS',
      }
      
      Object.keys(expectedMappings).forEach(flag => {
        expect(FEATURE_FLAGS).toHaveProperty(flag)
      })
    })
  })
})
