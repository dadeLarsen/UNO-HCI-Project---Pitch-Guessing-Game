import ballSuffixRaw from '../static/importantWords/balltypes/ballSuffix.jsonc?raw';
import fullAndPrefixRaw from '../static/importantWords/balltypes/fullAndPrefix.jsonc?raw';

/**
 * Loads the hand-written pitch-name word lists and matches transcripts
 * (from speech recognition) against them.
 *
 * The word lists are .jsonc — JSON with // comments — so they can't be
 * imported as plain JSON. We strip comments with a deliberately simple
 * regex (the lists never contain "//" inside a string) and JSON.parse
 * the result at module load. The files are tiny, so there's no perf worry.
 */

interface BallTypeEntry {
  /** Words that ARE the whole pitch name ("fastball") or sound like it ("festival"). */
  full: string[];
  /** Words that START a pitch name ("fast") and need a suffix word to complete it ("ball"). */
  prefix?: string[];
}

type BallTypeMap = Record<string, BallTypeEntry>;

function stripJsonComments(raw: string): string {
  return raw
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n')
    .replace(/,(\s*[}\]])/g, '$1'); // tolerate trailing commas
}

function loadBallTypes(): BallTypeMap {
  return JSON.parse(stripJsonComments(fullAndPrefixRaw)) as BallTypeMap;
}

function loadSuffixes(): string[] {
  return (JSON.parse(stripJsonComments(ballSuffixRaw)) as string[]).map(w => w.toLowerCase());
}

const ballTypes: BallTypeMap = loadBallTypes();
const ballSuffixes: string[] = loadSuffixes();

/**
 * Lowercase and strip everything that isn't a letter or digit
 * ("Fastball!" -> "fastball", "4-Seamer" -> "4seamer").
 *
 * Digits are kept on purpose: "2-seamer" and "4-seamer" are different
 * pitches, and dropping the digit would make both normalize to "seamer".
 */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Digits are part of the pitch name, so they must match exactly. */
function sameNumbers(a: string, b: string): boolean {
  const digits = (value: string) => (value.match(/\d/g) ?? []).join('');
  return digits(a) === digits(b);
}

/**
 * Tries to read `candidate` from consecutive transcript tokens starting at
 * `start`, and returns how many tokens it used (or 0 for no match).
 *
 * Normalization removes spaces and hyphens, so this lets
 * "4-seam-fastball", "4 seam fastball" and "4seamfastball" all match.
 */
function tokensForCandidate(normalized: string[], start: number, candidate: string): number {
  if (!candidate) return 0;

  let combined = '';
  for (let i = start; i < normalized.length; i++) {
    if (!normalized[i]) break;
    combined += normalized[i];
    if (combined === candidate) return i - start + 1;
    if (!candidate.startsWith(combined)) return 0;
  }
  return 0;
}

/** Classic Levenshtein edit distance — used to forgive small mis-transcriptions. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = new Array(rows * cols).fill(0);
  for (let i = 0; i < rows; i++) dist[i * cols] = i;
  for (let j = 0; j < cols; j++) dist[j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i * cols + j] = Math.min(
        dist[(i - 1) * cols + j] + 1, // deletion
        dist[i * cols + j - 1] + 1, // insertion
        dist[(i - 1) * cols + j - 1] + cost, // substitution
      );
    }
  }
  return dist[rows * cols - 1];
}

/**
 * How wrong a word can be and still count:
 *  - up to 1 typo for short words (<= 6 letters)
 *  - up to 2 typos for longer words (speech engines mangle "knuckleball" badly)
 */
function toleranceFor(word: string): number {
  return word.length >= 7 ? 2 : 1;
}

function looksLike(word: string, candidate: string): boolean {
  return word === candidate || editDistance(word, candidate) <= toleranceFor(candidate);
}

export type MatchMethod = 'exact' | 'sound-alike' | 'fuzzy';

export interface PitchMatch {
  /** The canonical pitch name, e.g. "fastball". */
  pitch: string;
  /** The word from the transcript that triggered the match. */
  matchedWord: string;
  /** How confident the *matcher* is, independent of the recognizer's own confidence. */
  method: MatchMethod;

