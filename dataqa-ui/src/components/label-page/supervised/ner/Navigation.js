import React from 'react';
import TextNavigation from '../../common/TextNavigation';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import LabelNavigation from './LabelNavigation';


const styles = theme => ({
    root: {
        maxWidth: 'sm'
    },
    container: {paddingLeft: theme.spacing(5)}
});


const Container = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="column"
                    alignContent='center'
                    justify='center'
                    alignItems='center'
                    className={className}
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const Navigation = (props) => {

    const { classes } = props;

    return (
        <Container className={classes.container}>
            <Item>
                <TextNavigation 
                    subtractToIndex={props.subtractToIndex}
                    addToIndex={props.addToIndex}
                    disablePrev={props.disablePrev}
                    disableNext={props.disableNext}
                />
            </Item>
            <Item>
                <LabelNavigation 
                    projectName={props.projectName}
                    docId={props.docId}
                    sessionId={props.sessionId}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    entities={props.entities}
                    otherEntities={props.otherEntities}
                    currentTextSpans={props.currentDisplayedLabels}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    selectEntity={props.selectEntity}
                    isCurrentlyDisplayedValidated={props.isCurrentlyDisplayedValidated}
                />
            </Item>
        </Container>
    )
}

export default withStyles(styles)(Navigation);