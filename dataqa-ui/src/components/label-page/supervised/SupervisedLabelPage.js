import React from 'react';
import $ from 'jquery';
import SideBar from '../../SideBar';
import uuid from 'react-uuid';
import queryString from 'query-string';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PROJECT_TYPES } from '../../constants';
import ClassificationLabelPage from './classification/MainArea';
import NERLabelPage from './ner/MainArea';
import { renameKeysToCamelCase } from '../../utils';


const PAGESIZE = 10;

const styles = theme => ({
    main_container: {display: 'flex'},
    paper: {
        width: '80%',
        minHeight: '200px',
        padding: theme.spacing(1),
        margin: theme.spacing(5)
      }
  });


// for message and inside main area
const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    className={classes.paper}
                    spacing={2} 
                    direction="row"
                    alignContent='center'
                    justify='center'
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}


const Message = (props) => {
    return (
        <Container classes={props.classes}>
            <Item>
                <Typography align='center'>
                    {props.content}
                </Typography>
            </Item>
        </Container>
    )
}

const MainArea = (props) => {
    const { classes } = props;
    
    if(props.errorFetching){
        return <Message 
                    classes={classes}
                    content='Error loading documents.'
                />
    }

    if(!((props.projectType == PROJECT_TYPES.classification) || 
        (props.projectType == PROJECT_TYPES.ner))) {
        return <Message 
                    classes={classes}
                    content={`Incorrect project type ${props.projectType}.`}
                />
    }

    if(props.firstLoading){
        return <Message 
                    classes={classes}
                    content='Loading documents...'
                />
    }
    
    if(!props.hasDocs){
        return <Message 
                    classes={classes}
                    content='No more documents to label.'
                />
    }
    
    const params={  content: props.docs[props.index],
                    projectType: props.projectType,
                    addTextSpan: props.addTextSpan,
                    deleteTextSpan: props.deleteTextSpan,
                    currentDisplayedLabels: props.currentDisplayedLabels,
                    groundTruth: props.groundTruth,
                    subtractToIndex: props.subtractToIndex,
                    addToIndex: props.addToIndex,
                    updateIndexAfterLabelling: props.updateIndexAfterLabelling,
                    disableNext: props.disableNext,
                    disablePrev: props.disablePrev,
                    sessionId: props.sessionId,
                    docId: props.docId,
                    projectName: props.projectName,
                    classNames: props.classNames,
                    currentSelectedEntityId: props.currentSelectedEntityId,
                    selectEntity: props.selectEntity}
    

    if(props.projectType == PROJECT_TYPES.classification){
        return (
            <ClassificationLabelPage {...params}/>
        )
    }else if (props.projectType == PROJECT_TYPES.ner){
        return (
            <NERLabelPage {...params}/>
        )
    };
};


class SupervisedLabelPage extends React.Component{

    constructor(props) {
        super(props);
        console.log("Inside constructor ", props);

        this.pageSize = PAGESIZE;
        
        this.state = {  index: 0,
                        fromDoc: 0,
                        disableNext: false,
                        disablePrev: true,
                        validatedLabels: undefined, // labels received from the server (plus validated in current session)
                        currentDisplayedLabels: [], // for classification - initial server results loaded for current label page (the one shown to user is not kept here). for NER - the current selection of spans (not necessarily confirmed) shown to user.
                        currentSelectedEntityId: undefined, //for NER, the currently selected entity
                        groundTruth: [],
                        numDocs: 0,
                        docs: [],
                        docIds: [],
                        firstLoading: true, 
                        errorFetching: false,
                        sessionId: uuid()};
     }

