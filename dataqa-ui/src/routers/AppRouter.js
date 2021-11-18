import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import NotFoundPage from '../components/NotFoundPage';
import FileUploadMain from '../components/file-upload/FileUploadMain';
import ProjectParamsPage from '../components/set-project-params/ProjectParamsPage';
import RuleMain from '../components/rules/main-page/RuleMain';
import OrderedRule from '../components/rules/rule-forms/classification-rules/OrderedRule';
import SentimentRule from '../components/rules/rule-forms/classification-rules/SentimentRule';
import NonOrderedRule from '../components/rules/rule-forms/classification-rules/NonOrderedRule';
import RegexRule from '../components/rules/rule-forms/ner-rules/RegexRule';
import NounPhraseRule from '../components/rules/rule-forms/ner-rules/NounPhraseRule';
import LabelPage from '../components/label-page/LabelPage';
import Projects from '../components/projects/Projects';
import Search from '../components/search/Search';
import WelcomePage from '../components/welcome-page/WelcomePage';
import ProjectStartPage from './ProjectStartPage';
import { getSlug } from '../utils';
import $ from 'jquery';
import _ from 'lodash';
import { renameKeysToCamelCase } from '../components/utils';


//TODO: Remove the component call from the Route (to avoid unnecessary re-renders)

const compareClassNames = (previous, current) => {
    return _.isEqual(previous, current);
}

const convertProjectsData = (jsonData) => {
    var newObj = renameKeysToCamelCase(jsonData);
    newObj.projectNameSlug = getSlug(newObj.projectName);
    console.log("convertProjectsData", jsonData, newObj);
    return newObj;
}

export default class AppRouter extends React.Component {

    state = {
        projectName: undefined,
        projectNameSlug: undefined,
        projectType: undefined,
        wikiData: undefined,
        classNames : undefined,
        projectUploadFinished: false,
        projectParamsFinished: false,
        projects: [],
        filenames: {}
    }

    updateProjects(){
        $.ajax({
            url : '/api/get-projects',
            type : 'GET',
            success : function(data) {
                const jsonData = JSON.parse(data);
                console.log("jsonData", jsonData);
                const projects = jsonData.map(obj => convertProjectsData(obj));
                console.log("projects", projects);
                this.setState( {projects} );
            }.bind(this),
            error: function (error) {
                alert("Error getting all the projects.");
            }
        });
    }

    componentDidMount(){
        console.log("Inside componentDidMount of AppRouter.")
        
        this.updateProjects();

        try{
            const projectName = localStorage.getItem('projectName');
            const projectType = localStorage.getItem('projectType');
            const wikiData = localStorage.getItem('wikiData');
            const classNames = localStorage.getItem('classNames');
            const projectUploadFinished = localStorage.getItem('projectUploadFinished');
            const projectParamsFinished = localStorage.getItem('projectParamsFinished');

            console.log("Just mounted AppRouter,", projectName, projectType, wikiData, classNames);

            const filenames = localStorage.getItem('filenames');

            if (projectName){
                const projectNameSlug = getSlug(projectName);
                this.setState(() => ({ projectName, projectNameSlug }));
            }

            if (projectType && (projectType != "undefined")){
                this.setState(() => ({ projectType }));
            }

            if (wikiData && (wikiData != "undefined")){
                this.setState(() => ({ wikiData }));
            }

            if  (classNames && (classNames != "undefined")){
                this.setState(() => ({classNames: JSON.parse(classNames)}));
            }

            if(projectUploadFinished != "undefined"){
                this.setState( { projectUploadFinished: (projectUploadFinished == "true") });
            }

            if(projectParamsFinished != "undefined"){
                this.setState( { projectParamsFinished: (projectParamsFinished == "true") });
            }

            if(filenames != "undefined" && !!filenames){
                console.log("setting filenames to", filenames, JSON.parse(filenames))
                this.setState( { filenames: JSON.parse(filenames) });
            }else{
                this.setState( { filenames: {} });
            }


        } catch (e){
            // Do nothing at all
        }
    }

    componentDidUpdate(prevProps, prevState){
        console.log("inside componentDidUpdate", prevState, this.state, 
        prevState.projectName != this.state.projectName);

        if (prevState.projectName != this.state.projectName) {
            localStorage.setItem('projectName', this.state.projectName);
        }
        if (prevState.projectType != this.state.projectType) {
            localStorage.setItem('projectType', this.state.projectType);
        }
        if (prevState.wikiData != this.state.wikiData) {
            localStorage.setItem('wikiData', this.state.wikiData);
        }
        if (prevState.projectUploadFinished != this.state.projectUploadFinished) {
            localStorage.setItem('projectUploadFinished', this.state.projectUploadFinished);
        }
        if (prevState.projectParamsFinished != this.state.projectParamsFinished) {
            localStorage.setItem('projectParamsFinished', this.state.projectParamsFinished);
        }
        if(!compareClassNames(prevState.classNames, this.state.classNames)) {
            console.log(`ClassNames have changed from `, 
                        prevState.classNames, 
                        this.state.classNames);
            localStorage.setItem('classNames', JSON.stringify(this.state.classNames));
        }
    }

