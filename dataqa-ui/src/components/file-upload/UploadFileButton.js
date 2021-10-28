import React from 'react';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';

export const UploadFileButton = (props) => {
    console.log("Inside UploadFileButton", props);
    if(!props.loading){
        return (
            <Button 
                variant="contained" 
                color="primary" 
                component="label"
                htmlFor={props.htmlFor}
                className={props.className}
                disabled={props.disableLoading}
                onClick={props.onClick}
            >
                {props.text || "Upload"}
            </Button> 
        )
    }else{
        return (
            <CircularProgress 
                className={props.className}
            />
        )
    }
}
