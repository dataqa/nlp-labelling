import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import SideBar from '../SideBar';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import { Link } from 'react-router-dom';


const styles = theme => ({
    container: {marginTop: '20px', display: 'flex'},
    card: {
        height: '150px',
        width: '250px',
        textAlign: 'center',
        alignItems: 'center',
        display: 'flex'
    },
    main_content: {marginLeft: "20px"}
});

const projectTypes = [
    {'type': 'classification', 
    'explanation': 'I want to do text classification (e.g. sentiment analysis)',
    'needParams': true},
    {'type': 'ner',
    'explanation': 'I want to find mentions of an entity (e.g. drug names)',
    'needParams': true},
    {'type': 'entity_disambiguation',
    'explanation': 'I want to disambiguate entities.',
    'needParams': false}
];

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

const ProjectTypeCard = (props) => {
    const { classes } = props;
    return (
        <Card className={classes.card}>
            <CardContent className={classes.card}>
                <Typography 
                    className={classes.card} 
                    variant="body1"
                >
                    {props.explanation
                }</Typography>
            </CardContent>
        </Card>
    )
}

const ProjectTypeCards = (props) => {
    const { classes } = props;
    return (
        <Container classes={classes}>
            {props.projects.map((project, index) => {
                return (
                    <Item key={index}>
                        <Link 
                            to={`/upload`}
                            style={{ textDecoration: 'none' }}
                            onClick={() => {props.setProjectType(project.type, !project.needParams)}}
                        >
                            <ProjectTypeCard 
                                classes={classes}
                                explanation={project.explanation}
                            />
                        </Link>
                    </Item>)
                })}
        </Container>
    )
}

class WelcomePage extends React.Component{
    constructor(props){
        super(props);
        this.props.resetCurrentProject();
    }

    render(){
        const { classes } = this.props;
        return (
            <div className={classes.container}>
                <SideBar/>
                <div className={classes.main_content}>
                    <Box my={2}>
                        <Typography variant="h3" styles={{margin: "100px"}}>Welcome to Data QA</Typography>
                    </Box>
                    <ProjectTypeCards 
                        classes={classes} 
                        projects={projectTypes}
                        setProjectType={this.props.setProjectType}
                    />
                </div>
            </div>
        )
    }
}

export default withStyles(styles)(WelcomePage);