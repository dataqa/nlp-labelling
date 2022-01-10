import React from 'react';
import ClassificationLabelNavigation from '../label-page/supervised/classification/LabelNavigation';
import NERLabelNavigation from '../label-page/supervised/ner/LabelNavigation';
import { PROJECT_TYPES } from '../constants';
import _ from 'lodash'


const LabelComponent = (props) => {
    if(props.projectType == PROJECT_TYPES.classification){
        let entities;
        if(props.currentDisplayedLabels){
            entities = props.currentDisplayedLabels.map((x, ind) => props.classNames[x.id]);
            console.log("Inside MainArea,", entities);
            entities =  _.uniqBy(entities, 'id');
        }else{
            entities = [];
        }

        const EntitySet = new Set(entities.map((x, ind) => x.id))

        // all the entities that are not in the text and will populate the search
        const otherEntities = props.classNames.filter(x => !EntitySet.has(x.id));
        return (
            <div style={{ paddingLeft: '20px' }}>
                <ClassificationLabelNavigation
                    projectName={props.projectName}
                    docId={props.docId}
                    sessionId={props.sessionId}
                    currentDisplayedLabels={props.currentDisplayedLabels}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    entities={entities}
                    otherEntities={otherEntities}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    selectEntity={props.selectEntity}
                    simpleLabelNavigation={true} />
            </div>
        );
    }

    if(props.projectType == PROJECT_TYPES.ner){
        console.log("Inside LabelComponent", props);

        let entities;
        if(props.currentDisplayedLabels){
            entities = props.currentDisplayedLabels.map((x, ind) => x && props.classNames[x.entityId]);
            console.log("Inside MainArea,", entities);
            entities =  _.uniqBy(entities, 'id');
        }else{
            entities = [];
        }
        
        console.log("Inside MainArea,", entities);
        const EntitySet = new Set(entities.map((x, ind) => x.id))
    
        // all the entities that are not in the text and will populate the search
        const otherEntities = props.classNames.filter(x => !EntitySet.has(x.id));

        return (
            <div style={{ paddingLeft: '20px' }}>
                <NERLabelNavigation
                    projectName={props.projectName}
                    docId={props.docId}
                    sessionId={props.sessionId}
                    currentTextSpans={props.currentDisplayedLabels}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    entities={entities}
                    otherEntities={otherEntities}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    isCurrentlyDisplayedValidated={props.isCurrentlyDisplayedValidated}
                    selectEntity={props.selectEntity} 
                />
            </div>
        )
    }
};


export default LabelComponent;
