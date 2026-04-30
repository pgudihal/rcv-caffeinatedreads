import Link from 'next/link'
import { getPublicResultsByCode } from '@/lib/public-results'
import LiveResults from './LiveResults'

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const result = await getPublicResultsByCode(code)

  if (!result.data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
        <p>{result.error}</p>
      </main>
    )
  }

  const { ballot, rounds, voteCount } = result.data

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Back to home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{ballot.title}</h1>
      <p className="mb-8" style={{ color: 'var(--muted)' }}>Live results</p>

      <LiveResults
        ballot={ballot}
        initialRounds={rounds}
        initialVoteCount={voteCount}
      />
    </main>
  )
}
