import React from 'react';
import SideBar from '../../SideBar';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import TouchAppIcon from '@material-ui/icons/TouchApp';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import $ from 'jquery';
import { compose } from 'recompose'
import FileDownloadButton from '../common/FileDownloadButton';
import { Redirect } from 'react-router-dom';
import DeleteProjectButton from '../common/DeleteProjectButton';
import { withRouter } from "react-router-dom";
import ProjectTitle from '../ProjectTitle';


const styles = theme => ({
    container: {display: 'flex'},
    main_content: {margin: '20px',
                    width: "100%"},
    table: {fontSize: "1.2em"},
    button: {marginTop: "20px",
            marginLeft: "10px"},
    project_title: {"marginBottom": 20}
  });


const StyledTableCell = (props) => {
    return (
        <TableCell {...props}>
            {props.content}
        </TableCell>
    )
}

const BoldText = (props) => {
    return (<Box fontWeight="fontWeightBold" m={1}>{props.text}</Box>)
}

const ExploreButton = (props) => (
    <Tooltip title="Label">
        <IconButton aria-label="explore-label" onClick={props.setGoToLabel} name="explore-label-button">
            <TouchAppIcon name="explore-label-icon"/>
        </IconButton>
    </Tooltip>
)

const KbTable = (props) => {
    return (
        <TableContainer component={Paper}>
            <Table aria-label="label table">
            <TableBody>
                <TableRow className={props.classes.table}>
                    <StyledTableCell align="center" content={<BoldText text={`Total knowledge bases`}/>}/>
                    <StyledTableCell align="center" content={<BoldText text={`Total mentions`}/>}/>
                    <StyledTableCell align="center" content={<BoldText text={`Total matched entities`}/>}/>
                    <StyledTableCell align="center" content={<BoldText text={`Total unmatched entities`}/>}/>
                </TableRow>
                <TableRow className={props.classes.table}>
                    <StyledTableCell align="center" content={props.total_bases}/>
                    <StyledTableCell align="center" content={props.total_mentions}/>
                    <StyledTableCell align="center" content={<div>{props.total_matched_entities}<ExploreButton setGoToLabel={props.setGoToMatchedEntities}/></div>}/>
                    <StyledTableCell align="center" content={<div>{props.total_entities - props.total_matched_entities}<ExploreButton setGoToLabel={props.setGoToUnmatchedEntities}/></div>}/>
                </TableRow>
            </TableBody>
            </Table>
        </TableContainer>
    )
}

class EntityDisambiguationProjectMain extends React.Component{

    state = {
        projectData: {},
        goToMatchedEntities: false,
        goToUnmatchedEntities: false,
        toProjects: false
    }

    setGoToMatchedEntities = () => {
        this.setState({goToMatchedEntities: true})
    }

    setGoToUnmatchedEntities = () => {
        this.setState({goToUnmatchedEntities: true})
    }

    componentDidUpdate(prevProps, prevState){
        if(this.state.goToMatchedEntities){
            this.props.history.push({pathname: '/label', search: 'matched'});
        }
        if(this.state.goToUnmatchedEntities){
            this.props.history.push({pathname: '/label', search: 'unmatched'});
        }
    }

    updateProject(){
        $.ajax({
            url : '/api/project-stats',
            type : 'GET',
            data: {project_name: this.props.projectName},
            success : function(data) {
                const projectData = JSON.parse(data);
                console.log("update-project", data);
                this.setState( {projectData});
            }.bind(this),
            error: function (error) {
                alert("Error updating project.");
            }
        });
    }

    componentDidMount(){
        this.updateProject();
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

    render() {
        const { classes } = this.props;

        if(this.state.toProjects){
            return <Redirect to={{pathname: "/projects"}}/>
        }

        return(
            <div className={classes.container}>
                <SideBar noRules={true}/>
                <div className={classes.main_content}>
                    <ProjectTitle 
                        projectName={this.props.projectName}
                        className={classes.project_title}
                    />
                    <KbTable 
                        classes={classes}
                        setGoToMatchedEntities={this.setGoToMatchedEntities}
                        setGoToUnmatchedEntities={this.setGoToUnmatchedEntities}
                        {...this.state.projectData}
                    />
                    <FileDownloadButton 
                        projectName={this.props.projectName}
                        projectType={this.props.projectType}
                    />
                    <DeleteProjectButton 
                        deleteProject={this.deleteProject}
                        classes={classes}
                    />
                </div>
            </div>
        )
    }
}

export default compose(
    withStyles(styles),
    withRouter,
  )(EntityDisambiguationProjectMain);