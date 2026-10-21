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
  prefix: string[];
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

/** Lowercase and strip everything that isn't a letter ("Fastball!" -> "fastball"). */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
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
export function matchPitches(transcript: string): PitchMatch[] {
  const words = transcript
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(Boolean);
  const normalized = words.map(normalizeWord);
  const matches: PitchMatch[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const word = normalized[i];
    if (!word) continue;

    let matchedThisWord = false;

    for (const [pitch, entry] of Object.entries(ballTypes)) {
      if (matchedThisWord) break;

      // 1a. The word IS the pitch name (index 0 of "full" is the exact spelling).
      const exactFull = entry.full.find((f, idx) => idx === 0 && f === word);
      if (exactFull) {
        matches.push({ pitch, matchedWord: word, method: 'exact' });
        matchedThisWord = true;
        break;
      }

      // 1b. The word SOUNDS LIKE the pitch name ("festival" -> fastball).
      const soundAlike = entry.full.slice(1).find(f => f === word);
      if (soundAlike) {
        matches.push({ pitch, matchedWord: word, method: 'sound-alike' });
        matchedThisWord = true;
        break;
      }

      // 2. Prefix + suffix pair ("fast ball").
      const next = normalized[i + 1];
      if (next && entry.prefix.some(p => looksLike(p, word)) && ballSuffixes.some(s => looksLike(s, next))) {
        matches.push({ pitch, matchedWord: `${word} ${next}`, method: 'exact' });
        normalized[i + 1] = ''; // consume the suffix so "ball" can't double-match
        i += 1;
        matchedThisWord = true;
        break;
      }
    }

    // 3. Last-chance fuzzy match, e.g. "fastboll" -> fastball.
    if (!matchedThisWord && word.length >= 4) {
      for (const [pitch, entry] of Object.entries(ballTypes)) {
        const closest = entry.full.find(f => looksLike(word, f));
        if (closest) {
          matches.push({ pitch, matchedWord: word, method: 'fuzzy' });
          break;
        }
      }
    }
  }

  return matches;
}
