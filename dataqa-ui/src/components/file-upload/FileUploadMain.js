import React from 'react';
import SingleFileUploadForm from './SingleFileUploadForm';
import MultipleFileUploadForm from './MultipleFileUploadForm';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import SideBar from '../SideBar';
import { withStyles } from '@material-ui/core/styles';
import uuid from 'react-uuid';
import { PROJECT_TYPES, FILE_TYPE_DOCUMENTS, FILE_TYPE_KB, DEFAULT_TEXT_COLUMN } from '../constants';
import { getSlug } from '../../utils';
import { renameKeysToCamelCase } from '../utils';
import Papa from 'papaparse';
import _ from 'lodash';

const UPLOAD_PARAMS = {
    totalAttempts: 16,
    timeAttemptms: 15000
}

const styles = theme => ({
    container: {display: 'flex'}
  });


const FileUploadForm = (props) => {

    if(props.projectType == PROJECT_TYPES.entity_disambiguation){
        return (
            <MultipleFileUploadForm 
                selectFile={props.selectFile}
                createProject={props.createProject}
                setProjectName={props.setProjectName}
                projectName={props.projectName}
                loading={props.loading}
                filesUploaded={props.filesUploaded}
                disableChangeProjectName={props.disableChangeProjectName}
                candidateInputColumnNames={props.candidateInputColumnNames}
                updateSelectedInputColumns={props.updateSelectedInputColumns}
                selectedInputColumns={props.selectedInputColumns}
                setToNextPage={props.setToNextPage}
            />
        )
    }else{
        return (
            <SingleFileUploadForm 
                defaultColumnName={DEFAULT_TEXT_COLUMN}
                createProject={props.createProject}
                setProjectName={props.setProjectName}
                projectName={props.projectName}
                loading={props.loading[FILE_TYPE_DOCUMENTS]}
                candidateInputColumnNames={props.candidateInputColumnNames[FILE_TYPE_DOCUMENTS]}
                updateSelectedInputColumn={(columnName) => props.updateSelectedInputColumns(FILE_TYPE_DOCUMENTS, columnName)}
                selectedInputColumn={props.selectedInputColumns[FILE_TYPE_DOCUMENTS]}
                fileUploaded={props.filesUploaded[FILE_TYPE_DOCUMENTS]}
                setToNextPage={props.setToNextPage}
            />
        )
    }

}

const getTotalFilesToUpload = (projectType) => {
    switch(projectType){
        case PROJECT_TYPES.classification: 
            return 1;
        case  PROJECT_TYPES.ner:
            return 1;
        default:
            return 2;
    }
}

const initialiseLoading = (projectType) => {
    var loading = {};
    switch(projectType){
        case PROJECT_TYPES.classification: 
            loading[FILE_TYPE_DOCUMENTS] = false;
            return loading;
        case PROJECT_TYPES.ner:
            loading[FILE_TYPE_DOCUMENTS] = false;
            return loading;
        default:
            loading[FILE_TYPE_DOCUMENTS] = false;
            loading[FILE_TYPE_KB] = false;
            return loading;
    }

}

const initialiseSelectedColumns = (projectType) => {
    var columnNames = {};
    switch(projectType){
        case PROJECT_TYPES.classification: 
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            return columnNames;
        case PROJECT_TYPES.ner:
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            return columnNames;
        default:
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            columnNames[FILE_TYPE_KB] = undefined;
            return columnNames;
    }

}

const initialiseCandidateColumnNames = (projectType) => {
    var columnNames = {};
    switch(projectType){
        case PROJECT_TYPES.classification: 
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            return columnNames;
        case PROJECT_TYPES.ner:
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            return columnNames;
        default:
            columnNames[FILE_TYPE_DOCUMENTS] = undefined;
            columnNames[FILE_TYPE_KB] = undefined;
            return columnNames;
    }

}

const initialiseNextPage = (projectType, projectName) => {
    if(!projectName){
        return undefined;
    }

    if(projectType == PROJECT_TYPES.classification || projectType == PROJECT_TYPES.ner){
        return"/select";
    }else{
        return `/projects/${projectNameSlug}`;
    }
}


class FileUploadMain extends React.Component{

