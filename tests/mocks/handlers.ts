import { http, HttpResponse } from 'msw'

/**
 * MSW handlers for mocking API responses in tests
 * Following testing.md patterns
 */

export const handlers = [
  // NBU API mock
  http.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange', ({ request }) => {
    const url = new URL(request.url)
    const currency = url.searchParams.get('valcode')
    
    return HttpResponse.json([
      {
        r030: 840,
        txt: 'Долар США',
        rate: 41.25,
        cc: currency || 'USD',
        exchangedate: '15.12.2024'
      }
    ])
  }),

  // Supabase auth mock
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z'
    })
  }),
]