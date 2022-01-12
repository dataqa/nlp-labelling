import React from 'react';
import ProjectMain from '../components/project-summary/ProjectMain';
import FileUploadMain from '../components/file-upload/FileUploadMain';
import NotFoundPage from '../components/NotFoundPage';
import ProjectParamsPage from '../components/set-project-params/ProjectParamsPage';


class ProjectStartPage extends React.Component {
    
    constructor(props){
        super(props);
        this.props.setAllProjectVars(this.props.uri);

        console.log("Inside ProjectStartPage", this.props);
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("ProjectStartPage did update", prevState, prevProps, this.props);
    }

    render() {
        if(!this.props.projectName){
            return <NotFoundPage/>
        }

        if(this.props.projectUploadFinished && this.props.projectParamsFinished){
            return <ProjectMain
                        projectName={this.props.projectName}
                        projectNameSlug={this.props.projectNameSlug}
                        projectType={this.props.projectType}
                        classNames={this.props.classNames}
                        deleteProject={this.props.deleteProject}
                        setRules={this.props.setRules}
                    />
        }
        
        if(this.props.projectUploadFinished){
            return <ProjectParamsPage
                        projectName={this.props.projectName}
                        setProjectParams={this.props.setClassNames}
                        setProjectParamsFinished={this.props.setProjectParamsFinished}/>
        }

        // console.log("Doing file upload", props);
        return <FileUploadMain
                    projectName={this.props.projectName}
                    projectType={this.props.projectType}
                    wikiData={this.props.wikiData}
                    addProjectToList={this.props.addProjectToList}
                    setProjectUploadFinished={this.props.setProjectUploadFinished}
                    setFilename={this.props.setFilename}
                    filesUploaded={this.props.filenames}
                    setClassNames={this.props.setClassNames}
                />
    }
}

export default ProjectStartPage;