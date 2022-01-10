import React from 'react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Navigation from './Navigation';
import { withStyles } from '@material-ui/core/styles';



const styles = theme => ({
    paper: {
        width: 'auto',
        minHeight: '200px',
        padding: theme.spacing(1),
        margin: theme.spacing(5)
      },
    container: {
        width: '80%',
        minHeight: '200px',
        padding: theme.spacing(1),
        margin: theme.spacing(5)
      },
  });

// for message and inside main area
const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    className={classes}
                    spacing={2} 
                    direction="column"
                    alignContent='center'
                    justify='center'
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}


const PaperContainer = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    className={classes}
                    component={Paper}
                    alignContent='center'
                    justify='center'
                    {...rest}/>)
}


const MainArea = (props) => {

    const classes = props.classes;
    
    // get all the unique entity ids in the text
    console.log("We will map over currentDisplayedLabels", props.currentDisplayedLabels,
    props.classNames
    );
    const entities = props.currentDisplayedLabels.map((x, ind) => props.classNames[x.id]);
    const EntitySet = new Set(entities.map((x, ind) => x.id))

    // all the entities that are not in the text and will populate the search
    const otherEntities = props.classNames.filter(x => !EntitySet.has(x.id));

    return (
        <Container classes={classes.container}>
            <Item>
                <PaperContainer classes={classes.paper}>
                    <Grid item>
                        <Typography align='center'>
                            {props.content.text}
                        </Typography>
                    </Grid>
                </PaperContainer>
            </Item>
            <Item>
                <Navigation
                    projectType={props.projectType}
                    groundTruth={props.groundTruth}
                    subtractToIndex={props.subtractToIndex}
                    addToIndex={props.addToIndex}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    disableNext={props.disableNext}
                    disablePrev={props.disablePrev}
                    projectParams={props.projectParams}
                    sessionId={props.sessionId}
                    docId={props.docId}
                    projectName={props.projectName}
                    entities={entities}
                    otherEntities={otherEntities}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    selectEntity={props.selectEntity}
                    isCurrentlyDisplayedValidated={props.isCurrentlyDisplayedValidated}
                />
            </Item>
        </Container>
    )
}

export default withStyles(styles)(MainArea);