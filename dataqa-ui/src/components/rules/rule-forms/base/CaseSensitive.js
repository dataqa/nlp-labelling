import React from 'react';
import OptionSelection from './OptionSelection';


const CaseSensitive = () => {
    return (
        <OptionSelection 
            name="case"
            options={[{value: 'case-sensitive', text: 'is case-sensitive'},
                    {value: 'case-insensitive', text: 'is not case-sensitive'}]}
        />
    )
}

export default CaseSensitive;