  isCorrect: boolean;
  /** Character offset where the match starts in the transcript. */
  startIndex: number;
  /** Character offset just past the end of the match (exclusive). */
  endIndex: number;
}

/**
 * Scans a transcript for pitch names.
 *
 * A pitch is recognized when we see:
 *   1. a "full" word for the pitch ("fastball", or the sound-alike "festival"), or
 *   2. a "prefix" word immediately followed by a ball-suffix word
 *      ("fast" + "ball", "fast" + "bowl")
 *
 * On top of that exact/sound-alike logic we allow a small edit distance so a
 * slightly mangled transcription ("fastboll") still scores.
 */
export function matchPitches(transcript: string, correctAnswer = ''): PitchMatch[] {
  const tokens = Array.from(transcript.toLowerCase().matchAll(/[a-z0-9']+/g), match => {
    const raw = match[0];
    const start = match.index ?? 0;
    return {
      raw,
      normalized: normalizeWord(raw),
      start,
      end: start + raw.length,
    };
  });
  const normalized = tokens.map(token => token.normalized);
  const matches: PitchMatch[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const word = normalized[i];
    if (!word) continue;

    let matchedThisWord = false;

    for (const [pitch, entry] of Object.entries(ballTypes)) {
      if (matchedThisWord) break;

      // 1a. The word IS the pitch name (index 0 of "full" is the exact spelling).
      const consumedExact = tokensForCandidate(normalized, i, normalizeWord(entry.full[0]));
      if (consumedExact) {
        matches.push({
          pitch,
          matchedWord: tokens.slice(i, i + consumedExact).map(token => token.raw).join(' '),
          method: 'exact',
          isCorrect: pitch == correctAnswer,
          startIndex: tokens[i].start,
          endIndex: tokens[i + consumedExact - 1].end,
        });
        i += consumedExact - 1;
        matchedThisWord = true;
        break;
      }

      // 1b. The word SOUNDS LIKE the pitch name ("festival" -> fastball).
      const soundAlike = entry.full.slice(1)
        .map(f => ({ f, consumed: tokensForCandidate(normalized, i, normalizeWord(f)) }))
        .find(match => match.consumed > 0);
      if (soundAlike) {
        matches.push({
          pitch,
          matchedWord: tokens.slice(i, i + soundAlike.consumed).map(token => token.raw).join(' '),
          method: 'sound-alike',
          isCorrect: pitch == correctAnswer,
          startIndex: tokens[i].start,
          endIndex: tokens[i + soundAlike.consumed - 1].end,
        });
        i += soundAlike.consumed - 1;
        matchedThisWord = true;
        break;
      }

      // 2. Prefix + suffix pair ("fast ball").
      const next = normalized[i + 1];
      if (next && entry.prefix?.some(p => looksLike(p, word)) && ballSuffixes.some(s => looksLike(s, next))) {
        matches.push({
          pitch,
          matchedWord: `${tokens[i].raw} ${tokens[i + 1].raw}`,
          method: 'exact',
          isCorrect: pitch == correctAnswer,
          startIndex: tokens[i].start,
          endIndex: tokens[i + 1].end,
        });
        normalized[i + 1] = ''; // consume the suffix so "ball" can't double-match
        i += 1;
        matchedThisWord = true;
        break;
      }
    }

    // 3. Last-chance fuzzy match, e.g. "fastboll" -> fastball.
    if (!matchedThisWord && word.length >= 4) {
      for (const [pitch, entry] of Object.entries(ballTypes)) {
        const closest = entry.full.find(f => {
          const candidate = normalizeWord(f);
          // Don't let a missing/wrong digit turn "2-seamer" into "4-seamer"
          // (or a bare "seamer" into one of them by accident).
          return sameNumbers(word, candidate) && looksLike(word, candidate);
        });
        if (closest) {
          matches.push({
            pitch,
            matchedWord: tokens[i].raw,
            method: 'fuzzy',
            isCorrect: pitch == correctAnswer,
            startIndex: tokens[i].start,
            endIndex: tokens[i].end,
          });
          break;
        }
      }
    }
  }

  return matches;
}
