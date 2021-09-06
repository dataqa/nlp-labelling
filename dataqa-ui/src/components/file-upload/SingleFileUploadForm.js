import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';


const styles = theme => ({
    root: {
        maxWidth: 'sm'
    },
    button: {
        marginTop: 10
    }
  });


const UploadFileButton = (props) => {
    if(!props.loading){
        return (
            <Button 
                variant="contained" 
                color="primary" 
                component="label"
                htmlFor={props.htmlFor}
                className={props.className}
            >
                Upload
            </Button> 
        )
    }else{
        return (
            <CircularProgress 
                className={props.className}
            />
        )
    }
}

const SingleFileUploadForm = (props) => {
    const { classes } = props;
    return (
        <Container className={classes.root}>
            <Box my={2}>
                <Typography variant="h6">Load a csv file with 'text' column.</Typography>
            </Box>
            <TextField
                id="project-name-input"
                label="Name of project"
                type="text"
                variant="filled"
                value={props.projectName}
                onChange={props.setProjectName}
                disabled={props.loading}
            />
            <form encType="multipart/form-data;" acceptCharset="utf-8">
                <input
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="contained-button-file"
                    type="file"
                    onChange={props.createProject}
                />
                <UploadFileButton 
                    htmlFor="contained-button-file"
                    loading={props.loading}
                    className={classes.button}
                />
            </form>
        </Container>
    )
}

export default withStyles(styles)(SingleFileUploadForm);
export { UploadFileButton };