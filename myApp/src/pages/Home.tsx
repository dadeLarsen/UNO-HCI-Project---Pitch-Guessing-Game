import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonTitle,
} from '@ionic/react';
import { micOffOutline, micOutline, refreshOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { matchPitches } from '../lib/pitchMatcher';
import type { MatchMethod } from '../lib/pitchMatcher';
import './Home.css';
import PitchDisplay from '../components/PitchDisplay';
import pitchVideos from '../static/importantWords/balltypes/pitchVideos.json';

interface Guess {
  id: number;
  pitch: string;
  matchedWord: string;
  method: MatchMethod;
  isCorrect: boolean;
}

export interface PitchToGuess {
  /** Bumped every round so the <video> remounts paused at 0s, even if the clip repeats. */
  id: number;
  pitchType: string;
  videoUrl: string | null;
}

interface RoundResult {
  isCorrect: boolean;
  pitch: string;
}

/** pitchVideos.json: pitch name -> { videos: string[] }. */
type VideoCatalog = Record<string, { videos: string[] }>;

const videoCatalog = pitchVideos as VideoCatalog;
// The JSON is the single source of truth for which pitches exist (and their clips).
const allPitchTypes = Object.keys(videoCatalog);

/** How long to keep the result on screen after the reveal clip finishes. */
const ADVANCE_DELAY_MS = 900;
/** Fallback pause before advancing when the clip can't play (blocked autoplay, load error). */
const REVEAL_FALLBACK_MS = 1500;

const METHOD_LABELS: Record<MatchMethod, string> = {
  exact: 'exact match',
  'sound-alike': 'heard as a look-alike word',
  fuzzy: 'close enough (forgave typos)',
};

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was denied. Allow it in your browser settings and try again.',
  'service-not-allowed': 'The browser blocked the speech service.',
  network: 'The speech service needs a network connection.',
  'no-speech': 'Did not hear any speech — try again.',
  unsupported: 'This browser does not support the Web Speech API. Please use Chrome.',
};

const DEFAULT_PITCH: PitchToGuess = { id: 0, pitchType: 'default', videoUrl: null };

