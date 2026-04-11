import './BarChart.css'

// data:  array of { label: string, value: number }
// color: CSS color string (default: var(--accent))
// height: chart area height in px (default: 120)
function BarChart({ data = [], color = 'var(--accent)', height = 120 }) {
  if (!data.length) return <div className="chart-empty">No data</div>

  const values = data.map((d) => d.value)
  const max    = Math.max(...values) || 1

  const padX  = 4
  const padY  = 12
  const w     = 600
  const h     = height
  const gap   = 4
  const barW  = (w - padX * 2 - gap * (data.length - 1)) / data.length

  const toX = (i) => padX + i * (barW + gap)
  const toH = (v) => ((v / max) * (h - padY * 2))
  const toY = (v) => h - padY - toH(v)

  // Compute each bar's center as % of viewBox width for aligned label positioning
  const step = Math.ceil(data.length / 8)
  const labelItems = data
    .map((d, i) => ({ label: d.label, cx: ((toX(i) + barW / 2) / w) * 100 }))
    .filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {data.map((d, i) => (
          <rect
            key={i}
            x={toX(i)}
            y={toY(d.value)}
            width={barW}
            height={toH(d.value)}
            rx="2"
            fill={color}
            opacity="0.85"
          />
        ))}
      </svg>
      <div className="bar-chart-labels">
        {labelItems.map((d, i) => (
          <span key={i} style={{ left: `${d.cx}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export default BarChart
