import React from 'react';
import $ from 'jquery';
import SideBar from '../../SideBar';
import uuid from 'react-uuid';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PROJECT_TYPES } from '../../constants';
import Text from './Text';
import Navigation from './Navigation';
import queryString from 'query-string';
import { trimString } from '../../../utils';

const PAGESIZE = 10;
const TRUNCATED_BUTTON_TEXT = 100;


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
                    direction="column"
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

    const entityColourMap = props.classNames? props.classNames.reduce(function(obj, itm) {
        obj[itm['id']] = itm['colour'];

        return obj;
    }, {}) : [];

    console.log("MainArea props", props, "entityColourMap", entityColourMap);
    
    if(props.errorFetching){
        return <Message 
                    classes={classes}
                    content='Error loading documents.'
                />
    }
    if(Object.values(PROJECT_TYPES).indexOf(props.projectType) == -1) {
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
    }else {
        if(!props.hasDocs){
            return <Message 
                        classes={classes}
                        content='No more documents to label.'
                    />
        }else{
            if(Object.values(PROJECT_TYPES).indexOf(props.projectType) == -1){ 
                return (<Message 
                            classes={classes}
                            content={`Project type ${props.projectType} is not supported.`}
                        />)
            }
            else{
                return (
                    <Container classes={classes}>
                        <Item>
                            <Text 
                                content={props.content}
                                projectParams={props.projectParams}
                                projectType={props.projectType}
                                currentTextSpans={props.textSpans}
                                subtractToDocIndex={props.subtractToDocIndex}
                                addToDocIndex={props.addToDocIndex}
                                disableNextDoc={props.disableNextDoc}
                                disablePrevDoc={props.disablePrevDoc}
                                entityColourMap={entityColourMap}
                            />
                        </Item>
                        <Item>
                            <Navigation
                                projectType={props.projectType}
                                subtractToIndex={props.subtractToEntityIndex}
                                addToIndex={props.addToEntityIndex}
                                disableNext={props.disableNextEnt}
                                disablePrev={props.disablePrevEnt}
                                updateIndexAfterLabelling={props.updateIndexAfterLabelling}
                                kbSuggestions={props.kbSuggestions}
                                sessionId={props.sessionId}
                                entityId={props.entityId}
                                projectName={props.projectName}
                                currentDisplayedLabel={props.currentDisplayedLabel}
                            />
                        </Item>
                    </Container>
                )
            }
        }
    }
}

class EDLabelPage extends React.Component{

    constructor(props) {
        super(props);
        console.log("Inside constructor ", props);

        this.pageSize = PAGESIZE;
        
        this.state = {  indexDoc: 0, // the index of the document for a specific entity in the currentDocs array
                        indexEntity: 0, // the index of the entity in the currentEntities array
                        offsetDoc: 0, // the true index of the document for a specific entity
                        offsetEntity: 0, // the true index of the entity
                        disableNextDoc: false,
                        disablePrevDoc: true,
                        disableNextEnt: false,
                        disablePrevEnt: true,
                        validatedLabels: [], // selected kbs that were sent from server
                        totalEntityDocs: 0,
                        totalEntities: 0,
                        currentDocs: [], // current page of docs for specific entity we are checking
                        currentSuggestions: [], // suggestions for specific entity we are checking
                        currentEntities: [], // current page of entities (with 1 doc per entity)
                        firstLoading: true, 
                        errorFetching: false,
                        sessionId: uuid()};
     }

    getEntities = (fromEntity, stateUpdateFn) => {
        const values = queryString.parse(this.props.location.search);
        const unmatched = Object.keys(values)[0] == "unmatched";
        console.log("Inside getEntities ", unmatched, values, this.props.location.search);
        $.ajax({
                url : '/api/get-entities',
                type : 'GET',
                data : {"from_entity_offset": fromEntity, 
                        "project_name": this.props.projectName,
                        "session_id": this.state.sessionId,
                        "unmatched": unmatched},
                success : function(data) {
                    const json = $.parseJSON(data);
                    console.log("json is", json, json.entities.map((x) => x.label && this.formatSuggestion(x.label), json.entities.map((x) => x.label && this.formatSuggestion(x.label).length)));
                    stateUpdateFn(   
                        json.entities,
                        json.entities.map((x) => x.label && this.formatSuggestion(x.label)),
                        json.total_entities,
                        false);
                }.bind(this),
                error: function(error) {
                    this.setState({errorFetching: true});
                    console.log("Error in call to server");
                }
        });
    }

