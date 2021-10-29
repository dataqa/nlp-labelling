import React from 'react';
import ClassNames from './ClassNames';


const ProjectParamsPage = (props) => {
    return (
        <ClassNames
            projectName={props.projectName}
            setProjectParams={props.setProjectParams}
            setProjectUploadFinished={props.setProjectUploadFinished}
        />
    )
}

export default ProjectParamsPage;