import './LineChart.css'

// data: array of { label: string, value: number }
// color: CSS color string (default: var(--accent))
// height: SVG height in px (default: 120)
function LineChart({ data = [], color = 'var(--accent)', height = 120 }) {
  if (!data.length) return <div className="chart-empty">No data</div>

  const values = data.map((d) => d.value)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const padX = 8
  const padY = 12
  const w    = 600
  const h    = height

  const toX = (i) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2)
  const toY = (v) => padY + (1 - (v - min) / range) * (h - padY * 2)

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')

  // Build fill path: line points + bottom-right + bottom-left
  const fillPath = [
    `M ${toX(0)},${toY(data[0].value)}`,
    ...data.slice(1).map((d, i) => `L ${toX(i + 1)},${toY(d.value)}`),
    `L ${toX(data.length - 1)},${h - padY}`,
    `L ${toX(0)},${h - padY}`,
    'Z',
  ].join(' ')

  const gradId = `lg-${color.replace(/[^a-z0-9]/gi, '')}-${h}`

  // Pin each label under its data-point x (as % of viewBox width)
  const step = Math.ceil(data.length / 8)
  const labelItems = data
    .map((d, i) => ({ label: d.label, cx: (toX(i) / w) * 100, svgX: toX(i), svgY: toY(d.value) }))
    .filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        {/* Tick lines at labeled points */}
        {labelItems.map((d, i) => (
          <line
            key={i}
            x1={d.svgX} y1={d.svgY}
            x2={d.svgX} y2={h - padY}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
        ))}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3" fill={color} />
        ))}
      </svg>
      <div className="line-chart-labels">
        {labelItems.map((d, i) => (
          <span key={i} style={{ left: `${d.cx}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export default LineChart
