import React from 'react';
import LabelNavigationSimple from '../common/LabelNavigationSimple';
import KbSearch from './KbSearch';
import Grid from '@material-ui/core/Grid';
import _ from 'lodash'



const Container = (props) => {
    const { className, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    className={className}
                    alignItems="center"
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}


class LabelNavigation extends React.Component {

    state = {
        kbSuggestions: this.props.kbSuggestions
    }

    componentDidUpdate(prevProps, prevState) {
        if(!_.isEqual(prevProps.kbSuggestions, this.props.kbSuggestions)){
            this.setState( {kbSuggestions: this.props.kbSuggestions} );
        }
        if(prevProps.entityId != this.props.entityId){
            this.setState( {kbSuggestions: this.props.kbSuggestions} );
        }
    }

    addSuggestion = (kb) => {
        console.log("adding suggestion ", kb);
        this.setState((prevState) => {
            return { kbSuggestions: 
                prevState.kbSuggestions.concat({'label': kb.id,
                                                'name': kb.name})};
        })
    }

    render() {
        return (
            <Container>
                <Item>
                    <LabelNavigationSimple 
                        projectName={this.props.projectName}
                        docId={this.props.entityId}
                        sessionId={this.props.sessionId}
                        label={this.props.currentDisplayedLabel}
                        updateIndexAfterLabelling={this.props.updateIndexAfterLabelling}
                        classnames={this.state.kbSuggestions}
                    />
                </Item>
                <Item>
                    <KbSearch
                        projectName={this.props.projectName}
                        addSuggestion={this.addSuggestion}
                    />
                </Item>
            </Container>
        )
    }
}

export default LabelNavigation;