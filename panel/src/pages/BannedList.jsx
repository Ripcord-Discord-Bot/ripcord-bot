import { api } from '../api'
import { useListPage } from '../hooks/useListPage'
import PageHeader from '../components/PageHeader'
import AddItemCard from '../components/AddItemCard'
import ItemListCard from '../components/ItemListCard'

function BannedList() {
  const { items, loading, error, addItem, removeItem } = useListPage({
    fetchFn: api.getBanned,
    addFn:   api.addBanned,
    removeFn: api.removeBanned,
  })

  return (
    <>
      <PageHeader title="Banned List" error={error} />
      <AddItemCard title="Ban User ID" placeholder="Discord user ID..." buttonLabel="Ban" onAdd={addItem} />
      <ItemListCard
        title="Banned Users"
        items={items}
        loading={loading}
        emptyMessage="No banned users."
        onRemove={removeItem}
        removeLabel="Unban"
      />
    </>
  )
}

export default BannedList
