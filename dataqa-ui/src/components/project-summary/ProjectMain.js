import React from 'react';
import SupervisedProjectMain from './supervised/SupervisedProjectMain';
import EntityDisambiguationProjectMain from './entity-disambiguation/EntityDisambiguationProjectMain';
import { PROJECT_TYPES } from '../constants';


const ProjectMain = (props) => {
    if(props.projectType == PROJECT_TYPES.classification || props.projectType == PROJECT_TYPES.ner){
        return (
            <SupervisedProjectMain
                projectName={props.projectName}
                projectNameSlug={props.projectNameSlug}
                projectType={props.projectType}
                classNames={props.classNames}
                deleteProject={props.deleteProject}
                setRules={props.setRules}
            />
        )
    }else{
        return (
            <EntityDisambiguationProjectMain
                projectName={props.projectName}
                projectNameSlug={props.projectNameSlug}
                projectType={props.projectType}
                classNames={props.classNames}
                deleteProject={props.deleteProject}
            />
        )
    }
}

export default ProjectMain;