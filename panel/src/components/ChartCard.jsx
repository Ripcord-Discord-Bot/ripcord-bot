import './ChartCard.css'

// title:    string — displayed above the chart
// children: the chart component (LineChart or BarChart)
function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      {title && <p className="chart-card-title">{title}</p>}
      {children}
    </div>
  )
}

export default ChartCard
