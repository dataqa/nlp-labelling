import React from 'react';
import Typography from '@material-ui/core/Typography';


const ProjectTitle = (props) => {
    return (
        <Typography variant="h3" className={props.className}>
            {`Project: ${props.projectName}`}
        </Typography>    
    )
}

export default ProjectTitle;

