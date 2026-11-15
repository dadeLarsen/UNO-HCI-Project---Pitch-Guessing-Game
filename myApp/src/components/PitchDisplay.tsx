import { useEffect, useRef } from 'react';
import { IonCard } from '@ionic/react';
import type { PitchToGuess } from '../pages/Home';

interface ContainerProps {
  correctPitch: PitchToGuess;
  /** When true the reveal clip plays; otherwise it is held paused on the first frame. */
  isRevealing: boolean;
  onVideoEnded: () => void;
  onVideoError: () => void;
}

const PitchDisplay: React.FC<ContainerProps> = ({
  correctPitch,
  isRevealing,
  onVideoEnded,
  onVideoError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Every pitch starts paused on its first frame. It only plays once the player
  // has guessed (right or wrong), so the clip itself reveals the answer.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isRevealing) {
      video.play().catch(onVideoError);
    } else {
      video.pause();
    }
  }, [isRevealing, onVideoError]);

  return (
    <IonCard className="pitch-display">
      {correctPitch.videoUrl ? (
        <video
          // Remount per round so a reused clip still starts from 0s.
          key={correctPitch.id}
          ref={videoRef}
          className="pitch-video"
          src={correctPitch.videoUrl}
          preload="auto"
          playsInline
          onEnded={onVideoEnded}
          onError={onVideoError}
        />
      ) : (
        <div className="pitch-placeholder">
          <p>
            Press <strong>Start listening</strong> to load a pitch.
          </p>
        </div>
      )}
    </IonCard>
  );
};

export default PitchDisplay;
