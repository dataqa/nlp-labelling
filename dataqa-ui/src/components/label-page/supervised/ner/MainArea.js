import React from 'react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import HighlightableText from './HighlightableText';
import HighlightableTable from './HighlightableTable';
import Typography from '@material-ui/core/Typography';
import Navigation from './Navigation';
import { withStyles } from '@material-ui/core/styles';
import _ from 'lodash'


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
      container: {
        width: '100%',
      },
  });


// for message and inside main area
const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    className={classes.container}
                    spacing={2} 
                    direction="column"
                    alignContent='center'
                    justify='center'
                    {...rest}/>)
}

const Item = (props) => {
    const { classes, ...rest } = props;
    return(<Grid item className={classes.container} {...rest}/>)
}

const PaperContainer = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    className={classes.paper}
                    component={Paper}
                    alignContent='center'
                    justify='center'
                    {...rest}/>)
}


const MainArea = (props) => {
    
    // get all the unique entity ids in the text
    console.log("Inside MainArea,", props);
    let entities = props.currentDisplayedLabels.map((x, ind) => x && props.classNames[x.entityId]);
    console.log("Inside MainArea,", entities);
    entities =  _.uniqBy(entities, 'id');
    console.log("Inside MainArea,", entities);
    const EntitySet = new Set(entities.map((x, ind) => x.id))

    // all the entities that are not in the text and will populate the search
    const otherEntities = props.classNames.filter(x => !EntitySet.has(x.id));
    
    const entityColourMap = props.classNames.reduce(function(obj, itm) {
        obj[itm['id']] = itm['colour'];

        return obj;
    }, {});
    
    return (
        <Container classes={props.classes}>
            <Item classes={props.classes}>
                {props.content.isTable? 
                    <HighlightableTable
                        content={props.content}
                        currentSelectedEntityId={props.currentSelectedEntityId}
                        currentTextSpans={props.currentDisplayedLabels}
                        addTextSpan={props.addTextSpan}
                        deleteTextSpan={props.deleteTextSpan}
                        entityColourMap={entityColourMap}
                    />
                :
                    <PaperContainer classes={props.classes}>
                        <Typography align='center' component={'span'}>
                            <HighlightableText 
                                content={props.content.text}
                                currentSelectedEntityId={props.currentSelectedEntityId}
                                currentTextSpans={props.currentDisplayedLabels}
                                addTextSpan={props.addTextSpan}
                                deleteTextSpan={props.deleteTextSpan}
                                entityColourMap={entityColourMap}
                            />
                        </Typography>
                    </PaperContainer>
                }
            </Item>
            <Item classes={props.classes}>
                <Navigation
                    projectType={props.projectType}
                    subtractToIndex={props.subtractToIndex}
                    addToIndex={props.addToIndex}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    disableNext={props.disableNext}
                    disablePrev={props.disablePrev}
                    sessionId={props.sessionId}
                    docId={props.docId}
                    projectName={props.projectName}
                    currentDisplayedLabels={props.currentDisplayedLabels}
                    entities={entities}
                    otherEntities={otherEntities}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    selectEntity={props.selectEntity}
                />
            </Item>
        </Container>
    )
}

export default withStyles(styles)(MainArea);