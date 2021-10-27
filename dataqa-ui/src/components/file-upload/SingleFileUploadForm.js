import React from 'react';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { UploadFileButton } from './UploadFileButton';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Tooltip from '@material-ui/core/Tooltip';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';


const styles = theme => ({
    root: {
        maxWidth: 'sm'
    },
    button: {
        marginTop: 10
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
      },
    container: {marginTop: 10}
  });


const ColumnContainer = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    direction='column' 
                    {...rest}/>)
}

const RowContainer = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                spacing={4} 
                direction='row' 
                alignItems="center"
                className={classes.container} 
                {...rest}/>)
}


const Item = props => {
    return(<Grid item {...props}/>)
}

const ColumnSelector = (props) => {
    if(typeof props.candidateInputColumnNames === 'undefined'){
        return null;
    }else{
        if(props.candidateInputColumnNames.length == 0){
            return(
                <Alert severity="error">No columns found in file. Please try again.</Alert>
            );
        }else{
            return(
                <RowContainer classes={props.classes}>
                    <Item xs={6}>
                        <Alert severity="info">{`No '${props.defaultColumnName}' column was found in file. Please select column:`}
                        </Alert>
                    </Item>
                    <Item xs={6}>
                        <Tooltip title="Select column with text." placement="top">
                            <FormControl className={props.classes.formControl} disabled={props.disabled}>
                                <InputLabel id="demo-simple-select-label">Column</InputLabel>
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
                        </Tooltip>
                    </Item>
                </RowContainer>
            )
        }
    }
}

const FormButton = (props) => {
    if(typeof props.fileUploaded !== 'undefined'){
        return (
            <RowContainer classes={props.classes}>
                <Item xs={6}>
                    <Alert severity="success">Successfully uploaded file {props.fileUploaded}.</Alert>
                </Item>   

                <Item xs={6}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    component="label"
                    onClick={() => props.setToNextPage()}
                >
                    {"Next"}
                </Button>  
            </Item>              
            </RowContainer>
        )
    }else{
        if(typeof props.selectedInputColumn !== 'undefined'){
            return(
                <UploadFileButton 
                    loading={props.loading}
                    className={props.classes.button}
                    disableLoading={!props.projectName}
                    onClick={props.uploadFile}
                />
            )
        }else{
            return(
                <UploadFileButton 
                    htmlFor="contained-button-file"
                    loading={props.loading}
                    className={props.classes.button}
                    disableLoading={!props.projectName}
                />
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
        if(selectedFile){
            this.setState( {selectedFile } );
        }
        this.props.createProject(selectedFile);
    }

    render() {
        return(
            <Container className={this.props.classes.root}>
                <Box my={2}>
                    <Typography variant="h6">Load a csv file.</Typography>
                </Box>
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
                                id="contained-button-file"
                                type="file"
                                onChange={(e) => {
                                                e.preventDefault();
                                                this.uploadFile(e.target.files[0]); 
                                                e.target.value = null;
                                            }}
                            />
                        </Item>
                        <Item>
                            <ColumnSelector 
                                classes={this.props.classes}
                                candidateInputColumnNames={this.props.candidateInputColumnNames}
                                selectedInputColumn={this.props.selectedInputColumn}
                                updateSelectedInputColumn={this.props.updateSelectedInputColumn}
                                disabled={!!this.props.fileUploaded}
                                defaultColumnName={this.props.defaultColumnName}
                            />
                        </Item>
                    </ColumnContainer>
                    <FormButton 
                        classes={this.props.classes}
                        loading={this.props.loading}
                        projectName={this.props.projectName}
                        fileUploaded={this.props.fileUploaded}
                        setToNextPage={this.props.setToNextPage}
                        selectedInputColumn={this.props.selectedInputColumn}
                        uploadFile={() => this.uploadFile(this.state.selectedFile)}
                    />
                </form>
            </Container>
        )
    }
}

export default withStyles(styles)(SingleFileUploadForm);