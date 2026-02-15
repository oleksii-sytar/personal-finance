# Forecast Monitoring System

## Overview

The monitoring system provides comprehensive logging, performance tracking, and error monitoring for forecast calculations. It helps identify issues, optimize performance, and ensure system reliability.

## Components

### 1. Logger (`src/lib/monitoring/logger.ts`)

Structured logging with different severity levels.

**Features:**
- JSON-formatted logs for easy parsing
- Multiple log levels: debug, info, warn, error
- Contextual information support
- Error stack trace capture
- Development vs production modes

**Usage:**
```typescript
import { logger } from '@/lib/monitoring'

// Info logging
logger.info('Forecast calculated', {
  workspaceId: 'abc123',
  forecastDays: 30,
  confidence: 'high'
})

// Warning logging
logger.warn('Low cache hit rate', {
  hitRate: 45,
  threshold: 50
})

// Error logging
logger.error('Forecast calculation failed', error, {
  workspaceId: 'abc123',
  operation: 'calculateDailyForecast'
})
```

### 2. Performance Tracker (`src/lib/monitoring/performance-tracker.ts`)

Tracks execution time and performance metrics.

**Features:**
- Automatic duration calculation
- Performance thresholds (warns if >2s, info if >1s)
- Context tracking
- Async and sync operation support

**Usage:**
```typescript
import { trackPerformance, PerformanceTracker } from '@/lib/monitoring'

// Track async operation
const result = await trackPerformance(
  'fetch_transactions',
  async () => {
    return await fetchTransactions()
  },
  { workspaceId: 'abc123' }
)

// Manual tracking
const tracker = new PerformanceTracker('complex_calculation', { userId: '123' })
// ... do work ...
const metrics = tracker.end({ itemsProcessed: 100 })
```

### 3. Error Tracker (`src/lib/monitoring/error-tracker.ts`)

Tracks errors and provides error rate monitoring.

**Features:**
- Error categorization (data_fetch, calculation, validation, cache, unknown)
- Error counting and rate calculation
- Threshold alerts (warns after 10 errors of same type)
- Error wrapping for operations

**Usage:**
```typescript
import { errorTracker, withErrorTracking } from '@/lib/monitoring'

// Track error manually
try {
  await riskyOperation()
} catch (error) {
  errorTracker.trackError(
    'calculation',
    'daily_forecast',
    error,
    { workspaceId: 'abc123' }
  )
  throw error
}

// Automatic error tracking
const result = await withErrorTracking(
  'data_fetch',
  'fetch_transactions',
  async () => {
    return await fetchTransactions()
  },
  { workspaceId: 'abc123' }
)

// Get error statistics
const errorCount = errorTracker.getErrorCount('calculation', 'daily_forecast')
const errorRate = errorTracker.getErrorRate('calculation', 'daily_forecast', 100)
```

### 4. Metrics Collector (`src/lib/monitoring/metrics-collector.ts`)

Aggregates metrics from all monitoring components.

**Features:**
- Cache statistics (hit rate, size, operations)
- Error aggregation by category
- System health determination
- Unified metrics interface

**Usage:**
```typescript
import { metricsCollector } from '@/lib/monitoring/metrics-collector'

// Collect all metrics
const metrics = metricsCollector.collectMetrics()

console.log('System health:', metrics.health.status)
console.log('Cache hit rate:', metrics.cache.hitRate)
console.log('Total errors:', metrics.errors.totalErrors)
```

## Monitoring in Forecast Service

The forecast service includes comprehensive monitoring:

### Data Fetching
- Tracks performance of all database queries
- Logs transaction counts and date ranges
- Monitors error rates for data fetch operations

### Calculation
- Logs forecast calculation details (confidence, risk levels, etc.)
- Tracks calculation duration
- Monitors error rates for calculation operations

### Caching
- Tracks cache hits and misses
- Calculates cache hit rate
- Logs cache operations (set, invalidate, clear)

### Example Log Output

```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "level": "info",
  "message": "Forecast calculated",
  "context": {
    "workspaceId": "abc123",
    "accountId": "def456",
    "shouldDisplay": true,
    "confidence": "high",
    "averageDailySpending": 150.50,
    "forecastDays": 28,
    "safeDays": 20,
    "warningDays": 5,
    "dangerDays": 3
  }
}
```

## Metrics API Endpoint

Access system metrics via API:

