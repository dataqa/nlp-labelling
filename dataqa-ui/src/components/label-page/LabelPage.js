import React from 'react';
import { PROJECT_TYPES } from '../constants';
import SupervisedLabelPage from './supervised/SupervisedLabelPage';
import EntityDisambiguationLabelPage from './entity-disambiguation/EDLabelPage';

const LabelPage = (props) => {
    switch(props.projectType){
        case PROJECT_TYPES.classification: 
            return <SupervisedLabelPage {...props}/>;
        case  PROJECT_TYPES.ner:
            return <SupervisedLabelPage {...props}/>;
        default:
            return <EntityDisambiguationLabelPage {...props}/>;
    }
};

export default LabelPage;