    addProjectToList = (projectName, projectId) => {
        // we need to add project because the get-projects api only gets called
        // when AppRouter is first mounted
        // this is only called once the upload is partially done
        this.setState((prevState) =>  {
            console.log("Inside addProjectToList", prevState.projects);

            for(let projectIndex in prevState.projects){
                if(projectId == prevState.projects[projectIndex].projectId){
                    return {};
                }
            }

            const projectNameSlug = getSlug(projectName);
            console.log(`(addProjectToList) Setting project name slug to ${projectNameSlug}`);
            const projects = prevState.projects.concat({"projectId": projectId, 
                                                        "projectName": projectName,
                                                        "projectNameSlug": projectNameSlug,
                                                        "projectType": prevState.projectType,
                                                        "wikiData": prevState.wikiData,
                                                        "projectUploadFinished": prevState.projectUploadFinished,
                                                        "projectParamsFinished": prevState.projectParamsFinished,
                                                        "filenames": prevState.filenames
                                                    });
            return {projects, projectName, projectNameSlug}});
    }

    getUpdatedProjectsCopy = (key, value, prevState) => {
        let projectIndexToModify;
        for(let projectIndex in prevState.projects){
            if(prevState.projectNameSlug == prevState.projects[projectIndex].projectNameSlug){
                projectIndexToModify = projectIndex;
            }
        }

        if(typeof projectIndexToModify == 'undefined'){
            return prevState.projects;
        }

        const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
        projectsCopy[projectIndexToModify][key] = value;
        console.log('getUpdatedProjectsCopy', projectsCopy, prevState.projects);

        return projectsCopy;
    }

    resetCurrentProject = () => {
        this.setState({projectName: undefined,
                        projectNameSlug: undefined,
                        projectType: undefined,
                        wikiData: undefined,
                        classNames: undefined,
                        projectUploadFinished: false,
                        projectParamsFinished: false,
                        filenames: {}});
        localStorage.clear();
        console.log('resetCurrentProject', this.state);
    }

    setProjectType = (projectType, projectParamsFinished, wikiData=false) => {
        this.setState( {projectType, projectParamsFinished, wikiData} );
    }

    setProjectName = (projectName) => {
        const projectNameSlug = getSlug(projectName);
        console.log(`Setting project name slug to ${projectNameSlug}`);
        this.setState( {projectName,
                        projectNameSlug } );
    }

    setClassNames = (classNames) => {
        this.setState((prevState) =>  { return {classNames,
                                                projects: this.getUpdatedProjectsCopy('classNames', classNames, prevState)}});
    };

    setProjectUploadFinished = ( flag=true ) => {
        this.setState((prevState) =>  { return {projectUploadFinished: flag,
                                                projects: this.getUpdatedProjectsCopy('projectUploadFinished', flag, prevState)}});
    }

    setProjectParamsFinished = ( flag=true ) => {
        console.log("Calling setProjectParamsFinished ", flag)
        this.setState((prevState) =>  { return {projectParamsFinished: flag,
                                                projects: this.getUpdatedProjectsCopy('projectParamsFinished', flag, prevState)}});
    }

    setFilename = (fileType, filename) => {
        console.log("setting filename", fileType, filename);

        this.setState((prevState) => {
            console.log(prevState.filenames);
            const filenames = {...prevState.filenames,
                              [fileType]: filename};
            console.log("filenames becomes", filenames, prevState.filenames);
            localStorage.setItem('filenames', JSON.stringify(filenames));
            return { filenames,
                     projects: this.getUpdatedProjectsCopy('filenames', filenames, prevState) };
        });
    }

    setAllProjectVars = (uri) => {
        console.log("setting all vars");

        const projectNameUrl = decodeURIComponent(uri);
        if(projectNameUrl === this.state.projectName){
            return;
        }
        for(let projectIndex in this.state.projects){
            console.log("Comparing ", uri, projectNameUrl, this.state.projects[projectIndex]);
            if(projectNameUrl === this.state.projects[projectIndex].projectName){
                const currentProject = this.state.projects[projectIndex];
                console.log("Doing currentProject", currentProject);

                this.setProjectName(currentProject.projectName);
                this.setProjectType(currentProject.projectType, currentProject.wikiData);
                this.setClassNames(currentProject.classNames);
                this.setProjectUploadFinished(currentProject.projectUploadFinished);
                this.setProjectParamsFinished(currentProject.projectParamsFinished);
                this.setState( {filenames: currentProject.filenames });
                // This did not work in ComponentDidUpdate
                localStorage.setItem('filenames', JSON.stringify(currentProject.filenames));
                return;
            }
        }
    }