```bash
GET /api/monitoring/metrics
```

**Response:**
```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "cache": {
    "size": 15,
    "hits": 45,
    "misses": 10,
    "hitRate": 82,
    "totalOperations": 55
  },
  "errors": {
    "totalErrors": 3,
    "errorsByCategory": {
      "data_fetch": 2,
      "calculation": 1
    },
    "recentErrors": [
      {
        "category": "data_fetch",
        "operation": "fetch_transactions",
        "count": 2
      }
    ]
  },
  "health": {
    "status": "healthy",
    "issues": []
  }
}
```

**Note:** In production, this endpoint should be protected with authentication and only accessible to administrators.

## Health Status

The system automatically determines health status based on metrics:

### Healthy
- Cache hit rate ≥ 50%
- Error rate ≤ 1%
- No error thresholds exceeded

### Degraded
- Cache hit rate < 50%
- Error rate > 1% but ≤ 5%
- Some errors but below critical threshold

### Unhealthy
- Error rate > 5%
- Any error type has ≥ 10 occurrences
- Critical system issues detected

## Alerts and Thresholds

### Performance Alerts
- **Warning**: Operation takes > 2 seconds
- **Info**: Operation takes > 1 second
- **Debug**: Operation completes normally

### Error Alerts
- **Threshold Alert**: Same error occurs ≥ 10 times
- **Rate Alert**: Error rate exceeds 5%

### Cache Alerts
- **Low Hit Rate**: Cache hit rate < 50% (with ≥ 10 operations)

## Best Practices

### 1. Log Meaningful Context
```typescript
// Good - includes relevant context
logger.info('Forecast calculated', {
  workspaceId,
  accountId,
  forecastDays: forecasts.length,
  confidence: forecast.confidence
})

// Bad - missing context
logger.info('Forecast calculated')
```

### 2. Track Performance for Expensive Operations
```typescript
// Track database queries
const transactions = await trackPerformance(
  'fetch_transactions',
  async () => await fetchTransactions(),
  { workspaceId, accountId }
)

// Track calculations
const forecast = trackPerformanceSync(
  'calculate_forecast',
  () => calculateForecast(data),
  { dataPoints: data.length }
)
```

### 3. Categorize Errors Appropriately
```typescript
// Data fetching errors
errorTracker.trackError('data_fetch', 'fetch_transactions', error, context)

// Calculation errors
errorTracker.trackError('calculation', 'daily_forecast', error, context)

// Validation errors
errorTracker.trackError('validation', 'validate_input', error, context)

// Cache errors
errorTracker.trackError('cache', 'cache_set', error, context)
```

### 4. Monitor Critical Paths
Focus monitoring on:
- Database queries (performance and errors)
- Forecast calculations (accuracy and performance)
- Cache operations (hit rate and errors)
- User-facing operations (response times)

## Testing

All monitoring components include comprehensive tests:

```bash
# Run monitoring tests
npm test src/lib/monitoring

# Run with coverage
npm test -- --coverage src/lib/monitoring
```

## Production Considerations

### 1. Log Aggregation
In production, logs should be aggregated to a centralized logging service:
- Datadog
- New Relic
- CloudWatch
- Elasticsearch + Kibana

### 2. Metrics Dashboard
Create a dashboard to visualize:
- Cache hit rate over time
- Error rates by category
- Performance trends
- System health status

### 3. Alerting
Set up alerts for:
- Error rate > 5%
- Cache hit rate < 50%
- Performance degradation (>2s average)
- System health = unhealthy

### 4. Log Retention
Configure appropriate log retention:
- Development: 7 days
- Production: 30-90 days
- Compliance requirements may require longer retention

## Troubleshooting

### High Error Rate
1. Check error logs for patterns
2. Review recent code changes
3. Verify database connectivity
4. Check external service status

### Low Cache Hit Rate
1. Verify cache TTL is appropriate (5 minutes)
2. Check if cache is being invalidated too frequently
3. Review cache key generation logic
4. Monitor cache size and memory usage

### Slow Performance
1. Check performance logs for slow operations
2. Review database query performance
3. Verify data volume hasn't increased significantly
4. Check for N+1 query problems

## Future Enhancements

- Real-time metrics streaming
- Custom metric dashboards
- Automated anomaly detection
- Performance regression testing
- Distributed tracing support
- Custom alert rules
- Metrics export to external services
