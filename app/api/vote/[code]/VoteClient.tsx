'use client'

import { useState } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { runRCV, RoundResult } from '@/lib/rcv'
import Results from './Results'

type Candidate = { id: string; title: string }
type Vote = { candidate_id: string; rank: number; voter_name: string }
type Ballot = { id: string; title: string; is_open: boolean }

function SortableBook({ candidate, index }: { candidate: Candidate; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
      className="flex items-center gap-4 rounded-lg p-4 mb-3 w-full max-w-md shadow-sm cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="text-2xl font-bold w-8" style={{ color: 'var(--muted)' }}>{index + 1}</span>
      <p className="font-semibold">{candidate.title}</p>
      <span className="ml-auto" style={{ color: 'var(--muted)' }}>⠿</span>
    </div>
  )
}

export default function VoteClient({ ballot, candidates, existingVotes }: {
  ballot: Ballot
  candidates: Candidate[]
  existingVotes: Vote[]
}) {
  const [screen, setScreen] = useState<'name' | 'vote' | 'results'>('name')
  const [voterName, setVoterName] = useState('')
  const [nameError, setNameError] = useState('')
  const [items, setItems] = useState(candidates)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [rounds, setRounds] = useState<RoundResult[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleNameSubmit() {
    const trimmed = voterName.trim()
    if (!trimmed) return setNameError('Please enter your name')

    // Check for duplicate name
    const alreadyVoted = existingVotes.some(v => v.voter_name.toLowerCase() === trimmed.toLowerCase())
    if (alreadyVoted) return setNameError('This name has already voted')

    setNameError('')
    setScreen('vote')
  }

  async function handleVoteSubmit() {
    setSubmitting(true)
    setVoteError('')

    const rankings = items.map((item, index) => ({
      ballot_id: ballot.id,
      candidate_id: item.id,
      rank: index + 1,
      voter_name: voterName.trim()
    }))

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings, ballotId: ballot.id, voterName: voterName.trim() })
    })

    if (!res.ok) {
      const data = await res.json()
      setVoteError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    // Run RCV on all votes including this one
    const allVotes = [...existingVotes, ...rankings]
    const results = runRCV(allVotes, candidates)
    setRounds(results)
    setScreen('results')
    setSubmitting(false)
  }

  if (!ballot.is_open) {
    return <p style={{ color: 'var(--muted)' }}>This ballot is closed.</p>
  }

  // Name entry screen
  if (screen === 'name') {
    return (
      <div className="w-full max-w-md mt-4">
        <p className="mb-4 font-semibold">Enter your name to vote:</p>
        <input
          type="text"
          value={voterName}
          onChange={e => setVoterName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-lg p-3 mb-3"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
        />
        {nameError && <p className="text-red-400 text-sm mb-3">{nameError}</p>}
        <button
          onClick={handleNameSubmit}
          className="w-full py-3 rounded-lg font-semibold transition-colors"
          style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        >
          Continue
        </button>
      </div>
    )
  }

  // Results screen
  if (screen === 'results') {
    return <Results rounds={rounds} voterName={voterName} />
  }

  // Voting screen
  return (
    <div className="w-full max-w-md mt-4">
      <p className="mb-4" style={{ color: 'var(--muted)' }}>Drag to rank the books in your order of preference.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((candidate, index) => (
            <SortableBook key={candidate.id} candidate={candidate} index={index} />
          ))}
        </SortableContext>
      </DndContext>
      {voteError && <p className="text-red-400 text-sm mb-3">{voteError}</p>}
      <button
        onClick={handleVoteSubmit}
        disabled={submitting}
        className="w-full mt-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
        style={{ background: 'var(--foreground)', color: 'var(--background)' }}
      >
        {submitting ? 'Submitting...' : 'Submit Rankings'}
      </button>
    </div>
  )
}