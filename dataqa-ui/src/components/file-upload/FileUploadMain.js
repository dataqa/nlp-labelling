import React from 'react';
import SingleFileUploadForm from './SingleFileUploadForm';
import MultipleFileUploadForm from './MultipleFileUploadForm';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import SideBar from '../SideBar';
import { withStyles } from '@material-ui/core/styles';
import uuid from 'react-uuid';
import { PROJECT_TYPES, FILE_TYPE_DOCUMENTS, FILE_TYPE_KB } from '../constants';
import { getSlug } from '../../utils';


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
            />
        )
    }else{
        return (
            <SingleFileUploadForm 
                createProject={props.createProject}
                setProjectName={props.setProjectName}
                projectName={props.projectName}
                loading={props.loading[FILE_TYPE_DOCUMENTS]}
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


class FileUploadMain extends React.Component{

    constructor(props) {
        console.log("Constructing FileUploadMain", props);
        super(props);
        this.state = {
            projectName: (props.projectName || ""),
            loading: initialiseLoading(props.projectType),
            toNextPage: false,
            nextPage: undefined,
            totalFilesToUpload: getTotalFilesToUpload(props.projectType),
            disableChangeProjectName: !!props.projectName
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if(prevProps.projectName != this.props.projectName){
            this.setState( {projectName: this.props.projectName} );
        }
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
                return {toNextPage: true};
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
                const jsonData = JSON.parse(data);
                console.log("jsonData", jsonData);
                const projectId = jsonData.id;
                if(!projectId){
                    if(attemptNum < UPLOAD_PARAMS.totalAttempts){
                        setTimeout(() => this.loadFile(selectedFile, 
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
                        this.props.setClassNames(jsonData.classNames); 
                    }                
                }
            }.bind(this),
            error: function (xmlhttprequest, textstatus, message) {
                console.log("Error", textstatus, message);
                if(textstatus==="timeout" & attemptNum < UPLOAD_PARAMS.totalAttempts) {
                    setTimeout(() => this.loadFile(selectedFile, 
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

    createProject = (e, fileType="documents") => {
        e.preventDefault();
        const selectedFile = e.target.files[0];
        console.log("Inside createProject");
        if(this.state.projectName === "Name of project" || !this.state.projectName){
            alert("Need to set project name!");
        }else{
            if(!selectedFile){
                alert("Need to select file!");
            }
            if(!this.props.projectType){
                alert("Need to select project type!");
            }else{
                this.loadFile(selectedFile, 
                                fileType, 
                                uuid(), 
                                0, 
                                false);
            }
        }
        e.target.value = null;
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
                    />
                </div>
            )
        }
    }
}

export default withStyles(styles)(FileUploadMain);