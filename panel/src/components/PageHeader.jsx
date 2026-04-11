import './PageHeader.css'

// children: optional right-side action elements (buttons, notices, etc.)
function PageHeader({ title, error, children }) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <h1 className="page-title">{title}</h1>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
      <p className={`page-header-error${error ? '' : ' page-header-error--hidden'}`}>{error ?? '\u00a0'}</p>
    </div>
  )
}

export default PageHeader
