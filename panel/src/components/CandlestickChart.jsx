import './CandlestickChart.css'

// data:   array of { label: string, value: number }
//   Each candle: open = previous value, close = current value
//   Wick high/low = local 3-point max/min for visual context
// height: SVG height in px (default: 180)
function CandlestickChart({ data = [], height = 180 }) {
  if (data.length < 2) return <div className="chart-empty">Not enough data</div>

  const values = data.map((d) => d.value)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const padX     = 8
  const padY     = 16
  const padRight = 36
  const w        = 600
  const h        = height

  const toY = (v) => padY + (1 - (v - min) / range) * (h - padY * 2)

  // Build candle data — skip index 0 (no open value for first point)
  const candles = data.slice(1).map((d, i) => {
    const open  = values[i]       // previous day
    const close = values[i + 1]   // current day
    // Wick spans the 3-point neighbourhood min/max
    const neighbours = values.slice(Math.max(0, i - 1), i + 3)
    const wickHigh   = Math.max(...neighbours)
    const wickLow    = Math.min(...neighbours)
    return { label: d.label, open, close, wickHigh, wickLow }
  })

  const count    = candles.length
  const slotW    = (w - padX - padRight) / count
  const bodyW    = Math.max(3, slotW * 0.55)
  const wickW    = 1.5
  const centerX  = (i) => padX + (i + 0.5) * slotW

  const gridLevels = [min, min + range * 0.5, max]

  // Pin each label under its candle center x (as % of viewBox width); skip data[0] (no candle)
  const step       = Math.ceil(data.length / 8)
  const labelItems = candles
    .map((_, i) => ({ label: data[i + 1].label, cx: (centerX(i) / w) * 100 }))
    .filter((_, i) => (i + 1) % step === 0 || i === candles.length - 1)

  return (
    <div className="candlestick-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">

        {/* Gridlines */}
        {gridLevels.map((v, i) => (
          <line
            key={i}
            x1={padX}         y1={toY(v)}
            x2={w - padRight} y2={toY(v)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
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

        {/* Candles */}
        {candles.map((c, i) => {
          const cx       = centerX(i)
          const bullish  = c.close >= c.open
          const color    = bullish ? 'var(--success)' : 'var(--danger)'
          const bodyTop  = toY(Math.max(c.open, c.close))
          const bodyBot  = toY(Math.min(c.open, c.close))
          const bodyH    = Math.max(1, bodyBot - bodyTop)

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={cx} y1={toY(c.wickHigh)}
                x2={cx} y2={toY(c.wickLow)}
                stroke={color}
                strokeWidth={wickW}
                opacity="0.6"
              />
              {/* Body */}
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                fill={bullish ? color : 'transparent'}
                stroke={color}
                strokeWidth="1.5"
                rx="1"
              />
            </g>
          )
        })}
      </svg>

      <div className="candlestick-chart-labels">
        {labelItems.map((d, i) => (
          <span key={i} style={{ left: `${d.cx}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

export default CandlestickChart
