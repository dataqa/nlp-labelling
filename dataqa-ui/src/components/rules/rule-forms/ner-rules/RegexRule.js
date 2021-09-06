import React from 'react';
import SideBar from '../../../SideBar';
import { withStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import InputField from '../base/InputField';
import ClassDefinitionBox from '../base/ClassDefinitionBox';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import uuid from 'react-uuid';
import RuleSubmit from '../base/RuleSubmit';


const CREATE_RULE_PARAMS = {
    totalAttempts: 20,
    timeAttemptms: 15000
}

const styles = theme => ({
    main_div: {margin: 20},
    container: {display: 'flex'},
    box: {border: 'solid 1px'},
    class_definition_box: {}
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
                <FormControlLabel value="matches-entity" control={<Radio />} label="it matches the entity" />
                <FormControlLabel value="precedes-entity-1word" control={<Radio />} label="it precedes the entity which is formed of 1 word" />
                <FormControlLabel value="precedes-entity-2word" control={<Radio />} label="it precedes the entity which is formed of 2 words" />
                <FormControlLabel value="precedes-entity-3word" control={<Radio />} label="it precedes the entity which is formed of 3 words" />
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
                            <Typography variant="body1">If the text matches</Typography>
                        </Item>
                        <Item>
                            <InputField 
                                changeInput={(e) => props.setRegex(e)}
                                value={props.ruleName}
                                label={"regular expression"}
                            />
                        </Item>
                    </Container>
                </Item>

                <Item>
                    <Container direction="row">
                        <Item><Typography variant="body1">Then</Typography></Item>
                        <Item>
                            <OptionSelection 
                                value={props.matchOption} 
                                handleChange={props.setMatchOption}/>
                        </Item>
                        <Item>
                            <ClassDefinitionBox 
                                classes={props.classes}
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

class RegexRule extends React.Component{

    state = {
        toProjectSummary: false,
        ruleName: "",
        regex: "",
        matchOption: "matches-entity",
        loading: false,
        className: undefined,
        classInputValue: ''
    }

    setRuleName = (event) => {
        this.setState(
            { 'ruleName': event.target.value }
        );
    }

    setRegex = (event) => {
        this.setState(
            { 'regex': event.target.value }
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

    setMatchOption = (event) => {
        this.setState(
            { 'matchOption': event.target.value }
        );
    }

    setRule = (createRuleId, attemptNum, polling=false) => {
        const regex = this.state.regex;

        if(!this.state.ruleName){
            alert("Need to set rule name.");
            return;
        }

        if(!this.state.regex){
            alert("Need to set regex.");
            return;
        }

        if(!this.state.className){
            alert("Need to set className.");
            return;
        }

        let n, ruleExplanation;
        switch (this.state.matchOption) {
            case "matches-entity":
                console.log(`${this.state.matchOption} matches matches-entity`)
                n=0;
                ruleExplanation=`The entity matches the expression "${this.state.regex}"`;
                break;
            case "precedes-entity-1word":
                console.log(`${this.state.matchOption} matches "precedes-entity-1word"`);
                n=1;
                ruleExplanation=`The entity matches 1 word after expression "${this.state.regex}" within the same sentence.`;
                break;
            case "precedes-entity-2word":
                console.log(`${this.state.matchOption} matches "precedes-entity-2word"`);
                n=2;
                ruleExplanation=`The entity matches 2 words after expression "${this.state.regex}" within the same sentence.`;
                break;
            case "precedes-entity-3word":
                console.log(`${this.state.matchOption} matches "precedes-entity-3word"`);
                n=3;
                ruleExplanation=`The entity matches 3 words after expression "${this.state.regex}" within the same sentence.`;
                break;
        }

        const params = { n: n, 
                        regex: regex,
                        rule_explanation: ruleExplanation };
        
        const data = new FormData();
        data.append('rule_name', this.state.ruleName);
        data.append('rule_type', 'entity_regex');
        data.append('project_name', this.props.projectName);
        data.append('params', JSON.stringify(params));
        data.append('class_id', this.state.className.id);
        data.append('class_name', this.state.className.name);
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

    render(){
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
                        <Typography variant="h4">{"Regex match for entity"}</Typography>
                    </Box>
                    <form onSubmit={(e) => {e.preventDefault(); this.setRule(uuid(), 0)}}>
                        <RuleDefinitionBox 
                            classes={classes}
                            classNames={this.props.classNames || []}
                            regex={this.state.regex}
                            setRegex={this.setRegex}
                            matchOption={this.state.matchOption}
                            setMatchOption={this.setMatchOption}
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

export default withStyles(styles)(RegexRule);