    updateProjectState = (fromDoc, stateUpdateCallBack) => {
        console.log("fromDoc: ", fromDoc);
        console.log("updateProjectState state", this.state);
        const values = queryString.parse(this.props.location.search);
        $.ajax({
            url : '/api/get-docs',
            type : 'GET',
            data : {"from": fromDoc, 
                    "size": this.pageSize, 
                    "project_name": this.props.projectName,
                    "rule_id": values.rule,
                    "session_id": this.state.sessionId,
                    "label": values.label,
                    "all": values.all},
            success : function(data) {
                const json = renameKeysToCamelCase(JSON.parse(data));
                const docs = json['docs'];
                const groundTruth = json['labels'] === null? []: json['labels'] ;
                const docIds = json['docIds'];
                const numDocs = json['total'];
                const validatedLabels = docs.map((obj) => obj["label"]);
                const disableNext = numDocs == 1? true: null;

                this.setState((prevState) => {
                    let newState = {docs, 
                        validatedLabels,
                        numDocs, 
                        docIds,
                        groundTruth,
                        disableNext,
                        firstLoading: false};

                    if(stateUpdateCallBack){
                        const additionalState = stateUpdateCallBack(prevState, newState);
                        for(var attrname in additionalState){
                            newState[attrname] = additionalState[attrname]
                        }
                    }
                    return newState;
                }
                    
                );
            }.bind(this),
            error: function (error) {
                console.log("Error in call to server")
                this.setState({errorFetching: true});
            }.bind(this)
        });
    }

    addTextSpan = (span) => {
        this.setState((prevState) => {
            let currentDisplayedLabels = prevState.currentDisplayedLabels;
            if(currentDisplayedLabels){
                currentDisplayedLabels = currentDisplayedLabels.concat(span);
            }
            else{
                currentDisplayedLabels = [span]
            }
          return { currentDisplayedLabels }
        })
    }

    deleteTextSpan = (spanToDelete) => {
        this.setState((prevState) => {
            const currentDisplayedLabels = prevState.currentDisplayedLabels.filter(span => (span.id != spanToDelete.id));
            return { currentDisplayedLabels,
                     currentSelectedEntityId: undefined };
        })
    }

    getcurrentDisplayedLabels = (validatedLabels, docs, index) => {
        if(docs.length == 0){
            return [];
        }

        let currentDisplayedLabels;
        if (typeof validatedLabels[index] !== 'undefined'){
            if(this.props.projectType  == PROJECT_TYPES.classification){
                currentDisplayedLabels = [this.props.classNames[validatedLabels[index]]];
            }
            else{
                currentDisplayedLabels = validatedLabels[index];
            }
        }else{
            const rules = docs[index].rules;
            if(rules.length > 0){
                if(this.props.projectType  == PROJECT_TYPES.classification){
                    currentDisplayedLabels = rules.map((x, ind) => this.props.classNames[x]);
                }
                else{
                    currentDisplayedLabels = rules;
                }
            }else{
                currentDisplayedLabels = [];
            }
        }
        return currentDisplayedLabels;
    }

    getCurrentSelectEntityId = (validatedLabel) => {
        let currentSelectEntityId;
        if(this.props.projectType  == PROJECT_TYPES.classification){
            currentSelectEntityId = validatedLabel;
        }
        else{
            currentSelectEntityId = undefined;
        }
        return currentSelectEntityId;
    }

    projectNameWasSet = () => {
        console.log("Inside projectNameWasSet");
        const callBack = (prevState, newState) => {
            const currentDisplayedLabels = this.getcurrentDisplayedLabels(newState.validatedLabels, newState.docs, 0);

            const currentSelectedEntityId = this.getCurrentSelectEntityId(newState.validatedLabels[0]);

            console.log("Setting currentDisplayedLabels to ", currentDisplayedLabels,
            "and currentSelectedEntityId to ", currentSelectedEntityId);
            return ({   index: 0, 
                        fromDoc: 0,
                        currentDisplayedLabels,
                        currentSelectedEntityId});
        }

        this.updateProjectState(0, callBack);
    }

    componentDidMount = () => {
        console.log("Inside componentDidMount of App ", this.props);

        if(!this.props.projectName){
            console.log("Project name is not set")
        }
        else{
            this.projectNameWasSet();
        }
    }

    componentDidUpdate(prevProps, prevState){
        if(this.props.projectName != prevProps.projectName){
            this.projectNameWasSet();
        }

        if(typeof(prevState.validatedLabels) == "undefined" && typeof(this.state.validatedLabels) != "undefined"){
            const currentDisplayedLabels = this.getcurrentDisplayedLabels(this.state.validatedLabels, this.state.docs, this.state.index);
            console.log("Setting currentDisplayedLabels to ", currentDisplayedLabels);
            this.setState( {currentDisplayedLabels} );
        }
    }

