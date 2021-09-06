import React from 'react';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { withStyles } from '@material-ui/core/styles';


const styles = theme => ({
    icon_button: {
        borderRadius: 4,
        backgroundColor: theme.palette.primary.main,
        color: "white",
        height: 38
    }
  });


const Container = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    className={className}
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const TextNavigation = (props) => {
    const classes  = props.classes;

    return (
        <Container>
            <Item>
                <IconButton 
                    onClick={props.subtractToIndex}
                    disabled={props.disablePrev}
                    className={classes.icon_button}
                >
                    <ArrowBackIcon/>
                </IconButton>
            </Item>
            <Item>
                <IconButton 
                    onClick={props.addToIndex}
                    disabled={props.disableNext}
                    className={classes.icon_button}
                >
                    <ArrowForwardIcon/>
                </IconButton>
            </Item>
        </Container>
    )
}

export default withStyles(styles)(TextNavigation);