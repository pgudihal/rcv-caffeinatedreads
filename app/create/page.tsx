'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [books, setBooks] = useState(['', ''])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateBook(index: number, value: string) {
    setBooks(books => books.map((b, i) => i === index ? value : b))
  }

  function addBook() {
    setBooks(books => [...books, ''])
  }

  function removeBook(index: number) {
    setBooks(books => books.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setError('')
    const filledBooks = books.filter(b => b.trim())

    if (!title.trim()) return setError('Ballot title is required')
    if (filledBooks.length < 2) return setError('At least 2 books are required')

    setSubmitting(true)

    const res = await fetch('/api/create-ballot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, candidates: filledBooks })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setSubmitting(false)
      return
    }

    router.push(`/vote/${data.shareCode}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-2">Create Ballot</h1>
      <p className="mb-8" style={{ color: 'var(--muted)' }}>Set up a new vote for your book club.</p>

      <div className="w-full max-w-md">

        <label className="block text-sm font-semibold mb-1">Ballot Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. May Book Vote"
          className="w-full rounded-lg p-3 mb-6"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
        />

        <label className="block text-sm font-semibold mb-1">Books</label>
        {books.map((book, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={book}
              onChange={e => updateBook(index, e.target.value)}
              placeholder={`Book ${index + 1}`}
              className="flex-1 rounded-lg p-3"
              style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            />
            {books.length > 2 && (
              <button
                onClick={() => removeBook(index)}
                className="px-3 rounded-lg"
                style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addBook}
          className="w-full py-2 rounded-lg text-sm mb-6 transition-colors"
          style={{ border: '1px dashed var(--card-border)', color: 'var(--muted)' }}
        >
          + Add another book
        </button>

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
          style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        >
          {submitting ? 'Creating...' : 'Create Ballot'}
        </button>

      </div>
    </main>
  )
}
