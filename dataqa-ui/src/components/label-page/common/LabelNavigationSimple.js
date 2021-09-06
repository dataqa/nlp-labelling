import React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import $ from 'jquery';


const Container = (props) => {
    return (<Grid container 
                    spacing={2} 
                    direction="row"
                    justify="flex-start"
                    {...props}/>)
}

const Item = props => {
    return(<Grid item {...props}/>)
}

const SingleLabel = (props) => {
    if(props.selected){
        return (
            <Button 
                onClick={props.addLabel}
                variant="outlined"
            >
                {props.className}
            </Button>
        )
    }else{
        return (
            <Button 
                onClick={props.addLabel}
            >
                {props.className}
            </Button>
        )
    }
}

class LabelNavigationSimple extends React.Component {

    updateLabel = (manual_label, doc_id) => {
        const data = new FormData();
        data.append('project_name', this.props.projectName);
        data.append('manual_label', JSON.stringify(manual_label));
        data.append('doc_id', doc_id);
        data.append('session_id', this.props.sessionId);
        console.log("Sending label ", manual_label);

        $.ajax({
            url : '/api/label-doc',
            type : 'POST',
            data : data,
            processData: false,  // tell jQuery not to process the data
            contentType: false,  // tell jQuery not to set contentType,
            success : function(data) {
                console.log(`Label modified for doc id ${doc_id}`);
            }.bind(this),
            error: function (error) {
                alert(`Error updating manual label for doc id ${doc_id}`);
            }.bind(this)
        });
    }

    addLabel = (label) => {
        this.props.updateIndexAfterLabelling({label});
        this.updateLabel(label, this.props.docId);
    }

    render() {

        return (
            <Container>
                {this.props.classnames.map((row, index) => { 
                    return (
                        <Item key={`${row.label}-${index}`}>
                            <SingleLabel 
                                addLabel={() => this.addLabel(row)}
                                className={row.name}
                                selected={this.props.label == row.label}
                            />
                        </Item>
                    )
                })}
            </Container>
        )
    }
}

export default LabelNavigationSimple;
