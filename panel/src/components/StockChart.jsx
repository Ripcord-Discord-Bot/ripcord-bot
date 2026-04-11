import './StockChart.css'

// data:   array of { label: string, value: number }
// color:  override line color (auto: green if trending up, red if down)
// height: SVG height in px (default: 160)
function StockChart({ data = [], color, height = 160 }) {
  if (!data.length) return <div className="chart-empty">No data</div>

  const values = data.map((d) => d.value)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const trending  = values[values.length - 1] >= values[0]
  const lineColor = color ?? (trending ? 'var(--success)' : 'var(--danger)')

  const padX     = 8
  const padY     = 16
  const padRight = 36 // room for y-axis labels
  const w        = 600
  const h        = height

  const toX = (i) => padX + (i / (data.length - 1 || 1)) * (w - padX - padRight)
  const toY = (v) => padY + (1 - (v - min) / range) * (h - padY * 2)

  // Smooth cubic bezier — control points are horizontal midpoints
  const buildLinePath = () => {
    if (data.length === 1) return `M ${toX(0)},${toY(data[0].value)}`
    let d = `M ${toX(0)},${toY(data[0].value)}`
    for (let i = 0; i < data.length - 1; i++) {
      const x0  = toX(i),     y0  = toY(data[i].value)
      const x1  = toX(i + 1), y1  = toY(data[i + 1].value)
      const cpx = (x0 + x1) / 2
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`
    }
    return d
  }

  const linePath = buildLinePath()
  const fillPath = `${linePath} L ${toX(data.length - 1)},${h - padY} L ${toX(0)},${h - padY} Z`

  const gradId   = `sc-${(color ?? 'auto').replace(/[^a-z0-9]/gi, '')}-${h}`
  const lastX    = toX(data.length - 1)
  const lastY    = toY(values[values.length - 1])

  // Three horizontal reference lines: min, midpoint, max
  const gridLevels = [min, min + range * 0.5, max]

  // Pin each label under its data-point x (as % of viewBox width)
  const step       = Math.ceil(data.length / 7)
  const labelItems = data
    .map((d, i) => ({ label: d.label, cx: (toX(i) / w) * 100 }))
    .filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div className="stock-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridLevels.map((v, i) => (
          <line
            key={i}
            x1={padX}           y1={toY(v)}
            x2={w - padRight}   y2={toY(v)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis value labels */}
        {gridLevels.map((v, i) => (
          <text
            key={i}
            x={w - padRight + 5}
            y={toY(v) + 4}
            fontSize="10"
            fill="var(--muted)"
          >
            {Math.round(v)}
          </text>
        ))}

        {/* Gradient fill area */}
        <path d={fillPath} fill={`url(#${gradId})`} />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Last-point dot */}
        <circle cx={lastX} cy={lastY} r="4" fill={lineColor} />

        {/* Dashed horizontal from last point to y-axis label area */}
        <line
          x1={lastX} y1={lastY}
          x2={w - padRight} y2={lastY}
          stroke={lineColor}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      </svg>

      <div className="stock-chart-labels">
        {labelItems.map((d, i) => (
          <span key={i} style={{ left: `${d.cx}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export default StockChart
