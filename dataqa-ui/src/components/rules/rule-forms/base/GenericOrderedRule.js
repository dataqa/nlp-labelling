import React from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import ContainOrDoesNotContain from './ContainOrDoesNotContain';
import SentenceOrFullText from './SentenceOrFullText';
import InputField from './InputField';
import ClassDefinitionBox from './ClassDefinitionBox';
import RuleSubmitButton from './RuleSubmitButton';
import TypeSelector from './TypeSelector';
import { withStyles } from '@material-ui/core/styles';
import SideBar from '../../../SideBar';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import AddIcon from '@material-ui/icons/Add';
import IconButton from '@material-ui/core/IconButton';
import uuid from 'react-uuid';


const CREATE_RULE_PARAMS = {
    totalAttempts: 20,
    timeAttemptms: 15000
}


const styles = theme => ({
    container_div: {margin: 5, 
                    display:'inline-block'},
    main_div: {margin: 20},
    text: {display: 'inline-block',
            margin: '0px 20px 0px 0px'},
    box: {border: 'solid 1px'},
    class_definition_box: {border: 'solid 1px'},
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

const RuleExpression = (props) => {
    return(
        <Item>
            {props.index>0 && <p className={props.classes.text}>{props.dividerText}</p>}
            <div className={props.classes.container_div}>
                <TypeSelector 
                    value={props.type}
                    setType={(e) => props.setType(e, props.index)}
                />
            </div>
            <div className={props.classes.container_div}>
                <InputField 
                    changeInput={(e) => props.setWord(e, props.index)}
                    value={props.word}
                    label={`expression ${props.index + 1}`}
                    name={`${props.word}${props.index}`}
                />
            </div>
            {props.index == (props.total - 1) &&
                <IconButton 
                    aria-label="add-another-rule" 
                    name="add-project-icon-button"
                    onClick={() => props.addClick(props.total + 1)}
                >
                    <AddIcon 
                        name="add-rule-icon"
                    />
                </IconButton>
            }
        </Item>
    )
}

const RuleDefinitionBox = (props) => {
    return (
        <div style={{padding: 16}}>
            <Container className={props.classes.box}>
                <Item><p className={props.classes.text}>If the text</p></Item>
                <Item><ContainOrDoesNotContain/></Item>
                {
                    props.rules.map((rule, index) => {
                        const word = rule['word'];
                        const type = rule['type'];
                        return (
                            <RuleExpression 
                                key={index}
                                index={index}
                                type={type}
                                word={word}
                                total={props.rules.length}
                                addClick={props.addClick}
                                setWord={props.setWord}
                                setType={props.setType}
                                classes={props.classes}
                                dividerText={props.dividerText}
                            />
                        )
                    })
                }
                <Item><SentenceOrFullText/></Item>
            </Container>
        </div>
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

class GenericOrderedRule extends React.Component{

    state = {
        rules: [{'word': '', 'type': 'exact case-insensitive'}],
        ruleName: '',
        ruleExplanation: undefined,
        loading: false,
        toProjectSummary: false,
        className: undefined
    }

    setWord = (event, index) => {
        const { name, value } = event.target;

        this.setState((previousState) => {
            let rules = [...previousState.rules];
            rules[index]['word'] = value;
            return { rules };
        });
    }

    setType = (event, index) => {
        const { name, value } = event.target;

        this.setState((previousState) => {
            let rules = [...previousState.rules];
            rules[index]['type'] = value;
            return { rules };
          });
    }

    addClick = (index) => {
        this.setState((prevState) => {
            const rules = prevState.rules.concat({'word': '',
                                                  'type': 'exact case-insensitive'});
            return { rules }
        })
    }

    setRuleName = (event) => {
        this.setState(
            { 'ruleName': event.target.value }
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

    setRule = (elements, createRuleId, attemptNum, polling=false) => {
        if(!this.state.className){
            alert("Need to set classname!");
            return;
        }

        if(!this.state.ruleName){
            alert("Need to set rule name!");
            return;
        }

        if(!this.state.rules.map((rule, index) => rule.word).some((x) => x)){
            alert("Need to pass expression!");
            return;
        }

        const contains = elements.contain.value == 'contains';
        const classId = this.state.className.id;
        const outcomeName = this.state.className.name;
        const sentence = elements.sentence.value == 'sentence';
        const ruleString = this.state.rules.map((rule, index) => {
            const type = rule['type'];
            const word = rule['word'];
            return `${type} match of expression "${word}"`
        });

        const ruleExplanation = `If the text ` 
                            + `${contains? 'contains': 'does not contain'} `
                            + `'${ruleString.join(' followed by ')}' `
                            + `${sentence? 'in the same sentence': 'in the full text'} `
                            + `Then it's most likely class ${outcomeName}.`;
        console.log(ruleExplanation);

        const params = { contains, 
                        rule_explanation: ruleExplanation, 
                        rules: this.state.rules,
                        sentence };
        
        const data = new FormData();
        data.append('rule_type', this.props.ruleType);
        data.append('rule_name', this.state.ruleName);
        data.append('project_name', this.props.projectName);
        data.append('params', JSON.stringify(params));
        data.append('class_id', classId);
        data.append('class_name', outcomeName);
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
                        <Typography variant="h4">{this.props.title}</Typography>
                    </Box>
                    <form onSubmit={(e) => {e.preventDefault(); this.setRule(e.target.elements, uuid(), 0)}}>
                        <RuleDefinitionBox 
                            rules={this.state.rules}
                            addClick={this.addClick}
                            setWord={this.setWord}
                            setType={this.setType}
                            classes={classes}
                            dividerText={this.props.dividerText}
                        />
                        <br/>
                        <ClassDefinitionBox
                            classes={classes}
                            classNames={this.props.classNames || []}
                            setClass={this.setClass}
                        />
                        <RuleSubmit
                            setRuleName={this.setRuleName}
                            ruleName={this.state.ruleName}
                            loading={this.state.loading}
                            classes={classes}
                        />
                    </form>
                </div>
            </div>
        )
    }

}

export default withStyles(styles)(GenericOrderedRule);