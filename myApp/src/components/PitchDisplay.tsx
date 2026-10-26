import { IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle } from "@ionic/react";
import { Ref, useRef, useState } from "react";
import { PitchToGuess } from "../pages/Home";

interface ContainerProps { 
    correctPitch: PitchToGuess;
}

const PitchDisplay: React.FC<ContainerProps> = ({correctPitch}) => {

    
    const [imageSrc, setImageSrc] = useState("https://dummyimage.com/250x330/000/fff");
    const pitchToGuessTimestamp = useRef(correctPitch.timestamp);

    if(correctPitch.timestamp != pitchToGuessTimestamp.current){
        pitchToGuessTimestamp.current = correctPitch.timestamp;
        setImageSrc(`/TestImages/BallTypes/${correctPitch.pitchType}.png`);
    }



    return (
        <IonCard>
            <div style={{height: "330px"}}>
                <img src={imageSrc} alt={correctPitch.pitchType === "default" ? "Pitch preview" : `${correctPitch.pitchType} baseball pitch`} height="330px"/>
            </div>
            <IonCardHeader>
                <IonCardSubtitle>
                    <a href="https://rocklandpeakperformance.com/baseball-spin-rate-basics-pitch-movement/" target="_blank">test images source</a>
                </IonCardSubtitle>
            </IonCardHeader>
        </IonCard>
    );
};

export default PitchDisplay;