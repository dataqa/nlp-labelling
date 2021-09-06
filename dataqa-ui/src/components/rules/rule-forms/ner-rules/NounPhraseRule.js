import React from 'react';
import SideBar from '../../../SideBar';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputField from '../base/InputField';
import ClassDefinitionBox from '../base/ClassDefinitionBox';
import RuleSubmit from '../base/RuleSubmit';
import { withStyles } from '@material-ui/core/styles';
import uuid from 'react-uuid';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';


const CREATE_RULE_PARAMS = {
    totalAttempts: 20,
    timeAttemptms: 15000
}

const styles = theme => ({
    main_div: {margin: 20},
    container: {display: 'flex'},
    box: {border: 'solid 1px'}
});

const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    spacing={4} 
                    direction="row"
                    alignItems='center'
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}


const OptionSelection = (props) => {
    return (
        <FormControl component="fieldset">
            <RadioGroup name="matchOptionGroup" value={props.value} onChange={props.handleChange}>
                <FormControlLabel value="text" control={<Radio />} label="text" />
                <FormControlLabel value="sentence" control={<Radio />} label="sentence" />
            </RadioGroup>
        </FormControl>
    )
}


const RuleDefinitionBox = (props) => {
    return (
        <div style={{padding: 16}}>
            <Container className={props.classes.box} direction="column" alignItems="flex-start">
                <Item>
                    <Container>
                        <Item>
                            <Typography variant="body1">If the</Typography>
                        </Item>
                        <Item>
                            <OptionSelection 
                                value={props.textOption}
                                handleChange={props.setTextOption}/>
                        </Item>
                        <Item>
                            <Typography variant="body1">matches</Typography>
                        </Item>
                        <Item>
                            <InputField 
                                changeInput={props.setTextRegex}
                                value={props.textRegex}
                                label={"regular expression"}
                            />
                        </Item>
                    </Container>
                </Item>

                <Item>
                    <Container direction="row">
                        <Item><Typography variant="body1">Then all the noun phrases matching</Typography></Item>
                        <Item>
                            <InputField 
                                    changeInput={props.setNounPhraseRegex}
                                    value={props.nounPhraseRegex}
                                    label={"regular expression"}
                                />
                        </Item>
                        <Item><Typography variant="body1">in the {props.textOption} are entities.</Typography></Item>
                        <Item>
                            <ClassDefinitionBox 
                                classNames={props.classNames}
                                setClass={props.setClass}
                                inputValue={props.classInputValue}
                                onInputChange={props.onClassInputChange}
                                addText={true}
                            />
                        </Item>
                    </Container>
                </Item>
            </Container>
        </div>
    )
}


class NounPhraseRule extends React.Component{
    state = {
        textOption: "text",
        textRegex: ".*",
        nounPhraseRegex: ".*",
        loading: false,
        ruleName: "",
        toProjectSummary: false,
        className: undefined,
        classInputValue: ''
    }

    setRuleName = (event) => {
        this.setState(
            { 'ruleName': event.target.value }
        );
    }

    setTextOption = (event) => {
        this.setState(
            { 'textOption': event.target.value }
        );
    }

    setTextRegex = (event) => {
        this.setState(
            { 'textRegex': event.target.value }
        );
    }

    setNounPhraseRegex = (event) => {
        this.setState(
            { 'nounPhraseRegex': event.target.value }
        );
    }

    onClassInputChange = (event, inputValue, reason) => {
        if(reason == 'input'){
            this.setState( {classInputValue: inputValue} );
        }
    }

    setClass = (event, input, reason) => {
        if(reason == "select-option"){
            this.setState( {className: input,
                            classInputValue: input.name});
        }  
        if(reason == 'clear'){
            this.setState( {className: undefined});
        }
        if(reason == 'remove-option'){
            this.setState( {className: undefined});
        }
    }

    checkStateValuesAreSet = () => {
        if(!this.state.ruleName){
            alert("Need to set rule name.");
            return false;
        }

        if(!this.state.textRegex){
            alert("Need to set regex.");
            return false;
        }

        if(!this.state.nounPhraseRegex){
            alert("Need to set regex.");
            return false;
        }
        return true;
    }

