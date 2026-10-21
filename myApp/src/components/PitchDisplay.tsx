import { IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle } from "@ionic/react";
import { useState } from "react";

interface ContainerProps { }

const PitchDisplay: React.FC<ContainerProps> = () => {

    var pitch = "default";
    const [imageSrc, setImageSrc] = useState("https://dummyimage.com/250x330/000/fff");

    //TODO: read this from the JSON
    const balltypes = [
        "changeup",
        "curveball",
        "cutter",
        "forkball",
        "palmball",
        "screwball",
        "slider",
        "slurve",
        "splitter"
    ];

    function getRandomPitch() {
      pitch = balltypes[Math.floor(Math.random() * balltypes.length)];
      console.log(pitch);
      setImageSrc(`public/testimages/balltypes/${pitch}.png`);
    }


    return (
        <IonCard>
            <img src={imageSrc}/>
            <IonCardHeader>
                <IonCardSubtitle>
                    <a href="https://rocklandpeakperformance.com/baseball-spin-rate-basics-pitch-movement/" target="_blank">test images source</a>
                </IonCardSubtitle>
            </IonCardHeader>
            <IonButton fill="clear" onClick={() => getRandomPitch()}>New Pitch</IonButton>
        </IonCard>
    );
};

export default PitchDisplay;