'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Candidate = {
  id: string
  title: string
}

// Single draggable book item
function SortableBook({ candidate, index }: { candidate: Candidate, index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

return (
  <div
    ref={setNodeRef}
    style={{
      ...style,
      background: 'var(--card-background)',
      border: '1px solid var(--card-border)',
    }}
    className="flex items-center gap-4 rounded-lg p-4 mb-3 w-full max-w-md shadow-sm cursor-grab active:cursor-grabbing"
    {...attributes}
    {...listeners}
  >
    <span className="text-2xl font-bold w-8" style={{ color: 'var(--muted)' }}>{index + 1}</span>
    <div>
      <p className="font-semibold">{candidate.title}</p>
    </div>
    <span className="ml-auto" style={{ color: 'var(--muted)' }}>⠿</span>
  </div>
)
}

// The main ballot component
export default function BallotClient({ candidates, ballotId }: { candidates: Candidate[], ballotId: string }) {
  const [items, setItems] = useState(candidates)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  async function handleSubmit() {
    setSubmitting(true)
    const rankings = items.map((item, index) => ({
      ballot_id: ballotId,
      candidate_id: item.id,
      rank: index + 1
    }))

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings })
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      alert('Something went wrong, please try again.')
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-4xl mb-4">🎉</p>
        <p className="text-xl font-semibold">Vote submitted!</p>
        <p className="text-gray-400">Thanks for voting.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((candidate, index) => (
            <SortableBook key={candidate.id} candidate={candidate} index={index} />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-4 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Rankings'}
      </button>
    </div>
  )
}