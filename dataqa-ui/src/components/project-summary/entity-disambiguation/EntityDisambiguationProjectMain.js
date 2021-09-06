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
import { Redirect } from 'react-router-dom';
import { withRouter } from "react-router-dom";
import { compose } from 'recompose'


const styles = theme => ({
    container: {display: 'flex'},
    main_content: {margin: '20px',
                    width: "100%"},
    table: {fontSize: "1.2em"}
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
        goToUnmatchedEntities: false
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

    render() {
        const { classes } = this.props;

        return(
            <div className={classes.container}>
                <SideBar/>
                <div className={classes.main_content}>
                    <Typography variant="h1">{this.props.projectName}</Typography>
                    <KbTable 
                        classes={classes}
                        setGoToMatchedEntities={this.setGoToMatchedEntities}
                        setGoToUnmatchedEntities={this.setGoToUnmatchedEntities}
                        {...this.state.projectData}
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