    getEntityDocs = (fromDoc, stateUpdateFn) => {
        const entityId = this.state.currentEntities[this.state.indexEntity].id;
        console.log(`We will get more documents for entity id ${entityId} from document ${fromDoc}.`);
        if(fromDoc == 0){
            // fromDoc == 0, which means we're subtracting
            const currentDocs = this.state.currentEntities[this.state.indexEntity].docs;
            stateUpdateFn( currentDocs );
            console.log("Inside getEntityDocs", currentDocs, fromDoc);
        }else{
            // we pretend to get more docs
            $.ajax({
                url : '/api/get-entity-docs',
                type : 'GET',
                data : {"from_doc_offset": fromDoc, 
                        "project_name": this.props.projectName,
                        "entity_id": entityId},
                success : function(data) {
                    const currentDocs = $.parseJSON(data);
                    console.log("currentDocs is", currentDocs);
                    stateUpdateFn( currentDocs );
                    
                }.bind(this),
                error: function(error) {
                    this.setState({errorFetching: true});
                    console.log("Error in call to server");
                }
            });
            // this.setState({currentDocs: MoreDocsEntityOne});
        }
    }

    projectNameWasSet = () => {
        const callback = (currentEntities,
                            validatedLabels,
                            totalEntities,
                            firstLoading) => {
            console.log("calling callback of projectNameWasSet ", currentEntities, validatedLabels);
            this.setState((prevState) => {
                const currentEntitiesUpdated = currentEntities || prevState.currentEntities;
                const validatedLabelsUpdated = validatedLabels || prevState.validatedLabels;
                const totalEntitiesUpdated = totalEntities || prevState.totalEntities;

                console.log("inside projectNameWasSet", prevState, validatedLabelsUpdated);
                let currentDocs, currentSuggestions, totalEntityDocs;
                if(currentEntitiesUpdated.length){
                    const currentEntity = currentEntitiesUpdated[0];
                    currentDocs = currentEntity.docs;
                    totalEntityDocs = currentEntity.total_docs;
                    console.log(currentEntity, totalEntityDocs);
    
                    const suggestions = currentEntity.kb_suggestions.map(this.formatSuggestion);
                    console.log("Inside projectNameWasSet 2 ", suggestions, currentEntity);
                    const validatedLabel = validatedLabelsUpdated.length && validatedLabelsUpdated[0];
                    currentSuggestions = this.getSuggestions(suggestions, validatedLabel);
                }else{
                    currentDocs = [];
                    currentSuggestions = [];
                    totalEntityDocs = 0;
                }
                
                
                return ({   
                            currentEntities: currentEntitiesUpdated,
                            validatedLabels: validatedLabelsUpdated,
                            totalEntities: totalEntitiesUpdated,
                            currentDocs: currentDocs,
                            currentSuggestions: currentSuggestions,
                            totalEntityDocs: totalEntityDocs,
                            indexDoc: 0, 
                            indexEntity: 0,
                            offsetDoc: 0,
                            offsetEntity: 0,
                            disableNextDoc: totalEntityDocs == 1,
                            disableNextEnt: totalEntitiesUpdated == 1,
                            firstLoading})});
        }

        this.getEntities(0, callback);
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
    }

    addToDocIndex = () => {
        // add to documents
        const updateIndexAfterAdding = (currentDocs) => {
            this.setState((prevState) => {
                const currentDocsUpdated = currentDocs || prevState.currentDocs;
                console.log("Calling updateIndexAfterAdding with ", prevState, currentDocsUpdated);
                let newState = {};
                if(prevState.indexDoc == prevState.currentDocs.length - 1){
                    // the last doc in the current batch, we need to ask for more docs
                    newState.indexDoc = 0;   
                }else{
                    newState.indexDoc = prevState.indexDoc + 1;
                }

                newState.disableNextDoc =  prevState.offsetDoc + 1 >= prevState.totalEntityDocs - 1;
                newState.disablePrevDoc = false;
                newState.currentDocs = currentDocsUpdated;
                newState.offsetDoc = prevState.offsetDoc + 1;

                return newState;
            })
        };

        // if we arrive at end of currentDocs, we need to get the new page
        // we don't check against pageSize because the first request only returns 1 doc per entity
        if((this.state.indexDoc == (this.state.currentDocs.length - 1)) && (this.state.offsetDoc < (this.state.totalEntityDocs - 1))){
            console.log("Calling getEntityDocs ", this.state);
            this.getEntityDocs(this.state.offsetDoc + 1, updateIndexAfterAdding);
        }else{
            console.log("Not calling getEntityDocs", this.state);
            updateIndexAfterAdding();
        }
    }

