import React, { PureComponent }  from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
  } from 'recharts';
import RuleSubmitButton from '../base/RuleSubmitButton';
import InputField from '../base/InputField';
import ClassDefinitionBox from '../base/ClassDefinitionBox';
import OptionSelection from '../base/OptionSelection';
import { withStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import SideBar from '../../../SideBar';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import uuid from 'react-uuid';


const CREATE_RULE_PARAMS = {
    totalAttempts: 20,
    timeAttemptms: 15000
}

const styles = theme => ({
    container_div: {margin: 5, 
                    display:'inline-block'},
    main_div: {margin: 20, overflow: 'hidden'},
    text: {display: 'inline-block',
            margin: '0px 20px 0px 0px'},
    box: {border: 'solid 1px'},
    container: {display: 'flex'}
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

const SentimentSelector = () => {
    return (
        <OptionSelection 
            name="sentiment"
            options={[{value: 'positive', text: 'positive'},
                    {value: 'negative', text: 'negative'},
                    {value: 'neutral', text: 'neutral'}]}
        />
    )
}

const SentimentDirectionSelector = () => {
    return (
        <OptionSelection 
            name="sentimentDirection"
            options={[{value: 'gt', text: 'greater than'},
                    {value: 'lt', text: 'less than'}]}
        />
    )
}


const RuleSubmit = (props) => {
    return (
        <Container style={{marginTop: 20}}>
            <Item>
                <InputField 
                    changeInput={props.setRuleName}
                    value={props.ruleName}
                    name="rule"
                    label="Rule name"
                />
            </Item>
            <Item>
                <RuleSubmitButton 
                    loading={props.loading}
                />
            </Item>
        </Container>
    )
}

const RuleDefinitionBox = (props) => {
    return (
        <div style={{padding: 16}}>
            <Container className={props.classes.box}>
                <Item><p className={props.classes.text}>If the text has a value for</p></Item>
                <Item><SentimentSelector/></Item>
                <Item><p className={props.classes.text}>that is</p></Item>
                <Item>
                    <div className={props.classes.text}>
                        <SentimentDirectionSelector/>
                    </div>
                </Item>
                <Item>
                    <InputField 
                        changeInput={props.setScoreValue}
                        value={props.score_value}
                        name="scoreValue"
                    />
                </Item>
            </Container>
        </div>
    )
}
  
class SentimentRule extends PureComponent {  

    state = {
        data: undefined,
        loading: false,
        rule_name: '',
        score_value: '',
        direction: 'gt',
        polarity: 'positive',
        className: undefined
    }

    getSentimentDistribution = () => {
        console.log(`Getting the info for project name ${this.props.projectName}`);
        const data =  {project_name: this.props.projectName};
        $.ajax({
            url : '/api/get-sentiment-distribution',
            type : 'GET',
            data : data,
            success : function(data) {
                const json = $.parseJSON(data);
                this.setState( { data: json })
                console.log("Sentiment", json);
            }.bind(this),
            error: function (error) {
                alert(error);
            }
        });
    }

    componentDidMount(){
        if(this.props.projectName){
            this.getSentimentDistribution();
        }
    }

    componentDidUpdate(prevProps, prevState){
        if(prevProps.projectName != this.props.projectName){
            this.getSentimentDistribution();
        }
    }

    setRule = (elements, createRuleId, attemptNum, polling=false) => {        
        const sentimentDirection = elements.sentimentDirection.value;
        const score = elements.scoreValue? elements.scoreValue.value: undefined;

        if(!score){
            alert("Need to define score between 0 and 1.");
            return;
        }
        if(score <= 0 && sentimentDirection == "lt"){
            alert("Score cannot be less than 0.");
            return;
        }
        if(score >= 1 && sentimentDirection == "gt"){
            alert("Score cannot be greater than 1.");
            return;
        }
        if(!this.state.className){
            alert("Need to set classname!");
            return;
        }

        const classId = this.state.className.id;
        const outcomeName = this.state.className.name;
        const isGt = sentimentDirection == "gt";
        const sentiment = elements.sentiment.value;

        const rule_explanation = `If the text has ` 
                            + `a value for the ${sentiment} score that is `
                            + `${isGt? "greater than": "less than"} ${score} ` 
                            + `Then it's most likely class ${outcomeName}.`;
        console.log(rule_explanation);

        const params = { rule_explanation, 
                        sentiment, 
                        score,
                        is_gt: isGt };
        
        const data = new FormData();
        data.append('rule_type', 'sentiment');
        data.append('rule_name', this.state.rule_name);
        data.append('project_name', this.props.projectName);
        data.append('class_id', classId);
        data.append('class_name', outcomeName);
        data.append('params', JSON.stringify(params));
        data.append('create_rule_id', createRuleId);
        data.append('polling', polling);
        console.log(data);

        this.setState({loading: true});

        $.ajax({
            url : '/api/create-rule',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            timeout: 60000,
            success : function(data) {
                const json = JSON.parse(data);
                const currentRuleUpdateId = json['create_rule_id']

                if(!currentRuleUpdateId || currentRuleUpdateId != createRuleId){
                    if(attemptNum < CREATE_RULE_PARAMS.totalAttempts){
                        setTimeout(() => this.setRule(elements, createRuleId, attemptNum+1, true), 
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
                    setTimeout(() => this.setRule(elements, createRuleId, attemptNum+1, true), 
                                    CREATE_RULE_PARAMS.timeAttemptms);
                }
                else{
                    alert("Error during rule creation");
                    this.setState({loading: false});
                }
            }.bind(this)
        });
    }

    setRuleName = (event) => {
        this.setState(
            { 'rule_name': event.target.value }
        );
    }

    setClass = (event, input, reason) => {
        if(reason == "select-option"){
            this.setState( {className: input});
        }  
        if(reason == 'clear'){
            this.setState( {className: undefined});
        }
        if(reason == 'remove-option'){
            this.setState( {className: undefined});
        }
    }

    setScoreValue = (event) => {
        const score =  event.target.value;
        if(isNaN(score) || score > 1 || score < 0){
            alert("Score must be a number between 0 and 1.")
        }
        else{
            this.setState(
                {'score_value': score}
            )
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
                        <Typography variant="h4">Sentiment rule</Typography>
                    </Box>
                                {this.state.data && 
                                    <div style={{width: '100%', overflowX: 'scroll'}}>
                                        <BarChart
                                            width={800}
                                            height={300}
                                            data={this.state.data}
                                            margin={{
                                                top: 5, right: 30, left: 20, bottom: 5,
                                            }}
                                            >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="score" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="positive" fill="#8884d8" />
                                            <Bar dataKey="negative" fill="#82ca9d" />
                                            <Bar dataKey="neutral" fill="#98af1d" />
                                        </BarChart>
                                    </div>
                                }
                    <form onSubmit={(e) => {e.preventDefault(); this.setRule(e.target.elements, uuid(), 0)}}>
                        <RuleDefinitionBox
                            classes={classes}
                            setScoreValue={this.setScoreValue}
                            score_value={this.state.score_value}
                        />
                        <br/>
                        <ClassDefinitionBox
                            classes={classes}
                            classNames={this.props.classNames || []}
                            setClass={this.setClass}
                        />
                        <RuleSubmit
                            setRuleName={this.setRuleName}
                            rule_name={this.state.rule_name}
                            loading={this.state.loading}
                            classes={classes}
                        />
                    </form>
                </div>
        </div>
        );
    }
}

export default withStyles(styles)(SentimentRule);