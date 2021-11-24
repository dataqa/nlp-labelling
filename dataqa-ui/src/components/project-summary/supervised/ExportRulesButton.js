import React from 'react';
import $ from 'jquery';
import Button from '@material-ui/core/Button';;
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import CircularProgress from '@material-ui/core/CircularProgress';


const styles = theme => ({
    button: {
        marginTop: "20px",
        marginLeft: "10px",
        width: "150px"
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


class ExportRulesButton extends React.Component{

    state = {loading: false}

    exportRules = (projectName) => {
        const data = new FormData();
        data.append('project_name', projectName);
        this.setState({ loading: true });

        $.ajax({
            url : '/api/export-rules',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                saveAsFile(data, `${projectName}_rules.csv`);
                this.setState({ loading: false });
            }.bind(this),
            error: function (error) {
                this.setState({ loading: false });
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
                    className={classes.button}
                    onClick={(e) => {this.exportRules(this.props.projectName)}}
                >
                    Export rules
                </Button>
            )
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

export default withStyles(styles)(ExportRulesButton);