    addToEntityIndex = () => {
        // add to entities
        const updateIndexAfterAdding = (currentEntities,
                                        validatedLabels,
                                        totalEntities,
                                        firstLoading) => {
            
            this.setState((prevState) => {
                const currentEntitiesUpdated = currentEntities || prevState.currentEntities;
                const validatedLabelsUpdated = validatedLabels || prevState.validatedLabels;
                const totalEntitiesUpdated = totalEntities || prevState.totalEntities;

                let newState = {};
                if(prevState.indexEntity < this.pageSize - 1){
                    newState.indexEntity = prevState.indexEntity + 1;
                    newState.currentDocs = currentEntitiesUpdated[newState.indexEntity].docs;
                    newState.totalEntityDocs = currentEntitiesUpdated[newState.indexEntity].total_docs;
                }else{
                    // the last entity in the current batch, we have added new entities
                    newState.indexEntity = 0;
                    newState.currentDocs=currentEntitiesUpdated[0].docs;
                    newState.totalEntityDocs=currentEntitiesUpdated[0].total_docs;
                }

                const suggestions = currentEntitiesUpdated[newState.indexEntity].kb_suggestions.map(this.formatSuggestion);
                const validatedLabel = validatedLabelsUpdated[newState.indexEntity];
                newState.currentSuggestions = this.getSuggestions(suggestions, validatedLabel);

                newState.offsetDoc = 0;
                newState.indexDoc = 0;
                newState.disableNextDoc = newState.totalEntityDocs == 1;
                newState.disablePrevDoc = true;
                newState.disableNextEnt = (prevState.offsetEntity + 1) == (totalEntitiesUpdated - 1);
                newState.disablePrevEnt = false;
                newState.offsetEntity = prevState.offsetEntity + 1;
                
                newState.firstLoading = firstLoading;
                newState.currentEntities = currentEntitiesUpdated;
                newState.validatedLabels = validatedLabelsUpdated;
                newState.totalEntities = totalEntitiesUpdated;

                return newState
            })
        };

        // if the index is 9, we need to get the new page
        if(this.state.indexEntity == (this.pageSize - 1)){
            this.getEntities(this.state.offsetEntity + 1, updateIndexAfterAdding);
        }
        else{
            updateIndexAfterAdding();
        }
    }

    subtractToDocIndex = () => {
        console.log("Inside subtractToDocIndex ");

        const updateIndexAfterSubtracting = (currentDocs) => {
            this.setState((prevState) => {
                let indexDoc;
                const currentDocsUpdated = currentDocs || prevState.currentDocs;
                if(prevState.indexDoc == 0){
                    // the first doc in the current batch, we need to ask for more docs
                    if(prevState.offsetDoc == 1){
                        indexDoc = 0;
                    }else{
                        indexDoc = this.pageSize - 1;
                    }
                }else{
                    indexDoc = prevState.indexDoc - 1;
                }
                console.log("Inside subtractToDocIndex 2 ", prevState.offsetDoc==1);
                return {
                    indexDoc,
                    disableNextDoc: false,
                    disablePrevDoc: prevState.offsetDoc==1,
                    offsetDoc: prevState.offsetDoc - 1,
                    currentDocs: currentDocsUpdated
                }
            })
        };

        if(this.state.indexDoc == 0){
            console.log("Inside subtractToDocIndex 4 ");
            this.getEntityDocs(Math.max(this.state.offsetDoc - this.pageSize, 0),
            updateIndexAfterSubtracting);
            // this.updateProjectState(this.state.offsetDoc - this.pageSize, updateIndexAfterSubtracting);
        }
        else{
            console.log("Inside subtractToDocIndex 3 ");
            updateIndexAfterSubtracting();
        }
    }

