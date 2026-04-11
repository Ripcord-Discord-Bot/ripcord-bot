import { useState } from 'react'
import { api } from '../api'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import ListCard from '../components/ListCard'

import './Invites.css'

function InviteInputCard({ onSubmit }) {
  const [channelId, setChannelId] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [reason, setReason] = useState('')

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      channelId: channelId || undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : 0,
      maxAge: maxAge ? parseInt(maxAge, 10) : 0,
      reason: reason || undefined,
    });
    setChannelId('');
    setMaxUses('');
    setMaxAge('');
    setReason('');
  }

  return (
    <Card title="Create Invite">
      <form onSubmit={handleSubmit} className="invite-form">
        <div className="row">
          <input
            value={channelId}
            onChange={e => setChannelId(e.target.value)}
            placeholder="Channel ID (optional)"
          />
          <input
            type="number"
            min={0}
            value={maxUses}
            onChange={e => setMaxUses(e.target.value)}
            placeholder="Max Uses (0 = unlimited)"
          />
          <input
            type="number"
            min={0}
            value={maxAge}
            onChange={e => setMaxAge(e.target.value)}
            placeholder="Max Age (sec, 0 = unlimited)"
          />
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <button className="btn" type="submit">Create</button>
        </div>
      </form>
    </Card>
  );
}

function Invites() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchInvites() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInvites()
      setInvites(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvite(fields) {
    setError(null)
    try {
      const invite = await api.createInvite(fields)
      // Defensive: check for required properties
      if (!invite || !invite.code || !invite.url) {
        throw new Error('Malformed invite data received from server.');
      }
      setInvites(prev => [...prev, invite])
    } catch (e) {
      setError(e.message)
      // Log error to console for debugging
      // eslint-disable-next-line no-console
      console.error('Invite creation error:', e);
    }
  }

  async function handleDeleteInvite(code) {
    setError(null)
    try {
      await api.deleteInvite(code)
      setInvites(prev => prev.filter(i => i.code !== code))
    } catch (e) {
      setError(e.message)
    }
  }


  // Initial load and polling for updates
  useState(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [])

  return (
    <>
      <PageHeader title="Invites" error={error} />
      <InviteInputCard onSubmit={handleCreateInvite} />
      <ListCard
        title="Invite Links"
        items={invites.filter(i => i && i.code && i.url)}
        renderItem={item => (
          <span>
            <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
            <br />
            <small>
              {`Channel: ${item.channelId ?? 'N/A'}, `}
              <b>Tracked Uses:</b> {typeof item.uses === 'number' ? item.uses : 0}
              {` | Max Uses: ${item.maxUses || '∞'}, Max Age: ${item.maxAge || '∞'}`}
            </small>
          </span>
        )}
        loading={loading}
        emptyMessage="No invites."
        onRemove={item => handleDeleteInvite(item.code)}
        removeLabel="Delete"
      />
    </>
  )
}

export default Invites
