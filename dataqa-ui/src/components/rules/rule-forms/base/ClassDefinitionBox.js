import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';


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

const ClassDefinitionBox = (props) => {
    return (
        <div style={{padding: 16}}>
            <Container>
                {props.addText && 
                    <Item> 
                        <Typography variant="body1">Then it's most likely class:</Typography>
                    </Item>
                }
                <Item>
                    <Autocomplete
                        id={"combo-box-demo" + (props.id || '')}
                        options={props.classNames}
                        getOptionLabel={(option) => option.name}
                        onChange={props.setClass}
                        style={{ width: 300 }}
                        renderInput={(params) => <TextField {...params} />}
                        inputValue={props.inputValue}
                        onInputChange={props.onInputChange}
                        value={props.value}
                    />
                </Item>
            </Container>
        </div>
    )
}

export default ClassDefinitionBox;