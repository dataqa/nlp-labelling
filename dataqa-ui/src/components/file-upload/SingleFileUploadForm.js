import React from 'react';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { UploadFileButton } from './UploadFileButton';
import Grid from '@material-ui/core/Grid';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';


const styles = theme => ({
    button: {
        marginTop: 10
    },
    formControl: {
        margin: theme.spacing(1),
        width: '100%'
      },
    container: {marginTop: 10},
    nextButton: {marginTop: 10},
    inputRoot: {fontSize: '0.8rem'}
  });


const ColumnContainer = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                    direction='column' 
                    className={className}
                    {...rest}/>)
}

const RowContainer = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                direction='row' 
                alignItems="center"
                className={className}
                {...rest}/>)
}


const Item = props => {
    return(<Grid item {...props}/>)
}

const ColumnSelector = (props) => {
    return (
        <FormControl className={props.classes.formControl} disabled={props.disabled}>
            <InputLabel 
                id="demo-simple-select-label" 
                classes={{ root: props.classes.inputRoot }}>
                    {props.selectorLabel}
            </InputLabel>
            <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={typeof props.selectedInputColumn === 'undefined'? "" : props.selectedInputColumn}
                onChange={(event) => props.updateSelectedInputColumn(event.target.value)}
            >
                {props.candidateInputColumnNames.map((row, index) => { 
                        return (
                            <MenuItem value={index} key={`column-${index}`}>{row}</MenuItem>
                        )
                })}
            </Select>
        </FormControl>
    )
}

const NextButton = (props) => {
    return (
        <Button 
            variant="contained" 
            color="primary" 
            component="label"
            onClick={props.setToNextPage}
            className={props.className}
        >
            {"Next"}
        </Button>
    )
}

const SuccessfulUpload = (props) => {
    if(!!props.setToNextPage){
        return (
            <ColumnContainer className={props.classes.container}>
                <Item xs={6}>
                    <Alert severity="success">Successfully uploaded file {props.fileUploaded}.</Alert>
                </Item>   

                <Item>
                    <NextButton 
                        setToNextPage={props.setToNextPage}
                        className={props.classes.nextButton}
                    />
                </Item>   
            </ColumnContainer>
        )
    }else{
        return (
            <Alert style={{marginTop: 10}} severity="success">Successfully uploaded file {props.fileUploaded}.</Alert>
        )
    }
}

const FormButton = (props) => {
    console.log("Inside FormButton", props);
    if(typeof props.fileUploaded !== 'undefined'){
        return (
            <SuccessfulUpload
                classes={props.classes}
                fileUploaded={props.fileUploaded}
                setToNextPage={props.setToNextPage}
            /> 
        )   
            
    }else{
        console.log("Returning UploadFileButton", Object.values(props.selectedInputColumns).every((x) => typeof x !== "undefined"));
        if(Object.values(props.selectedInputColumns).every((x) => typeof x !== "undefined")){
            return(
                <UploadFileButton 
                    loading={props.loading}
                    className={props.classes.button}
                    disableLoading={!props.projectName}
                    onClick={props.uploadFile}
                    text={props.uploadButtonText}
                />
            )
        }else{
            return(
                <UploadFileButton 
                    htmlFor={props.id}
                    loading={props.loading}
                    className={props.classes.button}
                    disableLoading={!props.projectName}
                    text={props.uploadButtonText}
                />
            )
        }
    }
}

const MultiColumnSelector = (props) => {

    if(typeof props.candidateInputColumnNames === 'undefined'){
        return null;
    }else{
        if(props.candidateInputColumnNames.length == 0){
            return(
                <Alert severity="error">No columns found in file. Please try again.</Alert>
            );
        }else{
            return(
                <RowContainer className={props.classes.container}>
                    <Item xs={6}>
                        <Alert severity="info">{props.helpText}</Alert>
                    </Item>
                    <Item xs={6}>
                        <RowContainer className={props.classes.container}>
                            { Object.entries(props.selectedInputColumns).map(([columnType, selectedColumn], index) => 
                                {
                                return (
                                    <Item style={{ flex: 1, margin: 10 }} key={`column-selector-${index}`}>
                                        <ColumnSelector 
                                            key={`column-selector-${index}`}
                                            classes={props.classes}
                                            candidateInputColumnNames={props.candidateInputColumnNames}
                                            selectedInputColumn={selectedColumn}
                                            updateSelectedInputColumn={(columnIndex) => props.updateSelectedInputColumns(columnIndex, columnType)}
                                            disabled={!!props.fileUploaded}
                                            helpText={props.helpText}
                                            selectorLabel={`Select column for ${columnType}`}
                                        />
                                    </Item>
                                    )
                                })
                            }
                        </RowContainer>
                    </Item>
                </RowContainer>
            )
        }
    }
}


class SingleFileUploadForm extends React.Component{

    constructor(props) {
        super(props);
        this.state = { selectedFile: undefined }
    }

    uploadFile = (selectedFile) => {
        console.log("Inside uploadFile", selectedFile);
        if(selectedFile){
            this.setState( {selectedFile } );
        }
        const flag = this.props.createProject(selectedFile);
        console.log("flag is ", flag, flag && this.props.setSelectedFile);

        if(flag && this.props.setSelectedFile){
            this.props.setSelectedFile(selectedFile);
        }
    }

    render() {
        return(
            <ColumnContainer className={this.props.rootClassName}>
                {!!this.props.instructionText &&
                    <Box my={2}>
                        <Typography variant="h6">{this.props.instructionText}</Typography>
                    </Box>
                }
                <form encType="multipart/form-data;" acceptCharset="utf-8">
                    <ColumnContainer>
                        <Item>
                            {!!this.props.setProjectName &&
                                <TextField
                                    id="project-name-input"
                                    label="Name of project"
                                    type="text"
                                    variant="filled"
                                    value={this.props.projectName}
                                    onChange={this.props.setProjectName}
                                    disabled={this.props.loading || !!this.props.fileUploaded}
                                />
                            }
                            <input
                                accept=".csv"
                                style={{ display: 'none' }}
                                id={this.props.id}
                                type="file"
                                onChange={(e) => {
                                                e.preventDefault();
                                                this.uploadFile(e.target.files[0]); 
                                                e.target.value = null;
                                            }}
                            />
                        </Item>
                        <Item>
                            <MultiColumnSelector
                                classes={this.props.classes}
                                selectedInputColumns={this.props.selectedInputColumns}
                                updateSelectedInputColumns={this.props.updateSelectedInputColumns}
                                candidateInputColumnNames={this.props.candidateInputColumnNames}
                                fileUploaded={this.props.fileUploaded}
                                helpText={this.props.helpText}
                            />
                        </Item>
                    </ColumnContainer>
                    <FormButton 
                        id={this.props.id}
                        classes={this.props.classes}
                        loading={this.props.loading}
                        projectName={this.props.projectName}
                        fileUploaded={this.props.fileUploaded}
                        setToNextPage={this.props.setToNextPage}
                        selectedInputColumns={this.props.selectedInputColumns}
                        uploadFile={() => this.uploadFile(this.state.selectedFile)}
                        uploadButtonText={this.props.uploadButtonText}
                    />
                </form>
            </ColumnContainer>
        )
    }
}

export default withStyles(styles)(SingleFileUploadForm);
export { NextButton };