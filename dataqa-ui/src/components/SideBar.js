import React from 'react';
import { Link } from 'react-router-dom';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import { withStyles } from '@material-ui/core/styles';
import ListItemText from '@material-ui/core/ListItemText';

const drawerWidth = 150;

const styles = theme => ({
    drawer: {
        width: drawerWidth,
        flexShrink: 0
      },
    drawerPaper: {width: drawerWidth},
  });

const CurrentProjectSideBar = ({projectName, projectNameSlug, noRules}) => {
    return (
        <React.Fragment>
            <ListItem
                button
                color="primary"
                component={Link}
                to={`/projects/${projectNameSlug}`}
            >
                <ListItemText>
                    Summary table
                </ListItemText>
            </ListItem>
            <ListItem
                button
                component={Link}
                to="/search">
                <ListItemText>
                    Search
                </ListItemText>
            </ListItem>
            {noRules &&
                <ListItem
                    button
                    component={Link}
                    to="/rules">
                    <ListItemText>
                        Add rules
                    </ListItemText>
                </ListItem>
            }
            <Divider/>
        </React.Fragment>
    )
}

const SideBarContent = (props) => {
    return (
        <List>
            {props.projectName && 
                <CurrentProjectSideBar 
                    projectName={props.projectName} 
                    projectNameSlug={props.projectNameSlug}
                    noRules={props.noRules}
                />
            }
            <ListItem
                button
                component={Link}
                to="/projects">
                <ListItemText>
                    Projects
                </ListItemText>
            </ListItem>
        </List>
    )
}

class SideBar extends React.Component{
    constructor(props) {
        super(props);
        this.state = {}
    }

    render(){
        const { classes } = this.props;

        return (
            <nav className={classes.drawer}>
                <Drawer
                    variant="permanent"
                    classes={{paper: classes.drawerPaper}}
                >
                    <SideBarContent
                        projectName={this.props.projectName}
                        projectNameSlug={this.props.projectNameSlug}
                        noRules={this.props.noRules}
                    />
                </Drawer>
            </nav>
        )
    }
}

export default withStyles(styles)(SideBar);
export { drawerWidth };