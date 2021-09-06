import React from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import SideBar from '../SideBar';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import { UploadFileButton } from '../file-upload/SingleFileUploadForm';


const styles = theme => ({
    container: {display: 'flex'}
  });

class ClassNames extends React.Component{

    state = {
        toRules: false,
        loading: false
    };

    submitClassNames = (event) => {
        event.preventDefault();

        console.log('Inside submitClassNames');
        const selectedFile = event.target.files[0];

        if(!selectedFile){
            alert("Need to select file!");
        }

        if(!this.props.projectName){
            alert('Do not know what project this is.')
        }

        const data = new FormData();
        data.append('project_name', this.props.projectName);
        data.append('file', selectedFile);

        $.ajax({
            url : '/api/classnames',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                this.setState({ loading: false });
                const jsonData = JSON.parse(data);
                if(jsonData){
                    console.log("Classes set correctly to: ", jsonData);

                    this.setState( {toRules: true} );
                    this.props.setProjectParams(jsonData);
                }
            }.bind(this),
            error: function (error) {
                this.setState({ loading: false });
                alert(error);
            }.bind(this)
        });

        this.setState({ loading: true });
        
    }

    render() {
        const { classes } = this.props;

        if(this.state.toRules === true) {
            return <Redirect to={{pathname: "/rules"}}/>
        }

        return (
            <div className={classes.container}>
                <SideBar/>
                <Container>
                    <Box my={2}>
                        <Typography variant="h6">Upload a csv file with the class names.</Typography>
                    </Box>
                    <form encType="multipart/form-data;" acceptCharset="utf-8">
                        <input
                            accept=".csv"
                            style={{ display: 'none' }}
                            id="contained-button-file"
                            type="file"
                            onChange={this.submitClassNames}
                        />
                        <UploadFileButton 
                            htmlFor="contained-button-file"
                            loading={this.state.loading}
                            className={classes.button}
                        />
                    </form>
                </Container>
            </div>
        )
    }
}

export default withStyles(styles)(ClassNames);