    deleteProject = (projectName) => {
        console.log("Inside deleteProject ", this.state.projects.filter(project => project.projectName != projectName))
        this.setState((prevState) => {
            return { projects: prevState.projects.filter(project => project.projectName != projectName)}
        })
    }

    render() {
        return (
            <BrowserRouter>
                    <Switch>
                        <Route 
                            path="/" 
                            render={() => <WelcomePage
                                            setProjectType={this.setProjectType}
                                            resetCurrentProject={this.resetCurrentProject}/>} 
                            exact={true}
                        />

                        <Route 
                            path="/upload" 
                            render={() => <FileUploadMain
                                            existingProjectSlugs={this.state.projects.map((x) => x.projectNameSlug)}
                                            projectName={this.state.projectName}
                                            projectType={this.state.projectType}
                                            wikiData={this.state.wikiData}
                                            addProjectToList={this.addProjectToList}
                                            setProjectUploadFinished={this.setProjectUploadFinished}
                                            setFilename={this.setFilename}
                                            setClassNames={this.setClassNames}
                                            filesUploaded={this.state.filenames}/>} 
                            exact={true}
                        />

                        <Route 
                            path="/select" 
                            render={() => <ProjectParamsPage
                                                projectName={this.state.projectName}
                                                setProjectParams={this.setClassNames}
                                                setProjectParamsFinished={this.setProjectParamsFinished}/>}
                        />
                        
                        <Route 
                            path="/rules" 
                            render={() => <RuleMain 
                                            projectName={this.state.projectName}
                                            projectNameSlug={this.state.projectNameSlug}
                                            projectType={this.state.projectType}/>}/>
                        
                        <Route
                            path="/search"
                            render={() => <Search
                                            projectName={this.state.projectName}
                                            projectNameSlug={this.state.projectNameSlug}
                                            projectType={this.state.projectType}
                                            classNames={this.state.classNames}/>}
                        />
                        <Route 
                            path="/ordered" 
                            render={() => <OrderedRule {...this.state} />}/>

                        <Route 
                            path="/non-ordered" 
                            render={() =>   <NonOrderedRule {...this.state}/>}/>

                        <Route 
                            path="/regex" 
                            render={() =>   <RegexRule {...this.state}/>}/>    

                        <Route 
                            path="/noun-phrase" 
                            render={() =>   <NounPhraseRule {...this.state}/>}/>   

                        <Route 
                            path="/sentiment"
                            render={()=>    <SentimentRule {...this.state}/>}
                        />

                        <Route 
                            path="/projects/:name" 
                            render={(routeProps) => 
                                {
                                    return (
                                        <ProjectStartPage 
                                            setProjectUploadFinished={this.setProjectUploadFinished}
                                            setProjectParamsFinished={this.setProjectParamsFinished}
                                            deleteProject={this.deleteProject}
                                            setFilename={this.setFilename}
                                            addProjectToList={this.addProjectToList}
                                            setAllProjectVars={this.setAllProjectVars}
                                            uri={routeProps.match.params.name}
                                            //state vars
                                            projectUploadFinished={this.state.projectUploadFinished}
                                            projectParamsFinished={this.state.projectParamsFinished}
                                            projectName={this.state.projectName}
                                            projectNameSlug={this.state.projectNameSlug}
                                            projectType={this.state.projectType}
                                            wikiData={this.state.wikiData}
                                            filenames={this.state.filenames}
                                            classNames={this.state.classNames}
                                            setClassNames={this.setClassNames}
                                        />
                                    )
                                }
                            }
                        />

                        <Route 
                            path="/projects"
                            exact
                            render={() => <Projects 
                                                projects={this.state.projects}
                                                resetCurrentProject={this.resetCurrentProject}
                                            />}
                        />

                        <Route
                            path="/label"
                            render={(routeProps) => <LabelPage 
                                                        projectName={this.state.projectName}
                                                        projectNameSlug={this.state.projectNameSlug}
                                                        projectType={this.state.projectType}
                                                        classNames={this.state.classNames}
                                                        {...routeProps}/>}
                        />


                        <Route component={NotFoundPage}/>
                </Switch>
            </BrowserRouter>
        )
    };
}