import Card from './Card'
import ConfirmButton from './ConfirmButton'

// Reusable card for pages that display a list of items with a remove action.
// renderItem(item) — returns JSX for the left side of each row. Defaults to a tag pill.
// onRemove(item)   — called upon confirmation.
function ListCard({
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
        items.map((item, idx) => {
          // Use item.code if present, else fallback to idx. If duplicate codes, append idx for uniqueness.
          let key = idx;
          if (item && typeof item === 'object' && item.code) {
            // Check for duplicates in items before idx
            const firstIdx = items.findIndex((it) => it && typeof it === 'object' && it.code === item.code);
            key = firstIdx === idx ? item.code : `${item.code}-${idx}`;
          }
          return (
            <div className="list-item" key={key}>
              {renderItem(item)}
              <ConfirmButton
                label={removeLabel}
                confirmLabel={confirmLabel}
                onConfirm={() => onRemove(item)}
              />
            </div>
          );
        })
      )}
    </Card>
  )
}

export default ListCard
