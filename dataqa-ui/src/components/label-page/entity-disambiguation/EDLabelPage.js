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

    console.log("MainArea props", props);
    
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
        
        this.state = {  indexDoc: 0,
                        indexEntity: 0,
                        offsetDoc: 0,
                        offsetEntity: 0,
                        disableNextDoc: false,
                        disablePrevDoc: true,
                        disableNextEnt: false,
                        disablePrevEnt: true,
                        validatedLabels: undefined, // selected kbs that were sent from server
                        totalEntityDocs: 0,
                        totalEntities: 0,
                        currentDocs: [], // current page of docs for specific entity we are checking
                        currentSuggestions: [], // suggestions for specific entity we are checking
                        currentEntities: [], // current page of entities (with 1 doc per entity)
                        firstLoading: true, 
                        errorFetching: false,
                        sessionId: uuid()};
     }

    getEntities = (fromEntity, callback) => {
        const values = queryString.parse(this.props.location.search);
        const unmatched = Object.keys(values)[0] == "unmatched";
        console.log(unmatched, values, this.props.location.search);
        $.ajax({
                url : '/api/get-entities',
                type : 'GET',
                data : {"from_entity_offset": fromEntity, 
                        "project_name": this.props.projectName,
                        "session_id": this.state.sessionId,
                        "unmatched": unmatched},
                success : function(data) {
                    const json = $.parseJSON(data);
                    console.log("json is", json);
                    this.setState(() => {                        
                        return (
                                    {   currentEntities: json.entities,
                                        validatedLabels: json.entities.map((x) => x.label && this.formatSuggestion(x.label)),
                                        totalEntities: json.total_entities,
                                        firstLoading: false})});
                    if(callback){
                        callback();
                    };
                }.bind(this),
                error: function(error) {
                    this.setState({errorFetching: true});
                    console.log("Error in call to server");
                }
        });
    }

    getEntityDocs = (fromDoc) => {
        const entityId = this.state.currentEntities[this.state.indexEntity].id;
        console.log(`We will get more documents for entity id ${entityId} from document ${fromDoc}.`);
        if(fromDoc == 0){
            // fromDoc == 0, which means we're subtracting
            const currentDocs = this.state.currentEntities[this.state.indexEntity].docs;
            this.setState({currentDocs});
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
                    this.setState(() => {                        
                        return ({ currentDocs })});
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
        const callback = () => {
            this.setState((prevState) => {
                console.log("inside projectNameWasSet", prevState);
                const currentEntity = prevState.currentEntities.length && prevState.currentEntities[0];
                const currentDocs = currentEntity && currentEntity.docs;
                const totalEntityDocs = currentEntity && currentEntity.total_docs;
                console.log(currentEntity, totalEntityDocs);

                const suggestions = currentEntity && currentEntity.kb_suggestions.map(this.formatSuggestion);
                const validatedLabel = prevState.validatedLabels.length && prevState.validatedLabels[0];
                const currentSuggestions = this.getSuggestions(suggestions, validatedLabel);
                
                return ({   
                            currentDocs: currentDocs,
                            currentSuggestions: currentSuggestions,
                            totalEntityDocs: totalEntityDocs,
                            indexDoc: 0, 
                            indexEntity: 0,
                            offsetDoc: 0,
                            offsetEntity: 0,
                            disableNextDoc: totalEntityDocs == 1,
                            disableNextEnt: prevState.totalEntities == 1})});
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
        const updateIndexAfterAdding = () => {
            this.setState((prevState) => {
                let newState = {};
                if(prevState.indexDoc == prevState.currentDocs.length - 1){
                    // the last doc in the current batch, we need to ask for more docs
                    newState.indexDoc = 0;
                }else{
                    newState.indexDoc = prevState.indexDoc + 1;
                }

                newState.disableNextDoc =  prevState.offsetDoc + 1 >= prevState.totalEntityDocs - 1;
                newState.disablePrevDoc = false;
                newState.offsetDoc = prevState.offsetDoc + 1;

                return newState;
            })
        };

        // if we arrive at end of currentDocs, we need to get the new page
        // we don't check against pageSize because the first request only returns 1 doc per entity
        if(this.state.indexDoc == (this.state.currentDocs.length - 1) && this.state.indexDoc < this.state.totalEntityDocs - 1){
            console.log("Calling getEntityDocs")
            this.getEntityDocs(this.state.offsetDoc + 1);
        }else{
            console.log("Not calling getEntityDocs", this.state)
        }

        updateIndexAfterAdding();
    }

    addToEntityIndex = () => {
        // add to entities
        const updateIndexAfterAdding = () => {
            this.setState((prevState) => {
                let newState = {};
                if(prevState.indexEntity < this.pageSize - 1){
                    newState.indexEntity = prevState.indexEntity + 1;
                    newState.currentDocs = prevState.currentEntities[newState.indexEntity].docs;
                    newState.totalEntityDocs = prevState.currentEntities[newState.indexEntity].total_docs;
                }else{
                    // the last entity in the current batch, we have added new entities
                    newState.indexEntity = 0;
                    newState.currentDocs=prevState.currentEntities[0].docs;
                    newState.totalEntityDocs=prevState.currentEntities[0].total_docs;
                }

                const suggestions = prevState.currentEntities[newState.indexEntity].kb_suggestions.map(this.formatSuggestion);
                const validatedLabel = prevState.validatedLabels[newState.indexEntity];
                newState.currentSuggestions = this.getSuggestions(suggestions, validatedLabel);

                newState.offsetDoc = 0;
                newState.indexDoc = 0;
                newState.disableNextDoc = newState.totalEntityDocs == 1;
                newState.disablePrevDoc = true;
                newState.disableNextEnt = (prevState.offsetEntity + 1) == (prevState.totalEntities - 1);
                newState.disablePrevEnt = false;
                newState.offsetEntity = prevState.offsetEntity + 1;

                return newState
            })
        };

        // if the index is 9, we need to get the new page
        if(this.state.indexEntity == (this.pageSize - 1)){
            this.getEntities(this.state.offsetEntity + 1);
        }
        updateIndexAfterAdding();
    }

    subtractToDocIndex = () => {
        const updateIndexAfterSubtracting = () => {
            this.setState((prevState) => {
                let indexDoc;
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
                return {
                    indexDoc,
                    disableNextDoc: false,
                    disablePrevDoc: prevState.offsetDoc==1,
                    offsetDoc: prevState.offsetDoc - 1,
                }
            })
        };

        if(this.state.indexDoc == 0){
            this.getEntityDocs(Math.max(this.state.offsetDoc - this.pageSize, 0));
            // this.updateProjectState(this.state.offsetDoc - this.pageSize, updateIndexAfterSubtracting);
        }
        updateIndexAfterSubtracting();
    }

    subtractToEntityIndex = () => {
        // add to entities
        const updateIndexAfterSubtracting = () => {
            this.setState((prevState) => {
                let newState = {};

                if(prevState.indexEntity > 0){
                    newState.indexEntity = prevState.indexEntity - 1;
                    newState.currentDocs = prevState.currentEntities[newState.indexEntity].docs;
                    newState.totalEntityDocs = prevState.currentEntities[newState.indexEntity].total_docs;
                }else{
                    // the last doc in the current batch, we have new entities
                    if(prevState.offsetEntity == 1){
                        newState.indexEntity = 0;
                    }else{
                        newState.indexEntity = this.pageSize - 1;
                    }
                    newState.currentDocs = prevState.currentEntities[newState.indexEntity].docs;
                    newState.totalEntityDocs = prevState.currentEntities[newState.indexEntity].total_docs;
                }

                let suggestions = prevState.currentEntities[newState.indexEntity].kb_suggestions.map(this.formatSuggestion);
                const validatedLabel = prevState.validatedLabels[newState.indexEntity];
                newState.currentSuggestions = this.getSuggestions(suggestions, validatedLabel);

                newState.indexDoc = 0;
                newState.offsetDoc = 0;
                newState.disableNextDoc = newState.totalEntityDocs == 1;
                newState.disablePrevDoc = true;
                newState.disableNextEnt = false;
                newState.disablePrevEnt = prevState.offsetEntity == 1;
                newState.offsetEntity = prevState.offsetEntity - 1;

                return newState;
            })
        };

        // if the index is 0, we need to get the previous page of results
        if(this.state.indexEntity == 0){
            this.getEntities(Math.max(this.state.offsetEntity - this.pageSize, 0));
        }
        updateIndexAfterSubtracting();
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

    formatSuggestion = ( {name, id} ) => {
        let displayedName = name.trim();
        if(name.length > 10){
            const spaceIndex = displayedName.indexOf(' ');
            if((spaceIndex > 3) & (spaceIndex<10)){
                displayedName = displayedName.substring(0, spaceIndex) + '...';
            }
            displayedName = displayedName.substring(0, 10).trim() + '...';
        }
        return ( {name: displayedName, "label": id}
        )
    }

    getSuggestions = (suggestions, validatedLabel) => {
        const kbIds = suggestions.map((x) => x.label);
        if(validatedLabel && (!kbIds.includes(validatedLabel))){
            suggestions.concat(this.formatSuggestion(validatedLabel))
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