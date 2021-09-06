import React from 'react';
import OptionSelection from './OptionSelection';


const ContainOrDoesNotContain = () => {
    return (
        <OptionSelection 
            name="contain"
            options={[{value: 'contains', text: 'contains'},
                    {value: 'does not contain', text: 'does not contain'}]}
        />
    )
}

export default ContainOrDoesNotContain