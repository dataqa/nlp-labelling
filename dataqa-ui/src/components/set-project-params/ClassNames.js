import React from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import SideBar from '../SideBar';
import SingleFileUploadForm from '../file-upload/SingleFileUploadForm';
import { DEFAULT_CLASS_NAME_COLUMN, DOCS_CLASSNAME_FILE_FORMAT } from  '../constants';
import Papa from 'papaparse';
import _ from 'lodash';


const styles = theme => ({
    container: {display: 'flex'},
    top_container: {marginLeft: 10}
  });


  const initialiseSelectedColumns = () => {
    var columnNames = {};
    columnNames[DEFAULT_CLASS_NAME_COLUMN] = undefined;
    return columnNames;
}

class ClassNames extends React.Component{

    state = {
        toRules: false,
        loading: false,
        selectedInputColumns: initialiseSelectedColumns(), 
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
        console.log('data', ...data);

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

    updateSelectedInputColumns = (columnIndex) => {
        this.setState((prevState) => {
            const selectedInputColumns = {...prevState.selectedInputColumns};
            selectedInputColumns[DEFAULT_CLASS_NAME_COLUMN] = columnIndex;
            return { selectedInputColumns };
        })
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

    uploadClassNamesFile = (selectedFile) => {
        console.log("Inside uploadClassNamesFile", this.props);

        const selectedColumn = this.state.selectedInputColumns[DEFAULT_CLASS_NAME_COLUMN];
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
                    id={"contained-button-file"}
                    helpText={<p>No column "{DEFAULT_CLASS_NAME_COLUMN}" found in file. Read more in the <a  href={DOCS_CLASSNAME_FILE_FORMAT} target="_blank"> documentation</a>. Please select columns:</p>}
                    rootClassName={classes.top_container}
                    instructionText={"Load a csv file with the class names."}
                    defaultColumnNames={[DEFAULT_CLASS_NAME_COLUMN]}
                    createProject={this.uploadClassNamesFile}
                    projectName={this.props.projectName}
                    loading={this.state.loading}
                    candidateInputColumnNames={this.state.candidateInputColumnNames}
                    updateSelectedInputColumns={this.updateSelectedInputColumns}
                    selectedInputColumns={this.state.selectedInputColumns}
                    fileUploaded={this.state.fileUploaded}
                    setToNextPage={this.setToNextPage}
                    setProjectUploadFinished={this.props.setProjectUploadFinished}
                />
            </div>
        )
    }
}

export default withStyles(styles)(ClassNames);