const Home: React.FC = () => {
  const { isSupported, isListening, interimTranscript, finalTranscript, error, start, stop, clear } =
    useSpeechRecognition('en-US');

  const [correctPitch, setCorrectPitch] = useState<PitchToGuess>(DEFAULT_PITCH);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // How much of finalTranscript we've already scanned for pitch names, so we
  // never score the same words twice.
  const matchedUpToRef = useRef(0);
  // Once a round has been guessed we stop scoring until the next pitch loads.
  const roundLockedRef = useRef(false);
  const roundIdRef = useRef(0);
  const advanceTimerRef = useRef<number | null>(null);
  // Lets the scoring effect read the current pitch without re-running on pitch change.
  const correctPitchRef = useRef(correctPitch);

  useEffect(() => {
    correctPitchRef.current = correctPitch;
  }, [correctPitch]);

  const cancelAdvance = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  // Pick a fresh pitch + clip and hold it paused until the player guesses.
  const startRound = useCallback(() => {
    cancelAdvance();
    const pitchType = allPitchTypes[Math.floor(Math.random() * allPitchTypes.length)];
    const videos = videoCatalog[pitchType]?.videos ?? [];
    const videoUrl = videos.length > 0 ? videos[Math.floor(Math.random() * videos.length)] : null;

    roundIdRef.current += 1;
    roundLockedRef.current = false;
    setRoundResult(null);
    setIsRevealing(false);
    setCorrectPitch({ id: roundIdRef.current, pitchType, videoUrl });
  }, [cancelAdvance]);

  // Reveal the clip, then move on to the next pitch once it's shown the result.
  const scheduleAdvance = useCallback(
    (delay: number) => {
      if (advanceTimerRef.current !== null) return;
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        startRound();
      }, delay);
    },
    [startRound],
  );

  const handleVideoEnded = useCallback(() => scheduleAdvance(ADVANCE_DELAY_MS), [scheduleAdvance]);

  // Only skip ahead if we were mid-reveal — a load error while the player is
  // still guessing shouldn't silently end the round.
  const handleVideoError = useCallback(() => {
    if (roundLockedRef.current) scheduleAdvance(REVEAL_FALLBACK_MS);
  }, [scheduleAdvance]);

  // Score new speech. One guess per pitch: the first pitch name heard locks the
  // round, plays the reveal clip and shows the result.
  useEffect(() => {
    if (!finalTranscript) return;
    if (roundLockedRef.current) return;

    // Rescan the whole transcript so a pitch split across recognizer chunks
    // ("4-seam" then "fastball") isn't scored as a bare "fastball". We only
    // keep matches that end after the part we've already handled.
    const found = matchPitches(finalTranscript, correctPitchRef.current.pitchType)
      .filter(match => match.endIndex > matchedUpToRef.current);

    if (found.length === 0) return;

    matchedUpToRef.current = Math.max(
      matchedUpToRef.current,
      ...found.map(match => match.endIndex),
    );

    setGuesses(prev => [
      ...found.map((match, i) => ({ ...match, id: Date.now() + i })),
      ...prev,
    ]);

    const correctGuess = found.find(match => match.isCorrect);
    setRoundResult({
      isCorrect: Boolean(correctGuess),
      pitch: (correctGuess ?? found[0]).pitch,
    });
    roundLockedRef.current = true;
    setIsRevealing(true);
  }, [finalTranscript]);

  // Put the current pitch back to "waiting for a guess" without changing it.
  const resetRound = useCallback(() => {
    roundLockedRef.current = false;
    setRoundResult(null);
    setIsRevealing(false);
    cancelAdvance();
  }, [cancelAdvance]);

  function toggleMicrophone() {
    if (isListening) {
      stop();
      resetRound();
      setCorrectPitch(DEFAULT_PITCH);
    } else {
      startRound();
      start();
    }
  }

  const handleClear = () => {
    clear();
    matchedUpToRef.current = 0;
    setGuesses([]);
    resetRound();
    if (isListening) startRound();
  };

  // Never leave the advance timer running if we unmount mid-reveal.
  useEffect(() => cancelAdvance, [cancelAdvance]);

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? `Speech error: ${error}`) : null;

  return (
    <IonPage>
      <IonHeader>
        <IonTitle>Pitch Guesser</IonTitle>
      </IonHeader>
      {/* <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Pitch Guesser</IonTitle>
        </IonToolbar>
      </IonHeader> */}

      <IonContent>
        <main className="game-shell">
          <section className="media-area">
            <PitchDisplay
              correctPitch={correctPitch}
              isRevealing={isRevealing}
              onVideoEnded={handleVideoEnded}
              onVideoError={handleVideoError}
            />

            {roundResult && (
              <div className="result-overlay" aria-live="polite">
                {roundResult.isCorrect ? (
                  <strong className="result-correct">Correct!</strong>
                ) : (
                  <strong className="result-incorrect">Incorrect</strong>
                )}
                <span>Guessed: {roundResult.pitch}</span>
              </div>
            )}
          </section>

          <section className="matcher-panel" aria-label="Pitch matcher">
            <div className="matcher-heading">
              <div>
                <p className="eyebrow">Pitch matcher</p>
                <h1>Say a pitch name out loud</h1>
              </div>
              <IonButton fill="clear" onClick={handleClear} aria-label="Reset matcher">
                <IonIcon slot="start" icon={refreshOutline} />
                Reset
              </IonButton>
            </div>

            <div className="mic-controls">
              <IonButton
                size="large"
                shape="round"
                color={isListening ? 'danger' : 'primary'}
                onClick={toggleMicrophone}
                disabled={!isSupported}
              >
                <IonIcon slot="start" icon={isListening ? micOffOutline : micOutline} />
                {isListening ? 'Stop' : 'Start listening'}
              </IonButton>
            </div>

            <p className="transcript">
              <span className={isListening ? 'live-dot' : 'live-dot idle'} />
              {isListening
                ? interimTranscript || finalTranscript || 'Listening… say “fastball”!'
                : 'Press Start listening, then speak.'}
            </p>

            {interimTranscript && isListening && (
              <IonNote className="interim-note">hearing: “{interimTranscript}”</IonNote>
            )}

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {!isSupported && (
              <p className="error-message">
                The Web Speech API only works in Chromium browsers — open this app in Chrome.
              </p>
            )}
            {guesses.length > 0 && (
              <div className="guess-list" aria-label="Detected pitches">
                {guesses.map(guess => (
                  <IonChip key={guess.id} color={guess.isCorrect ? 'success' : 'danger'} outline>
                    <IonIcon icon={guess.isCorrect ? checkmarkOutline : closeOutline} />
                    <strong>{guess.pitch}</strong>
                    <span>heard “{guess.matchedWord}” ({METHOD_LABELS[guess.method]})</span>
                  </IonChip>
                ))}
              </div>
            )}
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Home;
