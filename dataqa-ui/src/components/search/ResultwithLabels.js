import React from 'react';
import Result from "./Result";
import * as colors from '@material-ui/core/colors';
import $ from 'jquery';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ClassDefinitionBox from '../rules/rule-forms/base/ClassDefinitionBox';
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles(theme => ({
    label_component: {
        padding: 24
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
                style={{backgroundColor: colors[props.colour][500]}}
            >
                {props.entityName}
            </Button>
        )
    }
}

const LabelComponent = (props) => {
    const classes = useStyles();

    return <Container className={classes.label_component}>
                {props.entities.map((item, ind) => {
                        return (
                            <Item key={`entity-${ind}`}>
                                <EntityButton 
                                    entityName={item.name}
                                    colour={item.colour}
                                    selected={props.currentSelectedEntity && props.currentSelectedEntity.id == item.id}
                                    selectEntity={() => props.selectEntity(item)}
                                />
                            </Item>
                        )
                    })}
                <Item>
                    <ClassDefinitionBox 
                        classNames={props.classNames}
                        setClass={props.setClass}
                        inputValue={props.inputValue}
                        onInputChange={props.onInputChange}
                        value={props.selectedValue}
                        id={props.docId}
                    />
                </Item>
            </Container>
}


const getManualLabel = (classNames, result) => {
    if(result["manual_label"]){
        try{
            const manualLabelId = result["manual_label"]["raw"]["label"];
            console.log("Result has manual label", manualLabelId);
            console.log(classNames[manualLabelId]);

            // all the entities that are not in the text and will populate the search
            const otherEntities = classNames.filter(x => x.id != manualLabelId);
            console.log("Other entities:", otherEntities);

            return {entities: [classNames[manualLabelId]], otherEntities};
        }
        catch(error){
            console.log("Error getting manual label field from document in ES.")
        }
    }else{
        return {entities: [], otherEntities: classNames};
    }
}

class ResultWithLabels extends React.Component {

    constructor(props) {
        super(props);

        const entities = getManualLabel(this.props.classNames, this.props.result);

        this.state = {
            entities: entities.entities,
            otherEntities: entities.otherEntities,
            manualLabel: undefined,
            inputValue: '',
            selectedValue: null,
            currentSelectedEntity: entities.entities && entities.entities[0]
        }
    }

    updateLabel = (label_id, doc_id) => {
        const data = new FormData();
        data.append('project_name', this.props.projectName);
        data.append('manual_label', JSON.stringify({"label": label_id}));
        data.append('doc_id', doc_id);
        data.append('session_id', this.props.sessionId);
        console.log("Sending label ", label_id);

        $.ajax({
            url : '/api/label-doc',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                console.log(`Label modified for doc id ${doc_id}`);
            }.bind(this),
            error: function (error) {
                alert(`Error updating manual label for doc id ${doc_id}`);
            }
        });
    }

    setClass = (event, input, reason, docId) => {
        if(reason == "select-option"){

            this.updateLabel(input.id, docId);

            this.setState((prevState) => {
                console.log("Setting otherEntities", prevState.otherEntities, input);
                return { entities: prevState.entities.concat(input),
                         currentSelectedEntity: input,
                         otherEntities: prevState.otherEntities.filter(x => x.id != input.id),
                         inputValue: '',
                         selectedValue: null}
            });
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

    render = () => {
        const result = this.props.result;
        console.log("render is ", result, result.manual_label, this.state);
        delete result.manual_label;

        return(
            <React.Fragment>
                <Result 
                    result={result}
                    onClickLink={() => {}}
                    labelComponent={this.props.disableLabelling && 
                                        <LabelComponent 
                                            entities={this.state.entities}
                                            classNames={this.state.otherEntities}
                                            currentSelectedEntity={this.state.currentSelectedEntity}
                                            selectEntity={(item) => {console.log(item)}}
                                            setClass={(event, input, reason) => this.setClass(event, input, reason, result.id.raw)}
                                            inputValue={this.state.inputValue}
                                            onInputChange={this.onClassInputChange}
                                            selectedValue={this.state.selectedValue}
                                            docId={result.id.raw}
                                        />
                                    }
                />
                
            </React.Fragment>
            )
        }
}

export default ResultWithLabels;