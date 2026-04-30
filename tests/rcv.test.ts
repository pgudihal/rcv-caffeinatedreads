import assert from 'node:assert/strict'
import test from 'node:test'
import { runRCV } from '../lib/rcv'

const candidates = [
  { id: 'a', title: 'Book A' },
  { id: 'b', title: 'Book B' },
  { id: 'c', title: 'Book C' },
]

function rankedVote(voterName: string, candidateIds: string[]) {
  return candidateIds.map((candidate_id, index) => ({
    candidate_id,
    rank: index + 1,
    voter_name: voterName,
  }))
}

test('returns no rounds when no votes have been submitted', () => {
  assert.deepEqual(runRCV([], candidates), [])
})

test('elects a first-round majority winner', () => {
  const rounds = runRCV([
    ...rankedVote('Alice', ['a', 'b', 'c']),
    ...rankedVote('Bob', ['a', 'c', 'b']),
    ...rankedVote('Casey', ['b', 'a', 'c']),
  ], candidates)

  assert.equal(rounds.length, 1)
  assert.equal(rounds[0].winner, 'Book A')
  assert.deepEqual(rounds[0].counts, {
    'Book A': 2,
    'Book B': 1,
    'Book C': 0,
  })
})

test('transfers ballots after eliminating the lowest candidate', () => {
  const rounds = runRCV([
    ...rankedVote('Alice', ['a', 'b', 'c']),
    ...rankedVote('Bob', ['a', 'b', 'c']),
    ...rankedVote('Casey', ['b', 'a', 'c']),
    ...rankedVote('Devin', ['b', 'a', 'c']),
    ...rankedVote('Emery', ['c', 'a', 'b']),
  ], candidates)

  assert.equal(rounds.length, 2)
  assert.equal(rounds[0].eliminated, 'Book C')
  assert.deepEqual(rounds[0].counts, {
    'Book A': 2,
    'Book B': 2,
    'Book C': 1,
  })
  assert.equal(rounds[1].winner, 'Book A')
  assert.deepEqual(rounds[1].counts, {
    'Book A': 3,
    'Book B': 2,
  })
})

test('records deterministic random tie-breaks for elimination ties', () => {
  const votes = [
    ...rankedVote('Alice', ['a', 'b', 'c']),
    ...rankedVote('Bob', ['b', 'a', 'c']),
    ...rankedVote('Casey', ['c', 'a', 'b']),
  ]

  const firstRun = runRCV(votes, candidates)
  const secondRun = runRCV(votes, candidates)

  assert.deepEqual(firstRun, secondRun)
  assert.ok(firstRun[0].tieBreak)
  assert.deepEqual(firstRun[0].tieBreak?.tied, ['Book A', 'Book B', 'Book C'])
  assert.equal(firstRun[0].tieBreak?.selected, firstRun[0].eliminated)
})
