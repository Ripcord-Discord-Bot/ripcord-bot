import './PieChart.css'

// Palette cycles through these for slices
const COLORS = [
  '#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#a3e635', '#f97316', '#8b5cf6',
]

// Compute SVG arc path for a pie slice
// cx, cy: center; r: radius; startAngle, endAngle: radians
function arcPath(cx, cy, r, startAngle, endAngle) {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

// data: array of { label: string, value: number }
// innerRadius: 0 for solid pie, >0 for donut (proportion of r, e.g. 0.55)
function PieChart({ data = [], innerRadius = 0.55 }) {
  const filtered = data.filter((d) => d.value > 0)
  if (!filtered.length) return <div className="chart-empty">No data</div>

  const total  = filtered.reduce((s, d) => s + d.value, 0)
  const cx     = 100
  const cy     = 100
  const r      = 80
  const iR     = r * innerRadius

  // Build slices
  let angle = -Math.PI / 2  // start at top
  const slices = filtered.map((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2
    const start = angle
    const end   = angle + sweep
    angle       = end
    return { ...d, start, end, color: COLORS[i % COLORS.length] }
  })

  // Donut: clip inner circle with a cutout path
  const donutPath = iR > 0
    ? `M ${cx} ${cy - iR} A ${iR} ${iR} 0 1 1 ${cx - 0.001} ${cy - iR} Z`
    : null

  return (
    <div className="pie-chart">
      <svg viewBox="0 0 200 200" aria-hidden="true" className="pie-chart-svg">
        {slices.map((s, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, s.start, s.end)}
            fill={s.color}
            stroke="var(--surface)"
            strokeWidth="1.5"
          />
        ))}
        {donutPath && (
          <path d={donutPath} fill="var(--surface)" />
        )}
      </svg>

      <div className="pie-chart-legend">
        {slices.map((s, i) => (
          <div key={i} className="pie-chart-legend-item">
            <span className="pie-chart-legend-dot" style={{ background: s.color }} />
            <span className="pie-chart-legend-label">{s.label}</span>
            <span className="pie-chart-legend-value">{s.value.toLocaleString()}</span>
            <span className="pie-chart-legend-pct">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PieChart
