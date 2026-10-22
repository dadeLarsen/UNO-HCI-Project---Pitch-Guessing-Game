import { describe, expect, it } from 'vitest';
import { editDistance, matchPitches, normalizeWord } from './pitchMatcher';

describe('normalizeWord', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeWord('Fastball!')).toBe('fastball');
    expect(normalizeWord('  Curve-Ball ')).toBe('curveball');
  });
});

describe('editDistance', () => {
  it('is 0 for identical words', () => {
    expect(editDistance('ball', 'ball')).toBe(0);
  });
  it('counts single edits', () => {
    expect(editDistance('ball', 'balls')).toBe(1);
  });
  it('counts multiple substitutions', () => {
    expect(editDistance('ball', 'bowl')).toBe(2);
  });
  it('handles the classic kitten -> sitting example', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('matchPitches', () => {
  it('finds an exact pitch name', () => {
    const matches = matchPitches('I threw a fastball right past him');
    expect(matches).toHaveLength(1);
    expect(matches[0].pitch).toBe('fastball');
    expect(matches[0].method).toBe('exact');
  });

  it('accepts the hand-written sound-alike word "festival"', () => {
    const matches = matchPitches('that was a festival');
    expect(matches).toHaveLength(1);
    expect(matches[0].pitch).toBe('fastball');
    expect(matches[0].method).toBe('sound-alike');
  });

  it('joins a prefix word with a following suffix word ("fast ball")', () => {
    const matches = matchPitches('he hit my fast ball');
    expect(matches).toHaveLength(1);
    expect(matches[0].pitch).toBe('fastball');
    expect(matches[0].matchedWord).toBe('fast ball');
  });

  it('forgives a slightly mangled transcription ("fastboll")', () => {
    const matches = matchPitches('fastboll');
    expect(matches).toHaveLength(1);
    expect(matches[0].pitch).toBe('fastball');
    expect(matches[0].method).toBe('fuzzy');
  });

  it('finds multiple pitches in one sentence', () => {
    const matches = matchPitches('a fastball then a festival');
    expect(matches.map(m => m.pitch)).toEqual(['fastball', 'fastball']);
  });

  it('recognizes every pitch family from the pitch display', () => {
    const matches = matchPitches(
      'changeup curveball cutter four seamer two seamer screwball slider slurve splitter sweeper knuckleball',
    );
    expect(matches.map(m => m.pitch)).toEqual([
      'changeup',
      'curveball',
      'cutter',
      '4-seamer',
      '2-seamer',
      'screwball',
      'slider',
      'slurve',
      'splitter',
      'sweeper',
      'knuckleball',
    ]);
  });

  it('ignores words that are not pitch names', () => {
    expect(matchPitches('the batter struck out')).toHaveLength(0);
  });
});
