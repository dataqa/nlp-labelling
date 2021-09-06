import React from 'react';
import LabelNavigation from './LabelNavigation';
import TextNavigation from '../../common/TextNavigation';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';


const styles = theme => ({
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
            <Item xs={12}>
                {props.groundTruth && 
                    <Typography>
                        Ground-truth: {props.groundTruth}
                    </Typography>}
                
            </Item>
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
                    currentDisplayedLabels={props.currentDisplayedLabels}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    entities={props.entities}
                    otherEntities={props.otherEntities}
                    currentSelectedEntityId={props.currentSelectedEntityId}
                    selectEntity={props.selectEntity}
                />
            </Item>
        </Container>
    )
}

export default withStyles(styles)(Navigation);