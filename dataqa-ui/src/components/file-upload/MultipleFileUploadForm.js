import React from 'react';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import { UploadFileButton } from './UploadFileButton';

import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import SingleFileUploadForm from './SingleFileUploadForm';
import { NextButton } from './SingleFileUploadForm';

import { DOCS_KB_FILE_FORMAT, 
        DOCS_MENTIONS_FILE_FORMAT, 
        FILE_TYPE_DOCUMENTS, 
        FILE_TYPE_KB,
        DEFAULT_MENTIONS_COLUMNS,
        DEFAULT_KB_COLUMNS } from '../constants';


const styles = theme => ({
    root: {
        maxWidth: 'sm'
    },
    button: {
        width: '200px',
        textAlign: 'center'
    },
    nextButton: { marginTop: 10}
  });


const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    spacing={4} 
                    direction="row"
                    justifycontent='flex-start'
                    alignItems="center"
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
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

const TextWithMentionsUpload = (props) => {
    const widthUploadForm = (!props.selectedFile && !props.hasBeenUploaded)? undefined: {width: '100%'};
    return (
        <Container>
            <Item style={widthUploadForm}>
                <SingleFileUploadForm 
                    rootClassName={props.classes.root}
                    setSelectedFile = {props.setSelectedFile}
                    id={"contained-button-file-1"}
                    uploadButtonText={props.uploadButtonText}
                    helpText={props.helpText}
                    createProject={props.createProject}
                    projectName={props.projectName}
                    loading={props.loading}
                    candidateInputColumnNames={props.candidateInputColumnNames}
                    updateSelectedInputColumns={props.updateSelectedInputColumns}
                    selectedInputColumns={props.selectedInputColumns}
                    fileUploaded={props.fileUploaded}
                />
            </Item>
                {!props.selectedFile && !props.hasBeenUploaded && 
                <Item>
                    <Typography variant="body1">File with text and entity mentions. Read more in the <a  href={DOCS_MENTIONS_FILE_FORMAT} target="_blank"> documentation</a>.
                    </Typography>
                </Item>}
        </Container>
    )
}

const KbUpload = (props) => {
    const widthUploadForm = (!props.selectedFile && !props.hasBeenUploaded)? undefined: {width: '100%'};
    return (
        <Container>
            <Item style={widthUploadForm}>
                <SingleFileUploadForm 
                    rootClassName={props.classes.root}
                    setSelectedFile = {props.setSelectedFile}
                    id={"contained-button-file-2"}
                    uploadButtonText={props.uploadButtonText}
                    helpText={props.helpText}
                    createProject={props.createProject}
                    projectName={props.projectName}
                    loading={props.loading}
                    candidateInputColumnNames={props.candidateInputColumnNames}
                    updateSelectedInputColumns={props.updateSelectedInputColumns}
                    selectedInputColumns={props.selectedInputColumns}
                    fileUploaded={props.fileUploaded}
                />
            </Item>
            {!props.selectedFile && !props.hasBeenUploaded &&
                <Item>
                    <Typography variant="body1">File with knowledge bases. Read more in the <a  href={DOCS_KB_FILE_FORMAT} target="_blank"> documentation</a>.
                    </Typography>
                </Item>
            }
        </Container>
    )
}

const RadioButtonGroup = () => {
    return (

        <FormControl component="fieldset">
            <FormLabel component="legend">Matching type</FormLabel>
            <RadioGroup aria-label="match-type" name="matching" value="same">
                <FormControlLabel value="same" control={<Radio />} label="Mentions that are the same match the same knowledge base, e.g. if we see 'headache' twice, it will match the same base." />
                <FormControlLabel value="unique" disabled control={<Radio />} label="Each mention is a different base, e.g. if we see 'John' twice, it will match different bases (coming soon)." />
            </RadioGroup>
        </FormControl>
    )
}

const initialiseSelectedFiles = () => {
    var selectedFiles = {};
    selectedFiles[FILE_TYPE_DOCUMENTS] = undefined;
    selectedFiles[FILE_TYPE_KB] = undefined;
    return selectedFiles;
}


class MultipleFileUploadForm extends React.Component{

    constructor(props) {
        super(props);
        this.state = { selectedFiles: initialiseSelectedFiles() }
    }

    setSelectedFile = (fileType, selectedFile) => {
        this.setState((prevState) => {
            const selectedFiles = {...prevState.selectedFiles};
            selectedFiles[fileType] = selectedFile;
            return { selectedFiles };
        })
    }

