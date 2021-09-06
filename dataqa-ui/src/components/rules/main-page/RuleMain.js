import React from 'react';
import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import SideBar from '../../SideBar';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';
import ImportRuleCard from './ImportRuleCard';
import { PROJECT_TYPES } from '../../constants';


const useStyles = makeStyles({
    container: {display: 'flex'},
    main_content: {marginLeft: "20px"},
    card: {
        height: '200px',
        width: '200px',
    }
});

const Container = (props) => {
    const { classes, ...rest } = props;
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    className={classes.container}
                    {...rest}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

function createData(title, explanation, url) {
    return { title, explanation, url };
}

const ClassificationRules = [
    createData('Non-ordered series of phrases',
                'Find a sequence of phrases where the order does not matter.',
                '/non-ordered'),
    createData('Ordered series of phrases', 
                'Find a sequence of phrases in a given order.',
                '/ordered')
]

const NERRules = [
    createData('Regex match on entity', 
                'Find a sequence of tokens matching a regular expression.',
                '/regex'),
    createData('Regex match on noun-phrases', 
                'Find matching noun phrases.',
                '/noun-phrase'),           
]

function getListRules(projectType) {
    if(projectType == PROJECT_TYPES.classification){
        return ClassificationRules;
    }
    else{
        return NERRules;
    }
}


const RuleCard = (props) => {
    const { classes } = props;
    return (
        <Card className={classes.card}>
            <CardContent>
                <Typography variant="h6">{props.title}</Typography>
                <br/>
                <Typography variant="body1">{props.explanation}</Typography>
            </CardContent>
        </Card>
    )
}


const RuleMain = (props) => {
    const classes = useStyles();
    const rules = getListRules(props.projectType);

    return (
        <div className={classes.container}>
            <SideBar
                projectNameSlug={props.projectNameSlug}
                projectName={props.projectName}
            />
            <div className={classes.main_content}>
                <Box my={2}>
                    <Typography variant="h6">Add rules.</Typography>
                </Box>
                <Container classes={classes}>
                {
                    rules.map((rule, index) => (
                        <Item key={index}>
                            <Link 
                                to={{pathname: rule.url}}
                                style={{ textDecoration: 'none' }}
                            >
                                <RuleCard 
                                    classes={classes}
                                    title={rule.title}
                                    explanation={rule.explanation}
                                />
                            </Link>
                        </Item>
                    ))
                }
                    <Item key="rule-import">
                        <ImportRuleCard 
                            projectName={props.projectName}
                            projectNameSlug={props.projectNameSlug}
                            classes={classes}
                        />
                    </Item>
                </Container>
            </div>
        </div>
    )
}

export default RuleMain;