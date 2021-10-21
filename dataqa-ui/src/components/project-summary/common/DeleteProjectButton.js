import React from 'react';
import Button from '@material-ui/core/Button';

const DeleteProjectButton = (props) => {
    return (
        <Button
            variant="contained"
            color="primary"
            onClick={props.deleteProject}
            className={props.classes.button}
        >
            Delete project
        </Button>
    );
};

export default DeleteProjectButton;
