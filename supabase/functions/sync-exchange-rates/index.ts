/**
 * Edge Function to sync exchange rates from NBU API
 * Runs daily to cache current exchange rates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN']
const NBU_BASE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange'

interface NBURate {
  r030: number
  txt: string
  rate: number
  cc: string
  exchangedate: string
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const today = new Date()
    const rates = []
    
    console.log(`Starting exchange rate sync for ${today.toISOString()}`)
    
    // Fetch rates for each supported currency
    for (const currency of CURRENCIES) {
      try {
        console.log(`Fetching rate for ${currency}`)
        
        const response = await fetch(
          `${NBU_BASE_URL}?valcode=${currency}&json`,
          { 
            headers: { 'User-Agent': 'Forma-App/1.0' },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        )
        
        if (!response.ok) {
          console.error(`NBU API error for ${currency}: ${response.status}`)
          continue
        }
        
        const data: NBURate[] = await response.json()
        
        if (data[0]?.rate) {
          rates.push({
            currency,
            date: today.toISOString().split('T')[0],
            rate: data[0].rate,
            fetched_at: new Date().toISOString()
          })
          console.log(`Successfully fetched rate for ${currency}: ${data[0].rate}`)
        } else {
          console.warn(`No rate data for ${currency}`)
        }
      } catch (error) {
        console.error(`Failed to fetch rate for ${currency}:`, error)
      }
    }
    
    if (rates.length === 0) {
      console.error('No rates were successfully fetched')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No rates fetched',
          rates: 0 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Upsert rates to database
    console.log(`Upserting ${rates.length} rates to database`)
    
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(rates, { 
        onConflict: 'currency,date',
        ignoreDuplicates: false 
      })
    
    if (error) {
      console.error('Database upsert error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          rates: rates.length 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log(`Successfully synced ${rates.length} exchange rates`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        rates: rates.length,
        currencies: rates.map(r => `${r.currency}: ${r.rate}`),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Sync exchange rates error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        rates: 0 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* 
To deploy this function:
supabase functions deploy sync-exchange-rates

To test locally:
supabase functions serve sync-exchange-rates

To invoke manually:
curl -X POST https://your-project.supabase.co/functions/v1/sync-exchange-rates \
  -H "Authorization: Bearer YOUR_ANON_KEY"

To set up daily cron job, add to your deployment:
- Use GitHub Actions with cron schedule
- Use Vercel Cron Jobs
- Use external cron service to call the function
*/