    render() {

        const { classes, filesUploaded } = this.props;

        return (
            <div style={{margin: 20, width:'100%'}}>
                <Box my={2}>
                    <Typography variant="h6">Load the data and knowledge base.</Typography>
                </Box>
                <ProjectNameTextField
                    projectName={this.props.projectName}
                    setProjectName={this.props.setProjectName}
                    loading={this.props.loading[FILE_TYPE_DOCUMENTS] || this.props.loading[FILE_TYPE_KB]}
                    disableChangeProjectName={this.props.disableChangeProjectName}
                />

                <div style={{marginTop: 30, marginBottom: 30}}>
                    <TextWithMentionsUpload
                        classes={classes}
                        uploadButtonText={"Upload mentions"}
                        setSelectedFile={(selectedFile) => this.setSelectedFile(FILE_TYPE_DOCUMENTS, selectedFile)}
                        selectedFile = {this.state.selectedFiles[FILE_TYPE_DOCUMENTS]}
                        helpText={<p>No columns "{DEFAULT_MENTIONS_COLUMNS.join(', ')}" found in file. Read more in the <a  href={DOCS_MENTIONS_FILE_FORMAT} target="_blank"> documentation</a>. Please select columns:</p>}
                        createProject={(e) => {return this.props.createProject(e, 
                                                            FILE_TYPE_DOCUMENTS,
                                                            DEFAULT_MENTIONS_COLUMNS)}}
                        projectName={this.props.projectName}
                        classes={classes}
                        loading={this.props.loading[FILE_TYPE_DOCUMENTS]}
                        disableLoading={this.props.loading[FILE_TYPE_DOCUMENTS] || !this.props.projectName}
                        hasBeenUploaded={!!filesUploaded[FILE_TYPE_DOCUMENTS]}
                        filename={filesUploaded[FILE_TYPE_DOCUMENTS] || ""}
                        candidateInputColumnNames={this.props.candidateInputColumnNames[FILE_TYPE_DOCUMENTS]}
                        updateSelectedInputColumns={(columnIndex, columnType) => this.props.updateSelectedInputColumns(FILE_TYPE_DOCUMENTS, columnIndex, columnType)}
                        selectedInputColumns={this.props.selectedInputColumns[FILE_TYPE_DOCUMENTS]}
                        fileUploaded={this.props.filesUploaded[FILE_TYPE_DOCUMENTS]}
                        setToNextPage={this.props.setToNextPage}
                    />

                    <KbUpload
                        classes={classes}
                        uploadButtonText={"Upload KB"}
                        setSelectedFile={(selectedFile) => this.setSelectedFile(FILE_TYPE_KB, selectedFile)}
                        selectedFile = {this.state.selectedFiles[FILE_TYPE_KB]}
                        helpText={<p>No columns "{DEFAULT_KB_COLUMNS.join(', ')}" found in file. Read more in the <a  href={DOCS_MENTIONS_FILE_FORMAT} target="_blank"> documentation</a>. Please select columns:</p>}
                        createProject={(e) => {return this.props.createProject(e, 
                                                                        FILE_TYPE_KB,
                                                                        DEFAULT_KB_COLUMNS)}}
                        projectName={this.props.projectName}
                        classes={classes}
                        loading={this.props.loading[FILE_TYPE_KB]}
                        disableLoading={this.props.loading[FILE_TYPE_KB] || !this.props.projectName}
                        hasBeenUploaded={!!filesUploaded[FILE_TYPE_KB]}
                        filename={filesUploaded[FILE_TYPE_KB] || ""}
                        candidateInputColumnNames={this.props.candidateInputColumnNames[FILE_TYPE_KB]}
                        updateSelectedInputColumns={(columnIndex, columnType) => this.props.updateSelectedInputColumns(FILE_TYPE_KB, columnIndex, columnType)}
                        selectedInputColumns={this.props.selectedInputColumns[FILE_TYPE_KB]}
                        fileUploaded={this.props.filesUploaded[FILE_TYPE_KB]}
                        setToNextPage={this.props.setToNextPage}
                    />

                    {this.props.uploadFinished &&
                        <NextButton
                            setToNextPage={this.props.setToNextPage}
                            className={classes.nextButton}
                        />
                    }
                </div>

                <RadioButtonGroup/>
            </div>
        )
    }
}


export default withStyles(styles)(MultipleFileUploadForm);