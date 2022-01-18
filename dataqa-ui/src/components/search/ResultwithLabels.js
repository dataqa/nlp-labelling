import React from 'react';
import Result from "./Result";
import getSearchTextComponent from './getSearchTextComponent';
import LabelComponent from './LabelComponent';
import { PROJECT_TYPES } from '../constants';


const getcurrentDisplayedLabels = (classNames, result) => {
    // will return the validated spans for NER or label for classification
    if(result["manualLabel"]){
        try{
            const manualLabel = result["manualLabel"]["raw"]["label"];
            if(Array.isArray(manualLabel)){
                // for NER
                const spans = manualLabel;
                return {entities: spans, haveBeenValidated: true};
            }else{
                // for classification
                const entities = [classNames[manualLabel]];
                return {entities: entities, haveBeenValidated: true};
            }            
        }
        catch(error){
            console.log("Error getting manual label field from document in ES.", error)
        }
    }else{
        return {entities: [], haveBeenValidated: false};
    }
}

function getcurrentSelectedEntityId(projectType, entities) {
    if(projectType == PROJECT_TYPES.classification){
        return entities.length > 0 && entities[0].id
    }else{
        return undefined;
    }
}

class ResultWithLabels extends React.Component {

    constructor(props) {
        super(props);

        const currentDisplayedLabels = getcurrentDisplayedLabels(this.props.classNames, this.props.result);
        console.log("Constructor of ResultWithLabels", this.props.classNames, currentDisplayedLabels);

        this.state = {
            currentDisplayedLabels: currentDisplayedLabels.entities, // for classification - the labels suggested to user (includes validated label if it exists, otherwise nothing). for NER - the current selection of spans (not necessarily confirmed) shown to user.
            currentSelectedEntityId: getcurrentSelectedEntityId(props.projectType, currentDisplayedLabels.entities), //for NER & classification, the currently selected entity id
            isCurrentlyDisplayedValidated: currentDisplayedLabels.haveBeenValidated
        }
    }

    selectEntity = (entity) => {
        this.setState((prevState) => {
            console.log("Inside ResultWithLabels selectEntity", prevState.currentSelectedEntityId, entity);
            return {currentSelectedEntityId: (entity.id==prevState.currentSelectedEntityId)? undefined: entity.id}
        });
    }

    updateIndexAfterLabelling = ({label, spans}) => {
        if(typeof(spans)!="undefined"){
            this.setState(() => {
                return { currentDisplayedLabels: spans,
                         isCurrentlyDisplayedValidated: true}
            })
        }
    }

    addTextSpan = (span) => {
        console.log("Inside addTextSpan ", span);
        this.setState((prevState) => {
            let currentDisplayedLabels = prevState.currentDisplayedLabels;
            if(currentDisplayedLabels){
                currentDisplayedLabels = currentDisplayedLabels.concat(span);
            }
            else{
                currentDisplayedLabels = [span]
            }
          return { currentDisplayedLabels, isCurrentlyDisplayedValidated: false }
        })
    }

    deleteTextSpan = (spanToDelete) => {
        this.setState((prevState) => {
            const currentDisplayedLabels = prevState.currentDisplayedLabels.filter(span => (span.id != spanToDelete.id));
            return { currentDisplayedLabels,
                     currentSelectedEntityId: undefined,
                     isCurrentlyDisplayedValidated: false };
        })
    }

    render = () => {
        const result = this.props.result;
        delete result.manual_label;

        return(
            <React.Fragment>
                <Result 
                    result={result}
                    onClickLink={() => {}}
                    labelComponent={this.props.enableLabelling && 
                                        <LabelComponent 
                                            docId={result.id.raw}
                                            projectName={this.props.projectName}
                                            sessionId={undefined}
                                            currentDisplayedLabels={this.state.currentDisplayedLabels}
                                            updateIndexAfterLabelling={this.updateIndexAfterLabelling}
                                            currentSelectedEntityId={this.state.currentSelectedEntityId}
                                            selectEntity={this.selectEntity}
                                            projectType={this.props.projectType}
                                            classNames={this.props.classNames}
                                            isCurrentlyDisplayedValidated={this.state.isCurrentlyDisplayedValidated}
                                        />
                                    }
                    getSearchTextComponent={(fieldName, fieldValue) => 
                        getSearchTextComponent(fieldName, 
                                               fieldValue, 
                                               this.props.projectType,
                                               this.props.classNames,
                                               this.state.currentSelectedEntityId,
                                               this.state.currentDisplayedLabels,
                                               this.addTextSpan,
                                               this.deleteTextSpan)}
                />
                
            </React.Fragment>
            )
        }
}

export default ResultWithLabels;