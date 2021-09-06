import React from 'react';
import GenericOrderedRule from '../base/GenericOrderedRule';

const NonOrderedRule = (props) => {
    return (
        <GenericOrderedRule 
            ruleType="non-ordered"
            title="Non-ordered matches"
            dividerText="And"
            {...props}
        />
    )
}

export default NonOrderedRule;