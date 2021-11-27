import React from 'react';
import { Redirect } from 'react-router-dom';
import $ from 'jquery';
import { drawerWidth } from '../../SideBar';
import SideBar from '../../SideBar';
import { withStyles } from '@material-ui/core/styles';
import ProjectDataDrawers from './ProjectDataDrawers';
import FileDownloadButton from '../common/FileDownloadButton';
import ExportRulesButton from './ExportRulesButton';
import uuid from 'react-uuid';
import { renameKeysToCamelCase } from '../../utils';
import DeleteProjectButton from '../common/DeleteProjectButton';
import ProjectTitle from '../ProjectTitle';


const RULE_UPDATE_PARAMS = {
    totalAttempts: 16,
    timeAttemptms: 15000
}


const styles = theme => ({
    container: {display: 'flex'},
    main_content: {margin: '20px',
                    width: `calc(100% - ${drawerWidth}px)`},  
    project_content: {marginTop: '20px'},
    offset: {...theme.mixins.toolbar},
    button: {marginTop: "20px",
            marginLeft: "10px"},
    table: {fontSize: "1.2em"},
    progress: {display: 'flex', 
                width: '100%', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%'}
  });

class SupervisedProjectMain extends React.Component{
    constructor(props) {
        super(props);
        // TODO: Need to have a sanitised name of project (url slug) to use in db
        // and to pass around via url
        console.log('Mounting the element', this.props);
        // this.projectName = this.props.projectName || this.props.match.params.id;

        this.state = {
            loading: true,
            disableDeletingRules: false,
            exploreRule: undefined,
            exploreLabelled: undefined,
            toProjects: false}
    }

    updateRules = (updateId, attemptNum, polling=false) => {
        console.log(`Updating the rules for project ${this.props.projectName}`);
        const data = new FormData();
        data.append('project_name', this.props.projectName);
        data.append('update_id', updateId);
        data.append('polling', polling);

        $.ajax({
            url : '/api/update-rules',
            type : 'POST',
            data : data,
            processData: false,
            contentType: false,
            timeout: 60000,
            success : function(data) {
                const json = renameKeysToCamelCase(JSON.parse(data));
                console.log("updateRules", json);
                const rules = json['rules'];
                const docs = json['docs'];
                const projectUpdateId = json['updateId']

                console.log("Successful rule update", projectUpdateId,
                updateId, JSON.parse(data));
                
                if(!projectUpdateId || projectUpdateId != updateId){
                    if(attemptNum < RULE_UPDATE_PARAMS.totalAttempts){
                        setTimeout(() => this.updateRules(updateId, attemptNum+1, true), 
                                    RULE_UPDATE_PARAMS.timeAttemptms);
                    }
                    else{
                        alert("Server timed out. Could not update rules.");
                        this.setState({loading: false});
                    }
                }else{
                    this.setState({docs, rules, loading: false});
                }

            }.bind(this),
            error: function (xmlhttprequest, textstatus, message) {

                if(textstatus==="timeout" & attemptNum < RULE_UPDATE_PARAMS.totalAttempts) {
                    setTimeout(() => this.updateRules(updateId, attemptNum+1, true), 
                                RULE_UPDATE_PARAMS.timeAttemptms);
                }
                else{
                    alert("Error during rule update");
                    this.setState({loading: false});
                }
                
            }.bind(this)
        });
    }

    componentDidMount(){
        if(this.props.projectName){
            this.updateRules(uuid(), 0);
        }
    }

    componentDidUpdate(prevProps, prevState){
        if(prevProps.projectName != this.props.projectName){
            this.updateRules(uuid(), 0);
        }
    }

    removeRule = (ruleIndex) => {
        this.setState((prevState) => {
            console.log("Inside removeRule ", prevState.rules.filter(rule => rule.id != ruleIndex))
            return { rules: prevState.rules.filter(rule => rule.id != ruleIndex),
                     disableDeletingRules: true }
        })
    }

    deleteRule = (e, ruleIndex) => {
        console.log(`Deleting rule index ${ruleIndex}`);
        this.removeRule(ruleIndex);

        const data = new FormData();
        data.append('rule_id', ruleIndex);
        data.append('project_name', this.props.projectName);

        $.ajax({
            url : '/api/delete-rule',
            type : 'POST',
            data : data,
            processData: false,
            contentType: false,
            success : function(data) {
                console.log("success of delete rule")
                const json = renameKeysToCamelCase(JSON.parse(data));
                const rules = json['rules'];
                const docs = json['docs'];
                this.setState({docs, rules, loading: false, disableDeletingRules: false});
            }.bind(this),
            error: function (error) {
                alert("Error deleting the rule");
            }
        });
    }

    exploreRule = (e, ruleIndex) => {
        console.log(`Exploring rule ${ruleIndex}`);
        this.setState( { exploreRule: ruleIndex} );
    }

    exploreLabelled = (e, label) => {
        console.log(`Exploring labelled ${label}`);
        this.setState( {exploreLabelled: label} )
    }

    deleteProject = (e) => {
        console.log(`Delete project ${this.props.projectName}`);

        $.ajax({
            url : `/api/delete-project/${this.props.projectName}`,
            type : 'DELETE',
            success : function(data) {
                // const json = $.parseJSON(data);
                this.props.deleteProject(this.props.projectName);
                this.setState({toProjects: true});
            }.bind(this),
            error: function (error) {
                alert(error);
            }
        });
    }

    render(){
        if(this.state.exploreRule){
            return <Redirect to={{pathname: '/label',
                                    search: `rule=${this.state.exploreRule}`}}/>
        }else if(this.state.exploreLabelled !== undefined){
            return <Redirect to={{pathname: '/label',
                                    search: `label=${this.state.exploreLabelled}`}}/>
        }else if(this.state.toProjects){
            return <Redirect to={{pathname: "/projects"}}/>
        }

        const { classes } = this.props;

        return (
            <div className={classes.container}>
                <SideBar 
                    projectNameSlug={this.props.projectNameSlug}
                    projectName={this.props.projectName}
                    projectType={this.props.projectType}
                />
                <div className={classes.main_content}>
                    <ProjectTitle projectName={this.props.projectName}/>
                    <ProjectDataDrawers
                        classes={classes}
                        loading={this.state.loading}
                        projectName={this.props.projectName}
                        projectType={this.props.projectType}
                        classNames={this.props.classNames}
                        rules={this.state.rules}
                        docs={this.state.docs}
                        deleteRule={this.deleteRule}
                        exploreRule={this.exploreRule}
                        exploreLabelled={this.exploreLabelled}
                        disableDeletingRules={this.state.disableDeletingRules}
                    />
                    <FileDownloadButton 
                        projectName={this.props.projectName}
                        projectType={this.props.projectType}
                    />
                    <ExportRulesButton projectName={this.props.projectName}/>
                    <DeleteProjectButton 
                        deleteProject={this.deleteProject}
                        classes={classes}
                    />
                </div>
            </div>
        )
    }
}

export default withStyles(styles)(SupervisedProjectMain);