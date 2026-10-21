import { useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { micOffOutline, micOutline, refreshOutline } from 'ionicons/icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { matchPitches } from '../lib/pitchMatcher';
import type { MatchMethod } from '../lib/pitchMatcher';
import './Home.css';
import PitchDisplay from '../components/PitchDisplay';

interface Guess {
  id: number;
  pitch: string;
  matchedWord: string;
  method: MatchMethod;
}

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

const Home: React.FC = () => {
  const { isSupported, isListening, interimTranscript, finalTranscript, error, start, stop, clear } =
    useSpeechRecognition('en-US');

  const [guesses, setGuesses] = useState<Guess[]>([]);
  // How much of finalTranscript we've already scanned for pitch names, so we
  // never score the same words twice.
  const matchedUpToRef = useRef(0);

  useEffect(() => {
    if (finalTranscript.length <= matchedUpToRef.current) return;
    const newChunk = finalTranscript.slice(matchedUpToRef.current);
    matchedUpToRef.current = finalTranscript.length;

    const found = matchPitches(newChunk);
    if (found.length > 0) {
      setGuesses(prev => [
        ...found.map((match, i) => ({ ...match, id: Date.now() + i })),
        ...prev,
      ]);
    }
  }, [finalTranscript]);

  const handleClear = () => {
    clear();
    matchedUpToRef.current = 0;
    setGuesses([]);
  };

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? `Speech error: ${error}`) : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Pitch Guesser</IonTitle>
        </IonToolbar>
      </IonHeader>
      {/* <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Pitch Guesser</IonTitle>
        </IonToolbar>
      </IonHeader> */}

      <IonContent className="ion-padding">
        
        <PitchDisplay></PitchDisplay>

        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>Voice input</IonCardSubtitle>
            <IonCardTitle>Say a pitch name out loud</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="mic-controls">
              <IonButton
                size="large"
                shape="round"
                color={isListening ? 'danger' : 'primary'}
                onClick={isListening ? stop : start}
                disabled={!isSupported}
              >
                <IonIcon slot="start" icon={isListening ? micOffOutline : micOutline} />
                {isListening ? 'Stop' : 'Start listening'}
              </IonButton>
              <IonButton fill="clear" onClick={handleClear}>
                <IonIcon slot="start" icon={refreshOutline} />
                Reset
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
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>Results</IonCardSubtitle>
            <IonCardTitle>Detected pitches</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {guesses.length === 0 ? (
              <IonNote>No pitches detected yet.</IonNote>
            ) : (
              <div className="guess-list">
                {guesses.map(guess => (
                  <IonChip key={guess.id} color="secondary" outline>
                    <strong>{guess.pitch}</strong>
                    &nbsp;— heard “{guess.matchedWord}” ({METHOD_LABELS[guess.method]})
                  </IonChip>
                ))}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {finalTranscript && (
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Raw transcript</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="raw-transcript">{finalTranscript}</p>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