    addToIndex = () => {

        const updateIndexAfterAdding = (prevState, newState) => {
            const newIndex = prevState.index == (this.pageSize - 1)? 0: prevState.index + 1;
            const currentDisplayedLabels = this.getcurrentDisplayedLabels(newState.validatedLabels, 
                newState.docs, 
                newIndex);
            const currentSelectedEntityId = this.getCurrentSelectEntityId(newState.validatedLabels[newIndex]);

            return { 
                index: newIndex,
                fromDoc: prevState.fromDoc + 1,
                disableNext: prevState.fromDoc + 1 >= this.state.numDocs - 1,
                disablePrev: false,
                currentDisplayedLabels,
                currentSelectedEntityId
            };
        };

        // if the index is 9, we need to get the new page
        if(this.state.index == (this.pageSize - 1)){
            this.updateProjectState(this.state.fromDoc + 1, updateIndexAfterAdding);
        }else{
            this.setState((prevState) => updateIndexAfterAdding(prevState, this.state));
        }

        
    }

    subtractToIndex = () => {
        const updateIndexAfterSubtracting = (prevState, newState) => {
            const newIndex = prevState.index == 0? (this.pageSize - 1): prevState.index - 1;
            const currentDisplayedLabels = this.getcurrentDisplayedLabels(newState.validatedLabels, 
                newState.docs, 
                newIndex);
            const currentSelectedEntityId = this.getCurrentSelectEntityId(newState.validatedLabels[newIndex]);

            return {
                index: newIndex,
                fromDoc: prevState.fromDoc - 1,
                disableNext: false,
                disablePrev: prevState.fromDoc === 1,
                currentDisplayedLabels, 
                currentSelectedEntityId
            };
        };

        if(this.state.index == 0){
            this.updateProjectState(this.state.fromDoc - this.pageSize,
                updateIndexAfterSubtracting);
        }
        else{
            this.setState((prevState) => updateIndexAfterSubtracting(prevState, this.state));
        }
    }

    updateIndexAfterLabelling = ({label, spans, goToNext = true}) => {
        if(typeof(label)!="undefined"){
            this.setState((prevState) => {
                let validatedLabels = prevState.validatedLabels;
                validatedLabels[prevState.index] = label;
                return ({ validatedLabels });
            });
        }

        if(typeof(spans)!="undefined"){
            this.setState((prevState) => {
                console.log("Inside setSpans", spans, prevState)
                let validatedLabels = prevState.validatedLabels;
                validatedLabels[prevState.index] = spans;
                const currentDisplayedLabels = spans;
                console.log("Setting currentDisplayedLabels to", currentDisplayedLabels, " and validatedLabels to ", validatedLabels)
                return { validatedLabels, currentDisplayedLabels}
            })
        }

        if(!this.state.disableNext && goToNext){
            this.addToIndex();
        };
    }

    selectEntity = (entity) => {
        this.setState((prevState) => {
            console.log("Inside SUpervisedLabelPage selectEntity", prevState.currentSelectedEntityId, entity);
            return {currentSelectedEntityId: (entity.id==prevState.currentSelectedEntityId)? undefined: entity.id}
        });
    }

    render(){
        const { classes } = this.props;

        console.log("Inside render of SupervisedLabelPage, state: ", this.state, "props: ", this.props);

        const groundTruth = (this.state.groundTruth.length > 0) && (this.props.classNames.length > 0) && this.props.classNames[this.state.groundTruth[this.state.index]].name;

        const docId = this.state.docIds.length 
                    && typeof(this.state.index) != "undefined" 
                    && this.state.docIds[this.state.index];

        return (
            <div className={classes.main_container}>
                <SideBar
                    projectNameSlug={this.props.projectNameSlug}
                    projectName={this.props.projectName}
                />
                <MainArea
                    {...this.state}
                    classes={classes}
                    groundTruth={groundTruth}
                    hasDocs={this.state.docs.length > 0}
                    projectName={this.props.projectName}
                    docId={docId}
                    projectType={this.props.projectType}
                    addToIndex={this.addToIndex} 
                    subtractToIndex={this.subtractToIndex}
                    updateIndexAfterLabelling={this.updateIndexAfterLabelling}
                    addTextSpan={this.addTextSpan}
                    deleteTextSpan={this.deleteTextSpan}
                    selectEntity={this.selectEntity}
                    classNames={this.props.classNames}
                />
            </div>
        )
    }
}

export default withStyles(styles)(SupervisedLabelPage);