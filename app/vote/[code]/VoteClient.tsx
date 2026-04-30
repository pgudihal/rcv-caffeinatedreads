'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DndContext, closestCenter, KeyboardSensor,
  MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RoundResult } from '@/lib/rcv'
import { normalizeVoterName } from '@/lib/voter-name'
import Results from './Results'

type Candidate = { id: string; title: string }
type VoteRow = { ballot_id: string; candidate_id: string; rank: number; voter_name: string }
type Ballot = { id: string; title: string; share_code: string; is_open: boolean }
type PublicResultsResponse = { ballot: Ballot; rounds: RoundResult[]; voteCount: number }

function SortableBook({
  candidate,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  candidate: Candidate
  index: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
      className="flex items-center gap-3 rounded-lg p-4 mb-3 w-full max-w-md shadow-sm cursor-grab active:cursor-grabbing touch-manipulation"
      {...attributes}
      {...listeners}
    >
      <span className="text-2xl font-bold w-8 shrink-0" style={{ color: 'var(--muted)' }}>{index + 1}</span>
      <p className="font-semibold min-w-0 flex-1 break-words">{candidate.title}</p>
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onMoveUp()
          }}
          disabled={isFirst}
          className="h-9 w-9 rounded-md text-sm font-semibold disabled:opacity-30"
          style={{ border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          aria-label={`Move ${candidate.title} up`}
        >
          ↑
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onMoveDown()
          }}
          disabled={isLast}
          className="h-9 w-9 rounded-md text-sm font-semibold disabled:opacity-30"
          style={{ border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          aria-label={`Move ${candidate.title} down`}
        >
          ↓
        </button>
      </div>
    </div>
  )
}

export default function VoteClient({ ballot, candidates, initialRounds, initialVoteCount }: {
  ballot: Ballot
  candidates: Candidate[]
  initialRounds: RoundResult[]
  initialVoteCount: number
}) {
  const votedSessionKey = `voted:${ballot.id}`
  const [screen, setScreen] = useState<'name' | 'vote' | 'results'>('name')
  const [voterName, setVoterName] = useState('')
  const [nameError, setNameError] = useState('')
  const [items, setItems] = useState(candidates)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [rounds, setRounds] = useState<RoundResult[]>(initialRounds)
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [isClosed, setIsClosed] = useState(!ballot.is_open)
  const [resultsError, setResultsError] = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const refreshResults = useCallback(async () => {
    const res = await fetch(`/api/results/${ballot.share_code}`, { cache: 'no-store' })

    if (!res.ok) {
      setResultsError('Could not refresh live results.')
      return
    }

    const data = await res.json() as PublicResultsResponse
    setResultsError('')
    setRounds(data.rounds)
    setVoteCount(data.voteCount)
    setIsClosed(!data.ballot.is_open)
  }, [ballot.share_code])

  useEffect(() => {
    if (!ballot.is_open) {
      const closeTimer = window.setTimeout(() => {
        setScreen('results')
      }, 0)

      return () => {
        window.clearTimeout(closeTimer)
      }
    }

    const restoreTimer = window.setTimeout(() => {
      const savedVoterName = window.sessionStorage.getItem(votedSessionKey)
      if (!savedVoterName) return

      setVoterName(savedVoterName)
      setScreen('results')
    }, 0)

    return () => {
      window.clearTimeout(restoreTimer)
    }
  }, [ballot.is_open, votedSessionKey])

  useEffect(() => {
    if (screen !== 'results') return

    const refreshTimer = window.setTimeout(() => {
      void refreshResults()
    }, 0)
    const refreshInterval = window.setInterval(() => {
      void refreshResults()
    }, 3000)

    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(refreshInterval)
    }
  }, [refreshResults, screen])

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

  function moveItem(index: number, direction: -1 | 1) {
    setItems(items => {
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= items.length) return items
      return arrayMove(items, index, newIndex)
    })
  }

  function handleNameSubmit() {
    const displayName = normalizeVoterName(voterName)
    if (!displayName) return setNameError('Please enter your name')

    setVoterName(displayName)
    setNameError('')
    setScreen('vote')
  }

  async function handleVoteSubmit() {
    setSubmitting(true)
    setVoteError('')

    const rankings: VoteRow[] = items.map((item, index) => ({
      ballot_id: ballot.id,
      candidate_id: item.id,
      rank: index + 1,
      voter_name: normalizeVoterName(voterName),
    }))

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings, ballotId: ballot.id, voterName: normalizeVoterName(voterName) })
    })

    if (!res.ok) {
      const data = await res.json()
      setVoteError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    window.sessionStorage.setItem(votedSessionKey, normalizeVoterName(voterName))
    await refreshResults()
    setScreen('results')
    setSubmitting(false)
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
        <Link
          href={`/results/${ballot.share_code}`}
          className="block text-center text-sm mt-4"
          style={{ color: 'var(--muted)' }}
        >
          View results without voting
        </Link>
      </div>
    )
  }

  // Results screen
  if (screen === 'results') {
    return (
      <Results
        rounds={rounds}
        voterName={voterName}
        voteCount={voteCount}
        resultsError={resultsError}
        isClosed={isClosed}
      />
    )
  }

  // Voting screen
  return (
    <div className="w-full max-w-md mt-4">
      <p className="mb-4" style={{ color: 'var(--muted)' }}>Drag to rank the books in your order of preference.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((candidate, index) => (
            <SortableBook
              key={candidate.id}
              candidate={candidate}
              index={index}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onMoveUp={() => moveItem(index, -1)}
              onMoveDown={() => moveItem(index, 1)}
            />
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
