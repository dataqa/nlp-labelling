import React from 'react';
import $ from 'jquery';
import Button from '@material-ui/core/Button';;
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { PROJECT_TYPES } from '../../constants';


const styles = theme => ({
    button: {
        marginTop: "20px",
        width: "180px"
    },
    container: {
        width: "180px",
        maxWidth: "180px",
        display: "inline-block"
    }
  });

function saveAsFile(text, filename) {
    // Step 1: Create the blob object with the text you received
    const type = 'application/text'; // modify or get it from response
    const blob = new Blob([text], {type});
  
    // Step 2: Create Blob Object URL for that blob
    const url = URL.createObjectURL(blob);
  
    // Step 3: Trigger downloading the object using that URL
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click(); // triggering it manually
  }


class FileDownloadButton extends React.Component{

    state = {loading: false}

    downloadLabels = (projectName) => {
        const data = new FormData();
        data.append('project_name', projectName);
        this.setState({ loading: true });

        $.ajax({
            url : '/api/export-labels',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                saveAsFile(data, `${projectName}_labels.csv`);
                this.setState({ loading: false });
            }.bind(this),
            error: function (error) {
                alert(error);
            }
        });
    }

    render() {
        const { classes } = this.props;

        if(!this.state.loading){
            return (
                <Button 
                    variant="contained" 
                    color="primary"
                    onClick={(e) => {this.downloadLabels(this.props.projectName)}}
                    className={classes.button}
                >
                    {this.props.projectType == PROJECT_TYPES.classification? 
                    'Download labels': 'Download spans'}
                </Button>)
        }
        else{
            return (
                <Container className={classes.container}>
                    <CircularProgress 
                        className={classes.button}
                    />
                </Container>
            ) 
        }
    }
};

export default withStyles(styles)(FileDownloadButton);