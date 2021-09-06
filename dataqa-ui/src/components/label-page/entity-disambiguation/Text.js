import React from 'react';
import Highlightable from '../../highlightable/Highlightable';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextNavigation from '../common/TextNavigation';
import Box from '@material-ui/core/Box';
import _ from 'lodash'


const styles = theme => ({
    paper: {
        minHeight: '200px',
        padding: theme.spacing(1),
        margin: theme.spacing(5)
      },
    icon_button: {
        borderRadius: 4,
        color: theme.palette.primary.main,
        backgroundColor: "white",
        height: 38
    }
  });

class Text extends React.Component{
    state = {
        currentTextSpans: this.props.currentTextSpans
    };

    compareSpan = (span1, span2) => {
        return (span1.start == span2.start) && (span1.end == span2.end);
    }

    compareSpans = (x, y) => {
        if(x.length !== y.length){
        return false;
        }
        
        const difference = _.differenceWith(x, y, this.compareSpan);
        console.log("Comparing spans", x, y, difference);
        return difference === undefined || difference.length==0;
    };

    componentDidUpdate(prevProps){
        if(!this.compareSpans(prevProps.currentTextSpans, this.props.currentTextSpans)) {
            console.log("props at TextNER have changed");
            this.setState({currentTextSpans: this.props.currentTextSpans});
        }
    }

    render() {
        return (
            <div style={{ width: '100%' }}>
                <Box 
                    display="flex" 
                    component={Paper} 
                    className={this.props.classes.paper}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Box margin="auto">
                        <Typography align='center' component={'span'}>
                            <Highlightable 
                                ranges={this.state.currentTextSpans || []}
                                id={"myuniqueid"}
                                text={this.props.content.text}
                                enabled={false}
                            />
                        </Typography>
                    </Box>
                    <Box>
                        <TextNavigation 
                            classes={{icon_button: this.props.classes.icon_button}}
                            disableNext={this.props.disableNextDoc}
                            disablePrev={this.props.disablePrevDoc}
                            addToIndex={this.props.addToDocIndex}
                            subtractToIndex={this.props.subtractToDocIndex}
                        />
                    </Box>
                </Box>
            </div>
        )
    }
}

export default withStyles(styles)(Text);