// =============================================================================
// Draw engine — shared logic for lock, simulate, publish
// Never imported by browser code. Service-role only.
// =============================================================================

export type DrawMode = 'random' | 'algorithmic'

export type ScoredEntry = {
  entryId: string
  userId: string
  scores: number[]       // the 5 frozen stableford values
  dates: string[]        // the 5 frozen played_on dates
  matchCount: number
  distinctScores: number // warn when < 5 (duplicates reduce match opportunities)
}

export type TierResult = {
  winners: ScoredEntry[]
  prizePerWinner: number  // integer paise
  totalPrize: number      // integer paise
  rollover: number        // paise rolled to next jackpot (tier-5 only when no winners)
}

export type DrawResult = {
  drawnNumbers: number[]
  tier5: TierResult
  tier4: TierResult
  tier3: TierResult
  jackpotRolloverOut: number  // paise added to next draw's jackpot_rollover_in
  totalEntries: number
  sandboxMode: boolean        // true when cashPrizeDrawEnabled = false
}

// ---------------------------------------------------------------------------
// Cryptographically secure number generation (Deno Web Crypto API)
// Draws 5 unique integers from [1, 45] using rejection sampling.
// ---------------------------------------------------------------------------
export function secureDrawNumbers(): number[] {
  const result = new Set<number>()
  while (result.size < 5) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    // Map to [1, 45]: buf[0] % 45 gives [0,44], +1 gives [1,45]
    // Rejection sampling: discard values that would bias the distribution.
    // 2^32 = 4294967296; 4294967296 % 45 = 1 (bias zone is [4294967251, 4294967295])
    const LIMIT = 4294967296 - (4294967296 % 45)
    if (buf[0] >= LIMIT) continue
    result.add((buf[0] % 45) + 1)
  }
  return Array.from(result).sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// Algorithmic mode: deterministic from a pre-published formula.
// Formula: SHA-256( drawId || cycleMonth || algoFormulaHash || entryCount )
// The formula hash is published before entries lock so it's auditable.
// Output: derive 5 numbers from the hash bytes using the same rejection method.
// ---------------------------------------------------------------------------
export async function algorithmicDrawNumbers(
  drawId: string,
  cycleMonth: string,
  algoFormulaHash: string,
  entryCount: number,
): Promise<number[]> {
  const input = `${drawId}:${cycleMonth}:${algoFormulaHash}:${entryCount}`
  const encoded = new TextEncoder().encode(input)
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(hashBuf)

  // Derive numbers from hash bytes using rejection sampling
  const result = new Set<number>()
  let byteIdx = 0
  while (result.size < 5) {
    if (byteIdx + 4 > bytes.length) {
      // Re-hash with a counter suffix if we exhaust the 32 bytes
      const ext = new TextEncoder().encode(`${input}:ext${byteIdx}`)
      const extBuf = await crypto.subtle.digest('SHA-256', ext)
      bytes.set(new Uint8Array(extBuf))
      byteIdx = 0
    }
    const val = (bytes[byteIdx] << 24 | bytes[byteIdx+1] << 16 | bytes[byteIdx+2] << 8 | bytes[byteIdx+3]) >>> 0
    byteIdx += 4
    const LIMIT = 4294967296 - (4294967296 % 45)
    if (val >= LIMIT) continue
    result.add((val % 45) + 1)
  }
  return Array.from(result).sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// Score matching
// Counts how many of the entry's 5 score values appear in drawnNumbers.
// Duplicate score values count only once per distinct value.
// ---------------------------------------------------------------------------
export function scoreEntry(
  entry: { id: string; user_id: string; score_snapshot: number[]; score_date_snapshot: string[] },
  drawnNumbers: number[],
): ScoredEntry {
  const scores = entry.score_snapshot as number[]
  const distinctScores = new Set(scores).size
  // Match against distinct score values only — duplicates don't give extra matches
  const distinctValues = Array.from(new Set(scores))
  const matchCount = distinctValues.filter(s => drawnNumbers.includes(s)).length

  return {
    entryId: entry.id,
    userId: entry.user_id,
    scores,
    dates: entry.score_date_snapshot as string[],
    matchCount,
    distinctScores,
  }
}

// ---------------------------------------------------------------------------
// Prize tier calculation
// All amounts in integer paise. No floating point.
// Tier 5 (5 matches): 40% of reward pool + jackpot rollover in
// Tier 4 (4 matches): 35% of reward pool
// Tier 3 (3 matches): 25% of reward pool
// Unclaimed tier-5 rolls over. Tier 3/4 do not roll over.
// ---------------------------------------------------------------------------
export function calculateTiers(
  scored: ScoredEntry[],
  rewardPoolPaise: number,
  jackpotRolloverIn: number,
): { tier5: TierResult; tier4: TierResult; tier3: TierResult; jackpotRolloverOut: number } {
  // Integer paise — use Math.floor to avoid fractional paise
  const tier5Pool = Math.floor(rewardPoolPaise * 40 / 100) + jackpotRolloverIn
  const tier4Pool = Math.floor(rewardPoolPaise * 35 / 100)
  const tier3Pool = Math.floor(rewardPoolPaise * 25 / 100)

  const t5 = scored.filter(e => e.matchCount === 5)
  const t4 = scored.filter(e => e.matchCount === 4)
  const t3 = scored.filter(e => e.matchCount === 3)

  const tier5: TierResult = {
    winners: t5,
    prizePerWinner: t5.length > 0 ? Math.floor(tier5Pool / t5.length) : 0,
    totalPrize: t5.length > 0 ? tier5Pool : 0,
    rollover: t5.length === 0 ? tier5Pool : 0,
  }

  const tier4: TierResult = {
    winners: t4,
    prizePerWinner: t4.length > 0 ? Math.floor(tier4Pool / t4.length) : 0,
    totalPrize: t4.length > 0 ? tier4Pool : 0,
    rollover: 0, // tier 4 never rolls over
  }

  const tier3: TierResult = {
    winners: t3,
    prizePerWinner: t3.length > 0 ? Math.floor(tier3Pool / t3.length) : 0,
    totalPrize: t3.length > 0 ? tier3Pool : 0,
    rollover: 0, // tier 3 never rolls over
  }

  return { tier5, tier4, tier3, jackpotRolloverOut: tier5.rollover }
}