    constructor(props) {
        console.log("Constructing FileUploadMain", props);
        super(props);
        this.state = {
            projectName: (props.projectName || ""),
            loading: initialiseLoading(props.projectType),
            toNextPage: false,
            nextPage: initialiseNextPage(props.projectType, props.projectName),
            totalFilesToUpload: getTotalFilesToUpload(props.projectType),
            disableChangeProjectName: !!props.projectName,
            selectedInputColumns: initialiseSelectedColumns(props.projectType),
            candidateInputColumnNames: initialiseCandidateColumnNames(props.projectType),
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if(prevProps.projectName != this.props.projectName){
            this.setState( {projectName: this.props.projectName} );
        }
        if(prevProps.projectType != this.props.projectType){
            this.setState( {
                loading: initialiseLoading(this.props.projectType),
                selectedInputColumns: initialiseSelectedColumns(this.props.projectType),
                candidateInputColumnNames: initialiseCandidateColumnNames(this.props.projectType),
                totalFilesToUpload: getTotalFilesToUpload(this.props.projectType),
                nextPage: initialiseNextPage(this.props.projectType, this.props.projectName)} );
        }
    }

    validateProjectSlug = (projectNameSlug) => {
        if(_.includes(this.props.existingProjectSlugs, projectNameSlug)){
            return {isValid: false, errorMsg: "Project name already exists."};
        }
        if(!projectNameSlug){
            return {isValid: false, errorMsg: "Project name is not valid."};
        }
        return {isValid: true};
    }

    setProjectName = (event) => {
        console.log('Name changed: ', event.target.value);
        const projectName = event.target.value;
        const projectNameSlug = getSlug(projectName);

        if(this.props.projectType == PROJECT_TYPES.classification || this.props.projectType == PROJECT_TYPES.ner){
            this.setState( {projectName,
                                nextPage: "/select"} );
        }else{
            this.setState( {projectName,
                            nextPage: `/projects/${projectNameSlug}`} );
        }

    }

    updateLoadingState = (fileType, loadingStatus) => {
        this.setState((prevState) => {
            const loading = {...prevState.loading};
            loading[fileType] = loadingStatus;
            console.log("Inside updateLoadingState", loading)
            return { loading };
        })
    }

    updateCandidateInputColumnNames = (fileType, columnNames) => {
        this.setState((prevState) => {
            const candidateInputColumnNames = {...prevState.candidateInputColumnNames};
            candidateInputColumnNames[fileType] = columnNames;
            console.log("Inside updateCandidateInputColumnNames", columnNames)
            return { candidateInputColumnNames };
        })
    }

    updateSelectedInputColumns = (fileType, columnIndex) => {
        this.setState((prevState) => {
            const selectedInputColumns = {...prevState.selectedInputColumns};
            selectedInputColumns[fileType] = columnIndex;
            return { selectedInputColumns };
        })
    }

    updateStateAfterSuccessfulLoading = (fileType, filename) => {
        const filesUploaded = this.props.filesUploaded;
        filesUploaded[fileType] = filename;

        console.log("Inside updateStateAfterSuccessfulLoading",
        Object.keys(filesUploaded).length, this.state.totalFilesToUpload);

        if(Object.keys(filesUploaded).length == this.state.totalFilesToUpload){
            this.props.setProjectUploadFinished();
        }

        this.setState((prevState) => {
            console.log("Inside updateStateAfterSuccessfulLoading setState ",
            Object.keys(filesUploaded).length, prevState.totalFilesToUpload);
            if(Object.keys(filesUploaded).length == prevState.totalFilesToUpload){
                const loading = {...prevState.loading};
                loading[fileType] = false;

                return {loading};
            }else{
                const loading = {...prevState.loading};
                loading[fileType] = false;

                return { loading,
                         disableChangeProjectName: true};
            }
        });

        this.props.setFilename(fileType, filename);
    }


    loadFile = (selectedFile, 
                columnName,
                fileType,
                uploadId, 
                attemptNum, 
                polling) => {

        console.log("Inside loadFile", attemptNum, polling, selectedFile);
        const data = new FormData();
        console.log('The name of the project is', this.state.projectName);
        data.append('file', selectedFile);
        data.append('project_name', this.state.projectName);
        data.append('project_type', this.props.projectType);
        data.append('file_type', fileType);
        data.append('column_name', columnName);
        if(fileType==FILE_TYPE_KB){
            data.append('kb_upload_id', uploadId);
        }
        else{
            data.append('upload_id', uploadId);
        }
        data.append('polling', polling);
        console.log('data', data);
        
        $.ajax({
            url : '/api/upload',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            timeout: 60000,
            success : function(data) {
                var today = new Date();
                const jsonData = renameKeysToCamelCase(JSON.parse(data));
                console.log("jsonData", jsonData);
                const projectId = jsonData.id;
                if(!projectId){
                    if(attemptNum < UPLOAD_PARAMS.totalAttempts){
                        setTimeout(() => this.loadFile(selectedFile, 
                                                        columnName,
                                                        fileType,
                                                        uploadId, 
                                                        attemptNum+1, 
                                                        true), 
                                   UPLOAD_PARAMS.timeAttemptms);
                    }
                    else{
                        alert("Server timed out");
                        this.updateLoadingState(fileType, true);
                    }
                }else{
                    console.log("File loaded successfully", today.toLocaleString());
                    this.props.addProjectToList(this.state.projectName,
                                                projectId);

                    this.updateStateAfterSuccessfulLoading(fileType, selectedFile.name);   

                    if(fileType==FILE_TYPE_KB){
                        console.log("jsonData.classNames", jsonData.classNames);
                        this.props.setClassNames(jsonData.classNames); 
                    }                
                }
            }.bind(this),
            error: function (xmlhttprequest, textstatus, message) {
                console.log("Error", textstatus, message);
                if(textstatus==="timeout" & attemptNum < UPLOAD_PARAMS.totalAttempts) {
                    setTimeout(() => this.loadFile(selectedFile, 
                                                    columnName,
                                                    fileType,
                                                    uploadId, 
                                                    attemptNum+1, 
                                                    true), 
                                UPLOAD_PARAMS.timeAttemptms);
                }
                else{
                    alert("Error during upload");
                    this.updateLoadingState(fileType, false);
                }
            }.bind(this)
        });

        this.updateLoadingState(fileType, true);
    }


    validateColumnsAndUpload = (selectedFile, fileType, columns) => {
        console.log("Inside validateColumnsAndUpload", DEFAULT_TEXT_COLUMN,
        columns, _.includes(columns, DEFAULT_TEXT_COLUMN))
        if(_.includes(columns, DEFAULT_TEXT_COLUMN)){
            this.loadFile(selectedFile, 
                          DEFAULT_TEXT_COLUMN,
                          fileType, 
                          uuid(), 
                          0, 
                          false);
        }else{
            this.updateCandidateInputColumnNames(fileType, columns);
        }
    }

    setToNextPage = () => {
        this.setState({toNextPage: true});
    }

    createProject = (selectedFile, fileType="documents") => {

        console.log("Inside createProject", this.props);

        const validation = this.validateProjectSlug(getSlug(this.state.projectName));

        if(!validation.isValid){
            alert(validation.errorMsg);
            return null;
        }

        if(!selectedFile){
            alert("Need to select file!");
        }
        if(!this.props.projectType){
            alert("Need to select project type!");
        }else{
            const selectedColumn = this.state.selectedInputColumns[fileType];
            if(typeof selectedColumn === 'undefined'){
                var results = Papa.parse(selectedFile, 
                    {header: true,
                    preview: 1,
                    complete: function(results) {
                            this.validateColumnsAndUpload(selectedFile, fileType, results.meta.fields);
                        }.bind(this)
                    });
            }else{
                this.loadFile(selectedFile, 
                                this.state.candidateInputColumnNames[selectedColumn],
                                fileType, 
                                uuid(), 
                                0, 
                                false);
            }
        }
    }

    render() {
        const { classes } = this.props;

        if(this.state.toNextPage){
            return (
                <Redirect to={{pathname: this.state.nextPage}}/>
            )
        }else{
            return (
                <div className={classes.container}>
                    <SideBar/>
                    <FileUploadForm 
                        projectType={this.props.projectType}
                        selectFile={this.selectFile}
                        createProject={this.createProject}
                        setProjectName={this.setProjectName}
                        projectName={this.state.projectName}
                        loading={this.state.loading}
                        filesUploaded={this.props.filesUploaded}
                        disableChangeProjectName={this.state.disableChangeProjectName}
                        candidateInputColumnNames={this.state.candidateInputColumnNames}
                        selectedInputColumns={this.state.selectedInputColumns}
                        updateSelectedInputColumns={this.updateSelectedInputColumns}
                        setToNextPage={this.setToNextPage}
                    />
                </div>
            )
        }
    }
}

export default withStyles(styles)(FileUploadMain);