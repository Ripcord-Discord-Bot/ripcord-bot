import './PageHeader.css'

// children: optional right-side action elements (buttons, notices, etc.)
function PageHeader({ title, error, children }) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <h1 className="page-title">{title}</h1>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export default PageHeader
