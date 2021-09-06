import React from 'react';
import InputField from '../base/InputField';
import RuleSubmitButton from '../base/RuleSubmitButton';
import Grid from '@material-ui/core/Grid';


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

const RuleSubmit = (props) => {
    return (
        <Container style={{ marginTop: 20 }}>
            <Item>
                <InputField
                    changeInput={props.setRuleName}
                    value={props.ruleName}
                    label={"rule name"} />
            </Item>
            <Item>
                <RuleSubmitButton
                    loading={props.loading} />
            </Item>
        </Container>
    );
};

export default RuleSubmit;