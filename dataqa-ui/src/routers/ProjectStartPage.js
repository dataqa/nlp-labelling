import React from 'react';
import ProjectMain from '../components/project-summary/ProjectMain';
import FileUploadMain from '../components/file-upload/FileUploadMain';
import NotFoundPage from '../components/NotFoundPage';


class ProjectStartPage extends React.Component {
    // console.log("Inside ProjectStartPage", this.props);
    constructor(props){
        super(props);
        this.props.setAllProjectVars(this.props.uri);
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("ProjectStartPage did update", prevState, prevProps, this.props);
    }

    render() {
        if(!this.props.projectName){
            return <NotFoundPage/>
        }

        if(this.props.projectUploadFinished){
            return <ProjectMain
                        projectUploadFinished={this.props.projectUploadFinished}
                        projectName={this.props.projectName}
                        projectNameSlug={this.props.projectNameSlug}
                        projectType={this.props.projectType}
                        classNames={this.props.classNames}
                        deleteProject={this.props.deleteProject}
                    />
        }else{
            // console.log("Doing file upload", props);
            return <FileUploadMain
                        projectName={this.props.projectName}
                        projectType={this.props.projectType}
                        addProjectToList={this.props.addProjectToList}
                        setProjectUploadFinished={this.props.setProjectUploadFinished}
                        setFilename={this.props.setFilename}
                        filesUploaded={this.props.filenames}
                        setProjectUploadFinished={this.props.setProjectUploadFinished}
                    />
        }
    }
}

export default ProjectStartPage;