import { IonCard } from "@ionic/react";
import { PitchToGuess } from "../pages/Home";

interface ContainerProps { 
    correctPitch: PitchToGuess;
}

const PitchDisplay: React.FC<ContainerProps> = ({correctPitch}) => {

    const imageSrc = correctPitch.pitchType === "default"
        ? "https://dummyimage.com/1200x800/202b38/ffffff&text=Start+listening+to+see+the+pitch"
        : `/TestImages/BallTypes/${correctPitch.pitchType}.png`;

    return (
        <IonCard className="pitch-display">
            <img
                src={imageSrc}
                alt={correctPitch.pitchType === "default" ? "Pitch preview" : `${correctPitch.pitchType} baseball pitch`}
            />
        </IonCard>
    );
};

export default PitchDisplay;