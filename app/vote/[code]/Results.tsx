import { RoundResult } from '@/lib/rcv'

export default function Results({
  rounds,
  voterName,
  voteCount,
  resultsError,
}: {
  rounds: RoundResult[]
  voterName: string
  voteCount: number
  resultsError: string
}) {
  const winner = rounds.at(-1)?.winner

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Thanks for voting, {voterName}!</p>
        <h2 className="text-2xl font-bold">Winner: {winner ?? 'Waiting for votes'}</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Live results from {voteCount} voter{voteCount !== 1 ? 's' : ''}
        </p>
      </div>

      {resultsError && <p className="text-red-400 mb-4 text-sm">{resultsError}</p>}

      <h3 className="font-semibold mb-4" style={{ color: 'var(--muted)' }}>Round by round</h3>

      {rounds.map(round => (
        <div
          key={round.round}
          className="rounded-lg p-4 mb-3"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
        >
          <p className="font-semibold mb-3">Round {round.round}</p>
          {Object.entries(round.counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => {
              const total = Object.values(round.counts).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const isWinner = name === round.winner
              const isEliminated = name === round.eliminated

              return (
                <div key={name} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: isEliminated ? 'var(--muted)' : 'var(--foreground)' }}>
                      {name}
                      {isWinner && ' 🏆'}
                      {isEliminated && ' ✕'}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>{count} vote{count !== 1 ? 's' : ''}</span>
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
          {round.eliminated && (
            <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
              <span>{round.eliminated}</span> was eliminated this round
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