    getRuleExplanation = () => {
        let ruleExplanation;
        switch (this.state.textOption) {
            case "text":
                ruleExplanation = `If the full text matches "${this.state.textRegex}", ` 
                                + `then all the noun phrases matching "${this.state.nounPhraseRegex}" in the text are entities.`;
                break;
            case "sentence":
                ruleExplanation = `If a sentence matches "${this.state.textRegex}", ` 
                                + `then all the noun phrases matching "${this.state.nounPhraseRegex}" in the same sentence are entities.`;
                break;
        }
        return ruleExplanation;
    }

    setRule = (createRuleId, attemptNum, polling=false) => {
        if(this.checkStateValuesAreSet()){
            const ruleExplanation = this.getRuleExplanation();
            console.log("ruleExplanation", ruleExplanation);

            const params = { sentence: this.state.textOption == "sentence", 
                            text_regex: this.state.textRegex,
                            noun_phrase_regex: this.state.nounPhraseRegex,
                            rule_explanation: ruleExplanation };

            const data = new FormData();
            data.append('rule_name', this.state.ruleName);
            data.append('rule_type', 'noun_phrase_regex');
            data.append('project_name', this.props.projectName);
            data.append('class_id', this.state.className.id);
            data.append('class_name', this.state.className.name);
            data.append('params', JSON.stringify(params));
            data.append('create_rule_id', createRuleId);
            data.append('polling', polling);

            console.log(params, JSON.stringify(params));

            this.setState({loading: true});
            $.ajax({
                url : '/api/create-rule',
                type : 'POST',
                data : data,
                processData: false,  // tell jQuery not to process the data
                contentType: false,  // tell jQuery not to set contentType,
                success : function(data) {
                    const json = JSON.parse(data);
                    const currentRuleUpdateId = json['create_rule_id']

                    if(!currentRuleUpdateId || currentRuleUpdateId != createRuleId){
                        if(attemptNum < CREATE_RULE_PARAMS.totalAttempts){
                            setTimeout(() => this.setRule(createRuleId, attemptNum+1, true), 
                                        CREATE_RULE_PARAMS.timeAttemptms);
                        }
                        else{
                            alert("Server timed out.");
                            this.setState({loading: false});
                        }
                    }else{
                        console.log("Rule set correctly");
                        this.setState( {toProjectSummary: true, loading: false} );
                    }  
                }.bind(this),
                error: function (xmlhttprequest, textstatus, message) {
                    if(textstatus==="timeout" & attemptNum < CREATE_RULE_PARAMS.totalAttempts) {
                        setTimeout(() => this.setRule(createRuleId, attemptNum+1, true), 
                                        CREATE_RULE_PARAMS.timeAttemptms);
                    }
                    else{
                        alert("Error during rule creation");
                        this.setState({loading: false});
                    }
                }.bind(this)
            });
        }
    }

    render() {
        const { classes } = this.props;

        if(this.state.toProjectSummary === true) {
            return <Redirect to={{pathname: `/projects/${this.props.projectNameSlug}`}}/>
        }

        return (
            <div className={classes.container}>
                <SideBar 
                    projectNameSlug={this.props.projectNameSlug}
                    projectName={this.props.projectName}
                />
                <div className={classes.main_div}>
                    <Box my={2}>
                        <Typography variant="h4">{"Noun phrase match for entity"}</Typography>
                    </Box>
                    <form onSubmit={(e) => {e.preventDefault(); this.setRule(uuid(), 0)}}>
                        <RuleDefinitionBox
                            classes={classes}
                            classNames={this.props.classNames || []}
                            textOption={this.state.textOption}
                            setTextOption={this.setTextOption}
                            textRegex={this.state.textRegex}
                            nounPhraseRegex={this.state.nounPhraseRegex}
                            setTextRegex={this.setTextRegex}
                            setNounPhraseRegex={this.setNounPhraseRegex}
                            setClass={this.setClass}
                            onClassInputChange={this.onClassInputChange}
                            classInputValue={this.state.classInputValue}
                        />
                        <RuleSubmit 
                            setRuleName={this.setRuleName}
                            ruleName={this.state.ruleName}
                            loading={this.state.loading}
                        />
                    </form>
                </div>
            </div>
        )
    }
}

export default withStyles(styles)(NounPhraseRule);