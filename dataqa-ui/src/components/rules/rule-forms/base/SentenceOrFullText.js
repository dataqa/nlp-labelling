import React from 'react';
import OptionSelection from './OptionSelection';


const SentenceOrFullText = () => {
    return (
        <OptionSelection 
            name="sentence"
            options={[{value: 'full', text: 'in the full text'},
                    {value: 'sentence', text: 'in a sentence'}]}
        />
    )
}

export default SentenceOrFullText;