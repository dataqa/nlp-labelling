import React from 'react';
import { PROJECT_TYPES } from '../../constants';
import RuleTableClassification from './classification/RuleTableClassification';
import RuleTableNER from './ner/RuleTableNER';


const RuleTable = (props) => {
    if(props.projectType == PROJECT_TYPES["classification"]){
        return (
            <RuleTableClassification
                rules={props.rules}
                docs={props.docs}
                projectType={props.projectType}
                deleteRule={props.deleteRule}
                exploreRule={props.exploreRule}
                disableDeletingRules={props.disableDeletingRules}
                classes={props.classes}
            />
        )
    }else{
        if(props.projectType == PROJECT_TYPES["ner"]){
            return (
                <RuleTableNER
                    rules={props.rules}
                    docs={props.docs}
                    projectType={props.projectType}
                    deleteRule={props.deleteRule}
                    exploreRule={props.exploreRule}
                    disableDeletingRules={props.disableDeletingRules}
                    classes={props.classes}
                />
            )
        }
    }
}

export default RuleTable;