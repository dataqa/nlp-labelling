import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import { DOCS_KB_FILE_FORMAT, 
        DOCS_MENTIONS_FILE_FORMAT, 
        FILE_TYPE_DOCUMENTS, 
        FILE_TYPE_KB } from '../constants';


const styles = theme => ({
    root: {
        maxWidth: 'sm'
    },
    button: {
        width: '200px',
        textAlign: 'center'
    }
  });


const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    spacing={4} 
                    direction="row"
                    justify='space-between'
                    alignItems="center"
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item 
                    {...props}/>)
}


const UploadFileButton = (props) => {
    if(!props.loading){
        return (
            <Button 
                variant="contained" 
                color="primary" 
                component="label"
                htmlFor={props.htmlFor}
                className={props.className}
                disabled={props.disableLoading}
            >
                {props.text}
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

const ProjectNameTextField = (props) => {
    return (
        <TextField
            id="project-name-input"
            label="Name of project"
            type="text"
            variant="filled"
            value={props.projectName}
            onChange={props.setProjectName}
            disabled={props.loading || props.disableChangeProjectName}
        />
    )
}

const UploadForm = (props) => {
    return (
        <Container>
            <Item xs={6}>
                {props.description}
            </Item>
            <Item xs={6}>
                <form encType="multipart/form-data;" acceptCharset="utf-8">
                    <input
                        accept=".csv"
                        style={{ display: 'none' }}
                        id={props.id}
                        type="file"
                        onChange={props.onChange}
                    />
                    <UploadFileButton 
                        htmlFor={props.id}
                        loading={props.loading}
                        disableLoading={props.disableLoading}
                        className={props.classes.button}
                        text={props.buttonText}
                    />
                </form>
            </Item>
        </Container>
    )
}

const TextWithMentionsUpload = (props) => {
    let Description;
    if(props.hasBeenUploaded){
        Description = <Typography variant="body2">{`Successfully uploaded file with mentions ${props.filename}`}</Typography>
    }
    else{
        Description = <Typography variant="body2">File with text and entity mentions. Read more in the <a  href={DOCS_MENTIONS_FILE_FORMAT} target="_blank"> documentation</a>.
        </Typography>
    }

    return (
        <UploadForm
            loading={props.loading}
            disableLoading={props.disableLoading}
            description={Description}
            id="upload-form-1"
            classes={props.classes}
            buttonText={"Upload mentions"}
            target="_blank"
            onChange={(e) => {props.createProject(e, "documents")}}
        />
    )
}

const KbUpload = (props) => {
    let Description;
    if(props.hasBeenUploaded){
        Description = <Typography variant="body2">{`Successfully uploaded file with mentions ${props.filename}`}</Typography>
    }
    else{
        Description = <Typography variant="body2">File with knowledge bases. Read more in the <a  href={DOCS_KB_FILE_FORMAT} target="_blank"> documentation</a>.
                            </Typography>
    }

    return (
        <UploadForm
            loading={props.loading}
            disableLoading={props.disableLoading}
            description={Description}
            id="upload-form-2"
            classes={props.classes}
            buttonText={"Upload knowledge base"}
            target="_blank"
            onChange={(e) => {props.createProject(e, "kb")}}
        />
    )
}

const MultipleFileUploadForm = (props) => {

        const { classes, filesUploaded } = props;

        return (
            <div style={{margin: 20, width:'100%'}}>
                <Box my={2}>
                    <Typography variant="h6">Load the data and knowledge base.</Typography>
                </Box>
                <ProjectNameTextField
                    projectName={props.projectName}
                    setProjectName={props.setProjectName}
                    loading={props.loading[FILE_TYPE_DOCUMENTS] || props.loading[FILE_TYPE_KB]}
                    disableChangeProjectName={props.disableChangeProjectName}
                />

                <div style={{marginTop: 30}}>
                    <TextWithMentionsUpload
                        createProject={props.createProject}
                        classes={classes}
                        loading={props.loading[FILE_TYPE_DOCUMENTS]}
                        disableLoading={props.loading[FILE_TYPE_KB]}
                        hasBeenUploaded={!!filesUploaded[FILE_TYPE_DOCUMENTS]}
                        filename={filesUploaded[FILE_TYPE_DOCUMENTS] || ""}
                    />

                    <KbUpload 
                        createProject={props.createProject}
                        classes={classes}
                        loading={props.loading[FILE_TYPE_KB]}
                        disableLoading={props.loading[FILE_TYPE_DOCUMENTS]}
                        hasBeenUploaded={!!filesUploaded[FILE_TYPE_KB]}
                        filename={filesUploaded[FILE_TYPE_KB] || ""}
                    />
                </div>
            </div>
        )
}


export default withStyles(styles)(MultipleFileUploadForm);