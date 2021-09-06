import React from 'react';
import { Link } from 'react-router-dom';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import { withStyles } from '@material-ui/core/styles';
import ListItemText from '@material-ui/core/ListItemText';

const drawerWidth = 120;

const styles = theme => ({
    drawer: {flexBasis: drawerWidth,
             flexShrink: 0},
    drawerPaper: {width: drawerWidth}
  });

const CurrentProjectSideBar = ({projectName, projectNameSlug}) => {
    return (
        <React.Fragment>
            <ListItem
                component={Link}
                to={`/projects/${projectNameSlug}`}
            >
                <ListItemText>
                    Current project: {projectName}
                </ListItemText>
            </ListItem>
            <ListItem
                component={Link}
                to="/search">
                <ListItemText>
                    Search
                </ListItemText>
            </ListItem>
            <ListItem
                component={Link}
                to="/rules">
                <ListItemText>
                    Add rules
                </ListItemText>
            </ListItem>
            <Divider/>
        </React.Fragment>
    )
}

const SideBar = ({projectName, projectNameSlug, classes}) => {

    return (
        <nav className={classes.drawer}>
        <Drawer
            variant="permanent"
            classes={{paper: classes.drawerPaper}}
        >
        <List>
            {projectName && 
                <CurrentProjectSideBar 
                    projectName={projectName} 
                    projectNameSlug={projectNameSlug}
                />
            }
            <ListItem
                component={Link}
                to="/projects">
                <ListItemText>
                    Projects
                </ListItemText>
            </ListItem>
            </List>
        </Drawer>
    </nav>
    )
}

export default withStyles(styles)(SideBar);