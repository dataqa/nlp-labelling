import React from 'react';
import ClassNames from './ClassNames';


const ProjectParamsPage = (props) => {
    return (
        <ClassNames
            projectName={props.projectName}
            setProjectParams={props.setProjectParams}
            setProjectParamsFinished={props.setProjectParamsFinished}
        />
    )
}

export default ProjectParamsPage;