import React from 'react';
import { PROJECT_TYPES } from '../../constants';
import LabelTableClassification from './classification/LabelTableClassification';
import LabelTableNER from './ner/LabelTableNER';


const LabelTable = (props) => {
    const params = {
        totalDocuments: props.docs.totalDocuments,
        totalManualDocs: props.docs.totalManualDocs,
        totalManualDocsEmpty: props.docs.totalManualDocsEmpty,
        totalManualSpans: props.docs.totalManualSpans,
        modelClasses: props.docs.classes,
        exploreLabelled: props.exploreLabelled,
        classes: props.classes
    }

    if(props.projectType == PROJECT_TYPES["classification"]){
        return (
            <LabelTableClassification {...params}/>
        )
    }else{
        if(props.projectType == PROJECT_TYPES["ner"]){
            return (
                <LabelTableNER {...params}/>
            )
        }
    }
}

export default LabelTable;