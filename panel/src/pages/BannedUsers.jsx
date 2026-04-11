import { api } from '../api'
import { useListPage } from '../hooks/useListPage'
import { usePoll } from '../hooks/usePoll'
import PageHeader from '../components/PageHeader'
import InputCard from '../components/InputCard'
import ListCard from '../components/ListCard'

function BannedUsers() {
  const { items, loading, error, addItem, removeItem, refetch } = useListPage({
    fetchFn:  api.getBanList,
    addFn:    api.addToBanList,
    removeFn: api.removeFromBanList,
  })

  usePoll(refetch, 5000)

  return (
    <>
      <PageHeader title="Banned Users" error={error} />
      <InputCard title="Add User ID" placeholder="Discord user ID..." buttonLabel="Ban" onSubmit={addItem} />
      <ListCard
        title="Ban List"
        items={items}
        loading={loading}
        emptyMessage="No users in ban list."
        onRemove={removeItem}
        removeLabel="Unban"
        confirmLabel="Confirm?"
      />
    </>
  )
}

export default BannedUsers
