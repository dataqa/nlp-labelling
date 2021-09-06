import React from 'react';
import GenericOrderedRule from '../base/GenericOrderedRule';

const OrderedRule = (props) => {
    return (
        <GenericOrderedRule 
            ruleType="ordered"
            title="Ordered matches"
            dividerText="Followed by"
            {...props}
        />
    )
}

export default OrderedRule;