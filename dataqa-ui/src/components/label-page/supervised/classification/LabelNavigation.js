import React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import $ from 'jquery';
import ClassDefinitionBox from '../../../rules/rule-forms/base/ClassDefinitionBox';
import * as colors from '@material-ui/core/colors';
import IconButton from '@material-ui/core/IconButton';
import DoneOutlinedIcon from '@material-ui/icons/DoneOutlined';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash';


const useStyles = makeStyles(theme => ({
    icon_button: {
        borderRadius: 4,
        backgroundColor: theme.palette.secondary.main,
        color: "white",
        height: 38
    },
    icon_button_selected: {
        borderRadius: 4,
        borderColor: theme.palette.secondary.main,
        color: theme.palette.secondary.main,
        height: 38,
        border: '1px solid'
    }
  }))


const Container = (props) => {
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    justify="flex-start"
                    {...props}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const EntityButton = (props) => {
    if(props.selected){
        return (
            <Button 
                onClick={props.selectEntity}
                style={{color: colors[props.colour][500], borderColor: colors[props.colour][500]}}
                variant="outlined"
            >
                {props.entityName}
            </Button>
        )
    }else{
        return (
            <Button 
                onClick={props.selectEntity}
                style={{backgroundColor: colors[props.colour][500], color: 'white'}}
            >
                {props.entityName}
            </Button>
        )
    }
}

const SendButton = (props) => {
    const classes = useStyles();
    return (
        <IconButton 
            onClick={props.onClick}
            className={props.selected? classes.icon_button_selected: classes.icon_button}
        >
            <DoneOutlinedIcon name="explore-label-icon"/>
        </IconButton>
    )
}

class LabelNavigation extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            entities: props.entities,
            inputValue: '',
            otherEntities: props.otherEntities,
            selectedValue: null,
            currentSelectedEntityId: props.currentSelectedEntityId
        }
    }

    componentDidUpdate(prevProps, prevState){
        if(prevProps.docId != this.props.docId){
            this.setState( {entities: this.props.entities} );
        };

        const sortedPrevEntities = prevProps.entities.sort((a,b)=> (a.id > b.id ? 1 : -1));
        const sortedNewEntities = this.props.entities.sort((a,b)=> (a.id > b.id ? 1 : -1));

        if((!_.isEqual(sortedPrevEntities, sortedNewEntities)) || (prevProps.docId != this.props.docId)){
            this.setState( {entities: this.props.entities,
                            otherEntities: this.props.otherEntities});
        };

        if(prevProps.currentSelectedEntityId != this.props.currentSelectedEntityId){
            this.setState( {currentSelectedEntityId: this.props.currentSelectedEntityId} );
        };
    };

    updateLabel = () => {
        console.log("Updating label for ", this.props.docId, this.state.currentSelectedEntityId);

        if(!this.state.currentSelectedEntityId && this.state.currentSelectedEntityId!=0){
            alert("Need to select a class");
        }else{
            const data = new FormData();
            data.append('project_name', this.props.projectName);
            data.append('manual_label', JSON.stringify({"label": this.state.currentSelectedEntityId}));
            data.append('doc_id', this.props.docId);
            data.append('session_id', this.props.sessionId);

            $.ajax({
                url : '/api/label-doc',
                type : 'POST',
                data : data,
                processData: false,  // tell jQuery not to process the data
                contentType: false,  // tell jQuery not to set contentType,
                success : function(data) {
                    console.log(`Label modified for doc id ${this.props.docId}`);
                    this.props.updateIndexAfterLabelling({label: this.state.currentSelectedEntityId});
                }.bind(this),
                error: function (error) {
                    alert(`Error updating manual label for doc id ${this.props.docId}`);
                }.bind(this)
            });
        }
    }

    setClass = (event, input, reason) => {
        if(reason == "select-option"){
            this.setState((prevState) => {
                console.log("Setting otherEntities", prevState.otherEntities, input);
                return { entities: prevState.entities.concat(input),
                         currentSelectedEntityId: input.id,
                         otherEntities: prevState.otherEntities.filter(x => x.id != input.id),
                         inputValue: '',
                         selectedValue: null}
            });
            this.props.selectEntity(input);
        }
        if(reason == 'clear'){
            this.setState( {inputValue: ''} );
        }
    }

    onClassInputChange = (event, inputValue, reason) => {
        if(reason == 'input'){
            this.setState( {inputValue: inputValue} );
        }
    }

    selectEntity = (entity) => {
        this.setState((prevState) => {
            return {currentSelectedEntityId: entity.id==prevState.currentSelectedEntityId? undefined: entity.id}
        });

        this.props.selectEntity(entity);
    }

    render() {

        return (
            <Container>
                {this.state.entities.map((item, ind) => {
                        return (
                            <Item key={`entity-${ind}`}>
                                <EntityButton 
                                    entityName={item.name}
                                    colour={item.colour}
                                    selected={(this.state.currentSelectedEntityId || this.state.currentSelectedEntityId==0) && this.state.currentSelectedEntityId == item.id}
                                    selectEntity={() => this.selectEntity(item)}
                                />
                            </Item>
                        )
                    })}
                <Item>
                    <ClassDefinitionBox 
                        classNames={this.state.otherEntities}
                        setClass={this.setClass}
                        inputValue={this.state.inputValue}
                        onInputChange={this.onClassInputChange}
                        value={this.state.selectedValue}
                    />
                </Item>

                <Item>
                    <SendButton 
                        selected={this.props.hasDocBeenLabelledInThisSession}
                        onClick={this.updateLabel}
                    />
                </Item>
            </Container>
        )
    }
}

export default LabelNavigation;
