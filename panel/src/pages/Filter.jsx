import { api } from '../api'
import { useListPage } from '../hooks/useListPage'
import PageHeader from '../components/PageHeader'
import AddItemCard from '../components/AddItemCard'
import ItemListCard from '../components/ItemListCard'

function Filter() {
  const { items, loading, error, addItem, removeItem } = useListPage({
    fetchFn:   api.getFilter,
    addFn:     api.addFilter,
    removeFn:  api.removeFilter,
    normalize: (v) => v.toLowerCase(),
  })

  return (
    <>
      <PageHeader title="Word Filter" error={error} />
      <AddItemCard title="Add Word" placeholder="Enter word..." onAdd={addItem} />
      <ItemListCard
        title="Filtered Words"
        items={items}
        loading={loading}
        emptyMessage="No filtered words."
        onRemove={removeItem}
      />
    </>
  )
}

export default Filter
