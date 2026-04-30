import { RoundResult } from '@/lib/rcv'

export default function Results({
  rounds,
  voterName,
  voteCount,
  resultsError,
  isClosed = false,
}: {
  rounds: RoundResult[]
  voterName?: string
  voteCount: number
  resultsError: string
  isClosed?: boolean
}) {
  const winner = rounds.at(-1)?.winner

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        {voterName && (
          <>
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Thanks for voting, {voterName}!</p>
          </>
        )}
        <h2 className="text-2xl font-bold">Winner: {winner ?? 'Waiting for votes'}</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Live results from {voteCount} voter{voteCount !== 1 ? 's' : ''}
        </p>
        {isClosed && (
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Voting is closed.
          </p>
        )}
      </div>

      {resultsError && <p className="text-red-400 mb-4 text-sm">{resultsError}</p>}

      <h3 className="font-semibold mb-4" style={{ color: 'var(--muted)' }}>Round by round</h3>

      {rounds.length === 0 && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
        >
          No votes have been submitted yet.
        </div>
      )}

      {[...rounds].reverse().map(round => (
        <RoundStats key={round.round} round={round} />
      ))}
    </div>
  )
}

function RoundStats({ round }: { round: RoundResult }) {
  const entries = Object.entries(round.counts).sort(([, a], [, b]) => b - a)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const majorityNeeded = Math.floor(total / 2) + 1
  const leader = entries[0]
  const leaderNeeds = leader ? Math.max(majorityNeeded - leader[1], 0) : 0

  return (
    <div
      className="rounded-lg p-4 mb-3"
      style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold">Round {round.round}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {total} active vote{total !== 1 ? 's' : ''} · {majorityNeeded} needed to win
          </p>
        </div>
        {leader && (
          <div className="text-right text-xs min-w-0" style={{ color: 'var(--muted)' }}>
            <p>Leader</p>
            <p className="font-semibold break-words" style={{ color: 'var(--foreground)' }}>{leader[0]}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
        <div className="rounded-md p-2" style={{ background: 'var(--background)' }}>
          <p className="font-semibold">{entries.length}</p>
          <p style={{ color: 'var(--muted)' }}>remaining</p>
        </div>
        <div className="rounded-md p-2" style={{ background: 'var(--background)' }}>
          <p className="font-semibold">{majorityNeeded}</p>
          <p style={{ color: 'var(--muted)' }}>majority</p>
        </div>
        <div className="rounded-md p-2" style={{ background: 'var(--background)' }}>
          <p className="font-semibold">{leaderNeeds}</p>
          <p style={{ color: 'var(--muted)' }}>leader needs</p>
        </div>
      </div>

      {entries.map(([name, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const isWinner = name === round.winner
        const isEliminated = name === round.eliminated

        return (
          <div key={name} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="min-w-0 break-words pr-2" style={{ color: isEliminated ? 'var(--muted)' : 'var(--foreground)' }}>
                {name}
                {isWinner && ' 🏆'}
                {isEliminated && ' ✕'}
              </span>
              <span style={{ color: 'var(--muted)' }}>
                {count} vote{count !== 1 ? 's' : ''} · {pct}%
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: 'var(--card-border)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: isWinner ? '#22c55e' : isEliminated ? 'var(--muted)' : 'var(--foreground)'
                }}
              />
            </div>
          </div>
        )
      })}

      {round.winner && (
        <p className="text-xs mt-3" style={{ color: '#22c55e' }}>
          <span className="font-semibold">{round.winner}</span> reached a majority in this round.
        </p>
      )}
      {round.eliminated && (
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
          <span>{round.eliminated}</span> was eliminated this round and those ballots transfer next.
        </p>
      )}
      {round.tieBreak && (
        <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
          Tie-break: <span>{round.tieBreak.selected}</span> was randomly selected for elimination from {round.tieBreak.tied.join(', ')}.
        </p>
      )}
    </div>
  )
}
