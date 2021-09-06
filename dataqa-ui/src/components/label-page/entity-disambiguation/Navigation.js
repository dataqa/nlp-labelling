import React from 'react';
import TextNavigation from '../common/TextNavigation';
import Grid from '@material-ui/core/Grid';
import LabelNavigation from './LabelNavigation';


const Container = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="column"
                    className={className}
                    alignItems="center"
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const Navigation = (props) => {

    return (
        <Container>
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
                    entityId={props.entityId}
                    sessionId={props.sessionId}
                    currentDisplayedLabel={props.currentDisplayedLabel}
                    updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                    kbSuggestions={props.kbSuggestions}
                />
            </Item>
        </Container>
    )
}

export default Navigation;