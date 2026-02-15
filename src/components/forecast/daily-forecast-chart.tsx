'use client'

import { useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import { EmptyStateWithAction } from '@/components/shared/empty-state-with-action'
import type { DailyForecast } from '@/lib/calculations/daily-forecast'
import { formatCurrency } from '@/lib/utils/format'

interface DailyForecastChartProps {
  forecasts: DailyForecast[]
  currency: string
  className?: string
}

interface ChartPoint {
  x: number
  y: number
  forecast: DailyForecast
}

export function DailyForecastChart({ 
  forecasts, 
  currency,
  className = ''
}: DailyForecastChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Chart dimensions
  const width = 800
  const height = 300
  const padding = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 60 }), [])
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate chart data
  const chartData = useMemo(() => {
    if (forecasts.length === 0) return null

    // Find min and max values for scaling
    const balances = forecasts.map(f => f.projectedBalance)
    const minBalance = Math.min(...balances)
    const maxBalance = Math.max(...balances)
    
    // Add 10% padding to y-axis
    const yPadding = (maxBalance - minBalance) * 0.1
    const yMin = minBalance - yPadding
    const yMax = maxBalance + yPadding

    // Create points
    const points: ChartPoint[] = forecasts.map((forecast, index) => {
      const x = padding.left + (index / (forecasts.length - 1)) * chartWidth
      const y = padding.top + chartHeight - 
        ((forecast.projectedBalance - yMin) / (yMax - yMin)) * chartHeight
      
      return { x, y, forecast }
    })

    // Create smooth curve path using cubic bezier
    const createSmoothPath = (points: ChartPoint[]): string => {
      if (points.length === 0) return ''
      
      let path = `M ${points[0].x} ${points[0].y}`
      
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i]
        const next = points[i + 1]
        
        // Control points for smooth curve
        const controlX = (current.x + next.x) / 2
        const controlY1 = current.y
        const controlY2 = next.y
        
        path += ` C ${controlX} ${controlY1}, ${controlX} ${controlY2}, ${next.x} ${next.y}`
      }
      
      return path
    }

    // Create area fill path
    const createAreaPath = (points: ChartPoint[]): string => {
      if (points.length === 0) return ''
      
      const linePath = createSmoothPath(points)
      const lastPoint = points[points.length - 1]
      const firstPoint = points[0]
      
      // Close the path at the bottom
      return `${linePath} L ${lastPoint.x} ${padding.top + chartHeight} L ${firstPoint.x} ${padding.top + chartHeight} Z`
    }

    return {
      points,
      linePath: createSmoothPath(points),
      areaPath: createAreaPath(points),
      yMin,
      yMax,
      yRange: yMax - yMin
    }
  }, [forecasts, chartWidth, chartHeight, padding])

  // Calculate summary stats
  const stats = useMemo(() => {
    const safeDays = forecasts.filter(f => f.riskLevel === 'safe').length
    const warningDays = forecasts.filter(f => f.riskLevel === 'warning').length
    const dangerDays = forecasts.filter(f => f.riskLevel === 'danger').length
    const hasLowConfidence = forecasts.some(f => f.confidence === 'low')
    
    return { safeDays, warningDays, dangerDays, hasLowConfidence }
  }, [forecasts])

  // Get color for risk level
  const getRiskColor = (riskLevel: 'safe' | 'warning' | 'danger'): string => {
    switch (riskLevel) {
      case 'safe':
        return '#4E7A58' // Growth Emerald
      case 'warning':
        return '#F59E0B' // Amber
      case 'danger':
        return '#EF4444' // Red
    }
  }

  // Handle mouse move for tooltip
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!chartData) return

    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Find closest point
    let closestPoint: ChartPoint | null = null
    let minDistance = Infinity

    chartData.points.forEach(point => {
      const distance = Math.abs(point.x - mouseX)
      if (distance < minDistance && distance < 30) {
        minDistance = distance
        closestPoint = point
      }
    })

    if (closestPoint) {
      setHoveredPoint(closestPoint)
      setTooltipPosition({ x: event.clientX, y: event.clientY })
    } else {
      setHoveredPoint(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  if (!chartData || forecasts.length === 0) {
    return (
      <div className={`${className}`}>
        <EmptyStateWithAction
          icon={TrendingUp}
          title="No Forecast Available"
          description="Add at least 14 days of transaction history to see your daily cash flow forecast and projected balances."
          guidance="The forecast helps you see how much money you'll have each day, so you can avoid running out and plan ahead with confidence."
          action={{
            label: "Add Transactions",
            href: "/transactions"
          }}
        />
      </div>
    )
  }

  // Generate Y-axis labels
  const yAxisLabels = []
  const labelCount = 5
  for (let i = 0; i < labelCount; i++) {
    const value = chartData.yMin + (chartData.yRange * i / (labelCount - 1))
    const y = padding.top + chartHeight - (i / (labelCount - 1)) * chartHeight
    yAxisLabels.push({ value, y })
  }

  // Generate X-axis labels (show every 5th day or fewer if many days)
  const xAxisLabels = chartData.points.filter((_, index) => {
    const step = Math.ceil(forecasts.length / 6)
    return index % step === 0 || index === forecasts.length - 1
  })

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Chart */}
      <div className="relative bg-glass rounded-2xl border border-glass p-6 executive-glass">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          <g className="opacity-10">
            {yAxisLabels.map((label, index) => (
              <line
                key={`grid-${index}`}
                x1={padding.left}
                y1={label.y}
                x2={width - padding.right}
                y2={label.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary"
              />
            ))}
          </g>

          {/* Area fill with gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E6A65D" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#E6A65D" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <path
            d={chartData.areaPath}
            fill="url(#areaGradient)"
            className="transition-all duration-300"
          />

          {/* Line path with colored segments */}
          {chartData.points.map((point, index) => {
            if (index === chartData.points.length - 1) return null
            
            const nextPoint = chartData.points[index + 1]
            const color = getRiskColor(point.forecast.riskLevel)
            
            return (
              <line
                key={`segment-${index}`}
                x1={point.x}
                y1={point.y}
                x2={nextPoint.x}
                y2={nextPoint.y}
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            )
          })}

          {/* Data points */}
          {chartData.points.map((point, index) => {
            const color = getRiskColor(point.forecast.riskLevel)
            const isHovered = hoveredPoint && isSameDay(hoveredPoint.forecast.date, point.forecast.date)
            
            return (
              <circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r={isHovered ? 6 : 4}
                fill={color}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none'
                }}
              />
            )
          })}

          {/* Y-axis labels */}
          {yAxisLabels.map((label, index) => (
            <text
              key={`y-label-${index}`}
              x={padding.left - 10}
              y={label.y}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs text-secondary fill-current"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {formatCurrency(label.value, currency)}
            </text>
          ))}

          {/* X-axis labels */}
          {xAxisLabels.map((point, index) => (
            <text
              key={`x-label-${index}`}
              x={point.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs text-secondary fill-current"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {format(point.forecast.date, 'MMM d')}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="bg-primary border border-glass rounded-lg shadow-lg p-3 min-w-[200px] executive-glass">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">
                    {format(hoveredPoint.forecast.date, 'MMM d, yyyy')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    hoveredPoint.forecast.riskLevel === 'safe' ? 'bg-green-500/10 text-green-500' :
                    hoveredPoint.forecast.riskLevel === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {hoveredPoint.forecast.riskLevel}
                  </span>
                </div>
                
                <div className="border-t border-glass pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Projected Balance:</span>
                    <span className="text-primary font-semibold">
                      {formatCurrency(hoveredPoint.forecast.projectedBalance, currency)}
                    </span>
                  </div>
                  
                  {hoveredPoint.forecast.breakdown.plannedIncome > 0 && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-secondary">+ Planned Income:</span>
                      <span className="text-green-500">
                        {formatCurrency(hoveredPoint.forecast.breakdown.plannedIncome, currency)}
                      </span>
                    </div>
                  )}
                  
                  {hoveredPoint.forecast.breakdown.plannedExpenses > 0 && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-secondary">- Planned Expenses:</span>
                      <span className="text-red-500">
                        {formatCurrency(hoveredPoint.forecast.breakdown.plannedExpenses, currency)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-secondary">- Est. Daily Spending:</span>
                    <span className="text-secondary">
                      {formatCurrency(hoveredPoint.forecast.breakdown.estimatedDailySpending, currency)}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-secondary">
                  Confidence: {hoveredPoint.forecast.confidence}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4 justify-center text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4E7A58]" />
          <span className="text-secondary">Safe: {stats.safeDays} days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <span className="text-secondary">Warning: {stats.warningDays} days</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <span className="text-secondary">Risk: {stats.dangerDays} days</span>
        </div>
      </div>

      {/* Low confidence warning */}
      {stats.hasLowConfidence && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Limited historical data - forecast accuracy may be reduced. Add more transactions to improve predictions.
          </p>
        </div>
      )}
    </div>
  )
}
