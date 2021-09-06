import React from 'react';
import TextField from '@material-ui/core/TextField';


const InputField = (props) => {
    return (
        <TextField 
            name={props.name}
            onChange={props.changeInput}
            value={props.value}
            label={props.label}
        />
    )
}

export default InputField;