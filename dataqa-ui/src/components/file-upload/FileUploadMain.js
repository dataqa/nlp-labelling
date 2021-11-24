import React from 'react';
import SingleFileUploadForm from './SingleFileUploadForm';
import MultipleFileUploadForm from './MultipleFileUploadForm';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import SideBar from '../SideBar';
import { withStyles } from '@material-ui/core/styles';
import uuid from 'react-uuid';
import { PROJECT_TYPES, 
        FILE_TYPE_DOCUMENTS, 
        FILE_TYPE_DOCUMENTS_WIKI,
        FILE_TYPE_KB, 
        DEFAULT_TEXT_COLUMN,
        DEFAULT_MENTIONS_COLUMNS,
        DEFAULT_KB_COLUMNS,
        DEFAULT_WIKI_COLUMN,
        DOCS_TEXT_FILE_FORMAT,
        WIKI_DOCS_FILE_FORMAT} from '../constants';
import { getSlug } from '../../utils';
import { renameKeysToCamelCase } from '../utils';
import Papa from 'papaparse';
import _ from 'lodash';

const UPLOAD_PARAMS = {
    totalAttempts: 100,
    timeAttemptms: 15000
}

const styles = theme => ({
    container: {display: 'flex'},
    root: {
        maxWidth: 'sm',
        paddingLeft: 16
    }
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
                setProjectUploadFinished={props.setProjectUploadFinished}
            />
        )
    }else{
        const title = props.wikiData? "Load a csv file with the wikipedia urls or paths.": "Load a csv file with the documents.";
        const defaultColumns = props.wikiData? [DEFAULT_WIKI_COLUMN]: [DEFAULT_TEXT_COLUMN];
        const helpTextLink =  props.wikiData? WIKI_DOCS_FILE_FORMAT: DOCS_TEXT_FILE_FORMAT;

        return (
            <SingleFileUploadForm 
                rootClassName={props.classes.root}
                id={"contained-button-file"}
                instructionText={title}
                helpText={<p>No column {defaultColumns[0]} found in file. Read more in the <a  href={helpTextLink} target="_blank"> documentation</a>. Please select columns:</p>}
                createProject={(selectedFile, defaultColumnNames) => props.createProject(selectedFile, defaultColumnNames, FILE_TYPE_DOCUMENTS, props.wikiData)}
                defaultColumnNames={defaultColumns}
                setProjectName={props.setProjectName}
                projectName={props.projectName}
                loading={props.loading[FILE_TYPE_DOCUMENTS]}
                candidateInputColumnNames={props.candidateInputColumnNames[FILE_TYPE_DOCUMENTS]}
                updateSelectedInputColumns={(columnIndex, defaultColumns) => props.updateSelectedInputColumns(FILE_TYPE_DOCUMENTS, columnIndex, defaultColumns)}
                selectedInputColumns={props.selectedInputColumns[FILE_TYPE_DOCUMENTS]}
                fileUploaded={props.filesUploaded[FILE_TYPE_DOCUMENTS]}
                setToNextPage={props.setToNextPage}
                setProjectUploadFinished={props.setProjectUploadFinished}
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

const initialiseSelectedColumns = (projectType, isWiki) => {
    var columnNames = {};
    switch(projectType){
        case PROJECT_TYPES.classification: 
            columnNames[FILE_TYPE_DOCUMENTS] = {};
            columnNames[FILE_TYPE_DOCUMENTS][DEFAULT_TEXT_COLUMN] = undefined;
            return columnNames;
        case PROJECT_TYPES.ner:
            columnNames[FILE_TYPE_DOCUMENTS] = {};
            if(isWiki){
                columnNames[FILE_TYPE_DOCUMENTS][DEFAULT_WIKI_COLUMN] = undefined;
            }
            else{
                columnNames[FILE_TYPE_DOCUMENTS][DEFAULT_TEXT_COLUMN] = undefined;
            }
            return columnNames;
        default:
            columnNames[FILE_TYPE_DOCUMENTS] = {};
            for(const val in DEFAULT_MENTIONS_COLUMNS){
                columnNames[FILE_TYPE_DOCUMENTS][DEFAULT_MENTIONS_COLUMNS[val]] = undefined;
            }

            columnNames[FILE_TYPE_KB] = {};
            for(const val in DEFAULT_KB_COLUMNS){
                columnNames[FILE_TYPE_KB][DEFAULT_KB_COLUMNS[val]] = undefined;
            }
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
        const projectNameSlug = getSlug(projectName);
        return `/projects/${projectNameSlug}`;
    }
}

class FileUploadMain extends React.Component{

    constructor(props) {
        console.log("Constructing FileUploadMain", props);
        super(props);

        const totalFilesToUpload = getTotalFilesToUpload(props.projectType);

        this.state = {
            projectName: (props.projectName || ""),
            loading: initialiseLoading(props.projectType),
            toNextPage: false,
            nextPage: initialiseNextPage(props.projectType, props.projectName),
            totalFilesToUpload: totalFilesToUpload,
            disableChangeProjectName: !!props.projectName,
            selectedInputColumns: initialiseSelectedColumns(props.projectType, props.wikiData),
            candidateInputColumnNames: initialiseCandidateColumnNames(props.projectType)
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if(prevProps.projectName != this.props.projectName){
            this.setState( {
                projectName: this.props.projectName,
                disableChangeProjectName: !!this.props.projectName
            } );
        }
        if(prevProps.projectType != this.props.projectType){

            const totalFilesToUpload = getTotalFilesToUpload(this.props.projectType);

            this.setState( {
                loading: initialiseLoading(this.props.projectType),
                selectedInputColumns: initialiseSelectedColumns(this.props.projectType,
                                                                this.props.wikiData),
                candidateInputColumnNames: initialiseCandidateColumnNames(this.props.projectType),
                totalFilesToUpload: totalFilesToUpload,
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

    updateSelectedInputColumns = (fileType, columnIndex, columnType='text') => {
        console.log("Inside updateSelectedInputColumns", fileType, columnIndex, columnType);

        this.setState((prevState) => {
            const selectedInputColumns = {...prevState.selectedInputColumns};
            selectedInputColumns[fileType][columnType] = columnIndex;
            return { selectedInputColumns };
        })
    }

    updateStateAfterSuccessfulLoading = (fileType, filename) => {
        const filesUploaded = this.props.filesUploaded;
        filesUploaded[fileType] = filename;

        console.log("Inside updateStateAfterSuccessfulLoading",
        Object.keys(filesUploaded).length, this.state.totalFilesToUpload);

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
                columnNames,
                fileType,
                isWiki,
                uploadId, 
                attemptNum, 
                polling) => {

        console.log("Inside loadFile", attemptNum, polling, selectedFile, columnNames);
        const data = new FormData();
        console.log('The name of the project is', this.state.projectName);
        data.append('file', selectedFile);
        data.append('project_name', this.state.projectName);
        data.append('project_type', this.props.projectType);
        data.append('file_type', isWiki? FILE_TYPE_DOCUMENTS_WIKI: fileType);
        data.append('column_names', JSON.stringify(columnNames));
        if(fileType==FILE_TYPE_KB){
            data.append('kb_upload_id', uploadId);
        }
        else{
            data.append('upload_id', uploadId);
        }
        data.append('polling', polling);
        console.log('data', ...data);
        
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
                                                        columnNames,
                                                        fileType,
                                                        isWiki,
                                                        uploadId, 
                                                        attemptNum+1, 
                                                        true), 
                                   UPLOAD_PARAMS.timeAttemptms);
                    }
                    else{
                        alert("Server timed out");
                        this.updateLoadingState(fileType, false);
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
                                                    columnNames,
                                                    fileType,
                                                    isWiki,
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


    validateColumnsAndUpload = (selectedFile, fileType, isWiki, defaultColumnNames, columns) => {

        console.log("Inside validateColumnsAndUpload", defaultColumnNames,
        columns);

        const columnIndicesIncluded = defaultColumnNames.map((row, index) => _.includes(columns, row) && index).filter((val) => val !== false);

        console.log("Inside validateColumnsAndUpload 2", columnIndicesIncluded);

        if(columnIndicesIncluded.length == defaultColumnNames.length){
            let defaultColumnNamesMapping={};
            defaultColumnNames.forEach((key)=>{
                defaultColumnNamesMapping[key]=key
            }); 

            this.loadFile(selectedFile, 
                          defaultColumnNamesMapping,
                          fileType, 
                          isWiki,
                          uuid(), 
                          0, 
                          false);
        }else{
            this.updateCandidateInputColumnNames(fileType, columns);

            for(const columnIndex in columnIndicesIncluded){
                this.updateSelectedInputColumns(fileType, columnIndicesIncluded[columnIndex], defaultColumnNames[columnIndicesIncluded[columnIndex]]);
            }
        }
    }

    setToNextPage = () => {
        this.setState({toNextPage: true});
    }

    formatselectedColumns = (selectedColumnIndices, candidateColumnNames) => {
        const selectedColumnNames = {};
        
        for (const [columnType, columnIndex] of Object.entries(selectedColumnIndices)) {
            selectedColumnNames[columnType] = candidateColumnNames[columnIndex];
        }

        console.log("formatselectedColumns", selectedColumnNames);

        return selectedColumnNames
    }

    hasAnyColumnBeenSelected = (fileType) => {
        for(const colType in this.state.selectedInputColumns[fileType]){
            if(typeof this.state.selectedInputColumns[fileType][colType] !== 'undefined'){
                return true
            }
        } 
        return false;
    }

    createProject = (selectedFile, 
                    defaultColumnNames,
                    fileType="documents",
                    isWiki=false) => {

        console.log("Inside createProject", defaultColumnNames, this.props, !this.props.filesUploaded, this.state.projectName, this.validateProjectSlug(getSlug(this.state.projectName)));

        if(Object.keys(this.props.filesUploaded).length === 0){
            const validation = this.validateProjectSlug(getSlug(this.state.projectName));

            if(!validation.isValid){
                alert(validation.errorMsg);
                return false;
            }
        }

        if(!selectedFile){
            alert("Need to select file!");
            return false;
        }

        if(!this.props.projectType){
            alert("Need to select project type!");
            return false;
        }

        console.log("Inside createProject 2");

        if(!this.hasAnyColumnBeenSelected(fileType)){
            console.log("Inside createProject 3");
            var results = Papa.parse(selectedFile, 
                {header: true,
                preview: 1,
                complete: function(results) {
                        this.validateColumnsAndUpload(selectedFile, 
                                                        fileType,
                                                        isWiki,
                                                        defaultColumnNames,
                                                        results.meta.fields);
                    }.bind(this),
                error: function(err, file, inputElem, reason)
                    {
                        alert(err);
                    }.bind(this)
                });
            return true;
        }else{
            console.log("Inside createProject 4");
            const selectedColumns = this.state.selectedInputColumns[fileType];
            const candidateColumnNames = this.state.candidateInputColumnNames[fileType];
            this.loadFile(selectedFile, 
                            this.formatselectedColumns(selectedColumns, candidateColumnNames),
                            fileType, 
                            isWiki,
                            uuid(), 
                            0, 
                            false);
            return true;
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
                        classes={classes}
                        projectType={this.props.projectType}
                        wikiData={this.props.wikiData}
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
                        setProjectUploadFinished={this.props.setProjectUploadFinished}
                    />
                </div>
            )
        }
    }
}

export default withStyles(styles)(FileUploadMain);