import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActionArea from '@material-ui/core/CardActionArea';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import $ from 'jquery';
import { Redirect } from 'react-router-dom';
import uuid from 'react-uuid';
import CircularProgress from '@material-ui/core/CircularProgress';



const IMPORT_PARAMS = {
    totalAttempts: 16,
    timeAttemptms: 15000
}

class ImportRuleCard extends React.Component{
    state = {toProjectSummary: false,
            importingLoading: false}

    importRulesEndPoint = (selectedFile, 
                            projectName,
                            importId,
                            attemptNum, 
                            polling) => {
        const data = new FormData();
        console.log("Inside importRulesEndPoint", attemptNum, polling, selectedFile);
        data.append('file', selectedFile);
        data.append('project_name', projectName);
        data.append('polling', polling);
        data.append('import_id', importId);
        
        $.ajax({
            url : '/api/import-rules',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            timeout: 60000,
            success : function(data) {
                console.log("import rules data: ", data);
                const jsonData = JSON.parse(data);
                console.log("jsonData", jsonData);
                const importIdFromServer = jsonData.id;

                if(!importIdFromServer){
                    if(attemptNum < IMPORT_PARAMS.totalAttempts){
                        setTimeout(() => this.importRulesEndPoint(
                                                        selectedFile, 
                                                        projectName,
                                                        importId,
                                                        attemptNum+1, 
                                                        true), 
                                    IMPORT_PARAMS.timeAttemptms);
                    }
                    else{
                        alert("Server timed out");
                        this.setState( {importingLoading: false} );
                    }
                }
                else{
                    var today = new Date();
                    console.log("Rules imported successfully", today.toLocaleString());
                    this.setState( {toProjectSummary: true,
                                    importingLoading: false} );
                }
            }.bind(this),
            error: function (xmlhttprequest, textstatus, message) {
                console.log("Error", textstatus, message);
                if(textstatus==="timeout" & attemptNum < IMPORT_PARAMS.totalAttempts) {
                    setTimeout(() => this.importRulesEndPoint(
                                                    selectedFile, 
                                                    projectName,
                                                    importId,
                                                    attemptNum+1, 
                                                    true), 
                                    IMPORT_PARAMS.timeAttemptms);
                }
                else{
                    alert("Error importing rules");
                    this.setState( {importingLoading: false} );
                }
            }.bind(this)
        });

        this.setState( {importingLoading: true} );
    }

    importRules = (e, projectName) => {
        e.preventDefault;
        const selectedFile = e.target.files[0];
        if(!selectedFile){
            alert("Need to select file!");
        }else{
            this.importRulesEndPoint(selectedFile, 
                                    projectName,
                                    uuid(),
                                    0, 
                                    false);
        }
        e.target.value = null;
    }

    render() {

        if(this.state.toProjectSummary === true) {
            return <Redirect to={{pathname: `/projects/${this.props.projectNameSlug}`}}/>
        }

        return(
            <Card className={this.props.classes.card}>
                <form encType="multipart/form-data;" acceptCharset="utf-8">
                    <input
                        accept=".csv"
                        style={{ display: 'none' }}
                        id="contained-button-file"
                        type="file"
                        onChange={(e) => this.importRules(e, this.props.projectName)}
                    />
                    <CardActionArea 
                        htmlFor="contained-button-file" 
                        component="label"
                    >
                        <CardContent>
                            <Typography variant="h6">Import rules</Typography>
                            <br/>
                            {this.state.importingLoading? 
                                <CircularProgress/>
                            :
                                <Typography variant="body1">Load a file with rules.</Typography>
                            }
                        </CardContent>
                    </CardActionArea>
                </form> 
            </Card>
        )
    }
}

export default ImportRuleCard;