    subtractToEntityIndex = () => {
        // add to entities
        const updateIndexAfterSubtracting = (currentEntities,
                                            validatedLabels,
                                            totalEntities,
                                            firstLoading) => {
            
            this.setState((prevState) => {
                const currentEntitiesUpdated = currentEntities || prevState.currentEntities;
                const validatedLabelsUpdated = validatedLabels || prevState.validatedLabels;
                const totalEntitiesUpdated = totalEntities || prevState.totalEntities;

                console.log("Inside updateIndexAfterSubtracting", prevState, this.state);
                let newState = {};

                if(prevState.indexEntity > 0){
                    newState.indexEntity = prevState.indexEntity - 1;
                    newState.currentDocs = currentEntitiesUpdated[newState.indexEntity].docs;
                    newState.totalEntityDocs = currentEntitiesUpdated[newState.indexEntity].total_docs;
                }else{
                    // the last doc in the current batch, we have new entities
                    if(prevState.offsetEntity == 1){
                        newState.indexEntity = 0;
                    }else{
                        newState.indexEntity = this.pageSize - 1;
                    }
                    console.log("here ", newState.indexEntity, currentEntitiesUpdated, prevState.currentEntities, this.state.currentEntities);
                    newState.currentDocs = currentEntitiesUpdated[newState.indexEntity].docs;
                    newState.totalEntityDocs = currentEntitiesUpdated[newState.indexEntity].total_docs;
                }

                let suggestions = currentEntitiesUpdated[newState.indexEntity].kb_suggestions.map(this.formatSuggestion);
                const validatedLabel = validatedLabelsUpdated[newState.indexEntity];
                newState.currentSuggestions = this.getSuggestions(suggestions, validatedLabel);

                newState.indexDoc = 0;
                newState.offsetDoc = 0;
                newState.disableNextDoc = newState.totalEntityDocs == 1;
                newState.disablePrevDoc = true;
                newState.disableNextEnt = false;
                newState.disablePrevEnt = prevState.offsetEntity == 1;
                newState.offsetEntity = prevState.offsetEntity - 1;

                newState.firstLoading = firstLoading;
                newState.currentEntities = currentEntitiesUpdated;
                newState.validatedLabels = validatedLabelsUpdated;
                newState.totalEntities = totalEntitiesUpdated;

                return newState;
            })
        };

        // if the index is 0, we need to get the previous page of results
        if(this.state.indexEntity == 0){
            this.getEntities(Math.max(this.state.offsetEntity - this.pageSize, 0), updateIndexAfterSubtracting);
        }else{
            updateIndexAfterSubtracting();
        } 
    }

    updateIndexAfterLabelling = ({label, name}) => {
        this.setState((prevState) => {
            const validatedLabels = prevState.validatedLabels;
            validatedLabels[prevState.indexEntity] = label;
            return ({ validatedLabels });
        });

        if(!this.state.disableNextEnt){
            this.addToEntityIndex();
        }
    }

    formatSuggestion = ( {name, id, colour} ) => {
        const displayedName = trimString(name, TRUNCATED_BUTTON_TEXT);
        return ( {name: displayedName, "label": id, "colour": colour}
        )
    }

    getSuggestions = (suggestions, validatedLabel) => {
        const kbIds = suggestions.map((x) => x.label);
        if(validatedLabel && (!kbIds.includes(validatedLabel.label))){
            suggestions = suggestions.concat(validatedLabel);
        }
        return suggestions;
    }

    render(){
        const { classes } = this.props;

        console.log("Inside render, state: ", this.state, "props: ", this.props);

        let entityId, textSpans;
        if(this.state.currentDocs.length > 0){
            textSpans = this.state.currentDocs[this.state.indexDoc].mentions;
            entityId = this.state.currentEntities[this.state.indexEntity].id;
        }

        const currentDisplayedLabel = (this.state.validatedLabels 
                                    && this.state.validatedLabels[this.state.indexEntity]
                                    && this.state.validatedLabels[this.state.indexEntity].label);

        return (
            <div className={classes.main_container}>
                <SideBar
                    projectNameSlug={this.props.projectNameSlug}
                    projectName={this.props.projectName}
                    projectType={this.props.projectType}
                />
                <MainArea
                    {...this.state}
                    disableNextDoc={this.state.disableNextDoc}
                    disablePrevDoc={this.state.disablePrevDoc}
                    disableNextEnt={this.state.disableNextEnt}
                    disablePrevEnt={this.state.disablePrevEnt}
                    addToDocIndex={this.addToDocIndex} 
                    addToEntityIndex={this.addToEntityIndex} 
                    subtractToDocIndex={this.subtractToDocIndex}
                    subtractToEntityIndex={this.subtractToEntityIndex}
                    content={this.state.currentDocs[this.state.indexDoc]}
                    textSpans={textSpans}
                    classes={classes}
                    classNames={this.props.classNames}
                    hasDocs={this.state.currentDocs.length > 0}
                    projectName={this.props.projectName}
                    entityId={entityId}
                    projectType={this.props.projectType}
                    updateIndexAfterLabelling={this.updateIndexAfterLabelling}
                    currentDisplayedLabel={currentDisplayedLabel}
                    kbSuggestions={this.state.currentSuggestions}
                />
            </div>
        )
    }
}

export default withStyles(styles)(EDLabelPage);