import Card from './Card'
import ConfirmButton from './ConfirmButton'

// Reusable card for pages that display a list of items with a remove action.
// renderItem(item) — returns JSX for the left side of each row. Defaults to a tag pill.
// onRemove(item)   — called upon confirmation.
function ItemListCard({
  title,
  items,
  loading,
  emptyMessage = 'Nothing here.',
  renderItem = (item) => <span className="tag">{item}</span>,
  onRemove,
  removeLabel = 'Remove',
  confirmLabel = 'Confirm?',
}) {
  return (
    <Card title={`${title} (${items.length})`}>
      {loading ? (
        <p className="empty">Loading...</p>
      ) : items.length === 0 ? (
        <p className="empty">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div className="list-item" key={item}>
            {renderItem(item)}
            <ConfirmButton
              label={removeLabel}
              confirmLabel={confirmLabel}
              onConfirm={() => onRemove(item)}
            />
          </div>
        ))
      )}
    </Card>
  )
}

export default ItemListCard
