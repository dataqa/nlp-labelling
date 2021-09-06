import React from 'react';


const OptionSelection = (props) => {
    return (
        <div>
            {
                props.options.map((option, index) => (
                    <div key={option.value}>
                        <input type="radio" 
                                id={option.value}
                                name={props.name}
                                value={option.value}
                                defaultChecked={index == 0}
                        />
                        <label htmlFor={option.value}>{option.text}</label>
                    </div>
                ))
            }
        </div>
    )
}

export default OptionSelection;