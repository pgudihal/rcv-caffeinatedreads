export type RoundResult = {
  round: number
  counts: Record<string, number>
  eliminated: string | null
  winner: string | null
  tieBreak: {
    tied: string[]
    selected: string
  } | null
}

export function runRCV(
  ballots: { candidate_id: string; rank: number; voter_name: string }[],
  candidates: { id: string; title: string }[]
): RoundResult[] {
  if (ballots.length === 0) {
    return []
  }

  const rounds: RoundResult[] = []
  const remaining = new Set(candidates.map(c => c.id))
  const nameOf = Object.fromEntries(candidates.map(c => [c.id, c.title]))
  const candidateOrder = Object.fromEntries(candidates.map((c, index) => [c.id, index]))

  // Group votes by voter
  const voters = new Map<string, string[]>()
  for (const vote of ballots) {
    if (!voters.has(vote.voter_name)) voters.set(vote.voter_name, [])
    voters.get(vote.voter_name)!.push(vote.candidate_id)
  }

  // Sort each voter's picks by rank
  const sortedBallots = new Map<string, string[]>()
  for (const voter of voters.keys()) {
    const picks = ballots
      .filter(v => v.voter_name === voter)
      .sort((a, b) => a.rank - b.rank)
      .map(v => v.candidate_id)
    sortedBallots.set(voter, picks)
  }

  let roundNum = 1

  while (remaining.size > 1) {
    // Count first choice votes among remaining candidates
    const counts: Record<string, number> = {}
    for (const id of remaining) counts[id] = 0

    for (const picks of sortedBallots.values()) {
      const topChoice = picks.find(id => remaining.has(id))
      if (topChoice) counts[topChoice]++
    }

    const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
    const majority = totalVotes / 2

    // Check for winner
    const winner = Object.entries(counts).find(([, count]) => count > majority)
    if (winner) {
      rounds.push({
        round: roundNum,
        counts: Object.fromEntries(Object.entries(counts).map(([id, n]) => [nameOf[id], n])),
        eliminated: null,
        winner: nameOf[winner[0]],
        tieBreak: null
      })
      break
    }

    // Eliminate candidate with fewest votes
    const minVotes = Math.min(...Object.values(counts))
    const tiedForElimination = Object.entries(counts)
      .filter(([, count]) => count === minVotes)
      .map(([id]) => id)
      .sort((a, b) => candidateOrder[a] - candidateOrder[b])
    const eliminated = pickTieBreakCandidate(tiedForElimination, roundNum)
    remaining.delete(eliminated)

    rounds.push({
      round: roundNum,
      counts: Object.fromEntries(Object.entries(counts).map(([id, n]) => [nameOf[id], n])),
      eliminated: nameOf[eliminated],
      winner: null,
      tieBreak: tiedForElimination.length > 1
        ? {
            tied: tiedForElimination.map(id => nameOf[id]),
            selected: nameOf[eliminated]
          }
        : null
    })

    roundNum++
  }

  // If only one candidate remains
  if (remaining.size === 1 && !rounds.at(-1)?.winner) {
    const lastId = [...remaining][0]
    rounds.at(-1)!.winner = nameOf[lastId]
  }

  return rounds
}

function pickTieBreakCandidate(candidateIds: string[], round: number) {
  if (candidateIds.length === 1) return candidateIds[0]

  const seed = `${round}:${candidateIds.join(':')}`
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return candidateIds[hash % candidateIds.length]
}
