import React from 'react';
import AddIcon from '@material-ui/icons/Add';
import IconButton from '@material-ui/core/IconButton';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';


const styles = theme => ({
    button_root: {
        height: '100%',
        width: '100%'    
    },
    icon_root: {
        height: '50%',
        width: '50%'
    },
    card: {
        height: '150px',
        width: '150px',
    },
    container: {
        marginTop: '20px'
    },
    main_div: {
        margin: '20px'
    }
});

const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    className={classes.container}
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const ProjectCard = (props) => {
    const { classes } = props;
    return (
        <Card className={classes.card}>
            <CardContent>
                <Typography variant="h4">{props.title}</Typography>
            </CardContent>
        </Card>
    )
}

const AddCard = (props) => {
    const { classes } = props;
    return (
        <Card className={classes.card} style={{display: 'flex'}}>
            <CardContent>
                <IconButton 
                    aria-label="add" 
                    name="add-project-icon-button"
                    classes={{root: classes.button_root}}
                    component={Link} 
                    to="/"
                >
                    <AddIcon 
                        name="add-project-icon"
                        classes={{root: classes.icon_root}}
                    />
                </IconButton>
            </CardContent>
        </Card>
    )
}

const ProjectCards = (props) => {
    const { classes } = props;
    return (
        <Container classes={classes}>
            {props.projects.map((project, index) => {
                // console.log("card", project);
                return (
                    <Item key={index}>
                        <Link 
                            to={`/projects/${project.projectNameSlug}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <ProjectCard 
                                classes={classes}
                                title={project.projectName}
                            />
                        </Link>
                    </Item>)
                })}
            <Item>
                <AddCard classes={classes}/>
            </Item>
        </Container>
    )
}


class Projects extends React.Component {

    constructor(props){
        super(props);
        this.props.resetCurrentProject();
    }

    render(){
        const classes = this.props.classes;
        return (
            <div className={classes.main_div}>
                <Typography variant="h1">My projects</Typography>
                <ProjectCards classes={classes} {...this.props}/>
            </div>
        )
    }
}

export default withStyles(styles)(Projects);