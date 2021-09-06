import React from 'react';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';


const RuleSubmitButton = (props) => {
    if(!props.loading){
        return (
            <Button 
                variant="contained" 
                color="primary" 
                type="submit"
            >
                Create rule
            </Button>
        )
    }else{
        return (
            <CircularProgress/>
        )
    }
}

export default RuleSubmitButton;