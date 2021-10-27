import React from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import SideBar from '../SideBar';
import SingleFileUploadForm from '../file-upload/SingleFileUploadForm';
import { DEFAULT_CLASS_NAME_COLUMN } from  '../constants';
import Papa from 'papaparse';
import _ from 'lodash';


const styles = theme => ({
    container: {display: 'flex'}
  });

class ClassNames extends React.Component{

    state = {
        toRules: false,
        loading: false,
        selectedInputColumn: undefined, 
        candidateInputColumnNames: undefined,
        fileUploaded: undefined
    };

    submitClassNames = (selectedFile, columnName) => {
        
        console.log('Inside submitClassNames');

        if(!selectedFile){
            alert("Need to select file!");
        }

        if(!this.props.projectName){
            alert('Do not know what project this is.')
        }

        const data = new FormData();
        data.append('project_name', this.props.projectName);
        data.append('column_name', columnName);
        data.append('file', selectedFile);

        $.ajax({
            url : '/api/classnames',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                this.setState({ loading: false });
                const jsonData = JSON.parse(data);
                if(jsonData){
                    console.log("Classes set correctly to: ", jsonData);

                    this.setState( {loading: false,
                                    fileUploaded: selectedFile.name} );
                    this.props.setProjectParams(jsonData);
                }
            }.bind(this),
            error: function (error) {
                this.setState({ loading: false });
                alert(error);
            }.bind(this)
        });

        this.setState({ loading: true });
        
    }

    updateCandidateInputColumnNames = (candidateInputColumnNames) => {
        this.setState({ candidateInputColumnNames });
    }

    updateSelectedInputColumn = (selectedInputColumn) => {
        this.setState({ selectedInputColumn });
    }

    validateColumnsAndUpload = (selectedFile, columns) => {
        console.log("Inside validateColumnsAndUpload", DEFAULT_CLASS_NAME_COLUMN,
        columns, _.includes(columns, DEFAULT_CLASS_NAME_COLUMN))
        if(_.includes(columns, DEFAULT_CLASS_NAME_COLUMN)){
            this.submitClassNames(selectedFile, DEFAULT_CLASS_NAME_COLUMN);
        }else{
            this.updateCandidateInputColumnNames(columns);
        }
    }

    uploadFile = (selectedFile) => {
        console.log("Inside uploadFile", this.props);

        const selectedColumn = this.state.selectedInputColumn;
        if(typeof selectedColumn === 'undefined'){
            var results = Papa.parse(selectedFile, 
                {header: true,
                preview: 1,
                complete: function(results) {
                        this.validateColumnsAndUpload(selectedFile, results.meta.fields);
                    }.bind(this)
                });
        }else{
            this.submitClassNames(selectedFile, this.state.candidateInputColumnNames[selectedColumn]);
        }
    }

    setToNextPage = () => {
        this.setState({toRules: true});
    }

    render() {
        const { classes } = this.props;

        if(this.state.toRules === true) {
            return <Redirect to={{pathname: "/rules"}}/>
        }

        return (
            <div className={classes.container}>
                <SideBar/>

                <SingleFileUploadForm 
                    defaultColumnName={DEFAULT_CLASS_NAME_COLUMN}
                    createProject={this.uploadFile}
                    projectName={this.props.projectName}
                    loading={this.state.loading}
                    candidateInputColumnNames={this.state.candidateInputColumnNames}
                    updateSelectedInputColumn={this.updateSelectedInputColumn}
                    selectedInputColumn={this.state.selectedInputColumn}
                    fileUploaded={this.state.fileUploaded}
                    setToNextPage={this.setToNextPage}
                />

                {/* <Container>
                    <Box my={2}>
                        <Typography variant="h6">Upload a csv file with the class names.</Typography>
                    </Box>
                    <form encType="multipart/form-data;" acceptCharset="utf-8">
                        <input
                            accept=".csv"
                            style={{ display: 'none' }}
                            id="contained-button-file"
                            type="file"
                            onChange={this.submitClassNames}
                        />
                        <UploadFileButton 
                            htmlFor="contained-button-file"
                            loading={this.state.loading}
                            className={classes.button}
                        />
                    </form>
                </Container> */}
            </div>
        )
    }
}

export default withStyles(styles)(ClassNames);