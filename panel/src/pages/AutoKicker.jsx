import { api } from '../api'
import { useListPage } from '../hooks/useListPage'
import { usePoll } from '../hooks/usePoll'
import PageHeader from '../components/PageHeader'
import InputCard from '../components/InputCard'
import ListCard from '../components/ListCard'

function AutoKicker() {
  const { items, loading, error, addItem, removeItem, refetch } = useListPage({
    fetchFn: api.getKickList,
    addFn:   api.addToKickList,
    removeFn: api.removeFromKickList,
  })

  usePoll(refetch, 5000)

  return (
    <>
      <PageHeader title="Auto Kicker" error={error} />
      <InputCard title="Add User ID" placeholder="Discord user ID..." buttonLabel="Kick" onSubmit={addItem} />
      <ListCard
        title="Kick List"
        items={items}
        loading={loading}
        emptyMessage="No users in kick list."
        onRemove={removeItem}
        removeLabel="Remove"
      />
    </>
  )
}

export default AutoKicker
