import React from 'react';

import { TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { withStyles } from '@material-ui/core/styles';

import $ from 'jquery';


const styles = theme => ({
    inputRoot: {
      marginBottom: 16,
      width: 200
    },
});



class KbSearch extends React.Component {

  state = {
    initialOptions: [{ "name": "hello" }, { "name": "bye" }],
    options: [],
    inputValue: ''
  }

  onInputChange = (event, inputValue, reason) => {
    console.log("setting state to input ", inputValue, reason);

    if(reason == "input"){
      this.setState({inputValue});

      $.ajax({
        url: '/api/search-kb',
        type: 'GET',
        data: {
          "input": inputValue,
          "project_name": this.props.projectName
        },
        success: function (data) {
          const options = $.parseJSON(data);
          this.setState({ options });
        }.bind(this),
        error: function (error) {
          console.log("Error in call to server")
        }.bind(this)
      });
    }
  };

  addSuggestion = (event, input, reason) => {
    if(reason == "select-option"){
      this.props.addSuggestion(input);
      this.setState( {inputValue: ''});
    }
  }

  render() {
    const { classes } = this.props;

    return (
      <Autocomplete
        classes={{ inputRoot: classes.inputRoot }}
        options={this.state.options}
        getOptionLabel={option => option.name}
        onChange={this.addSuggestion}
        renderInput={params => <TextField
                                  {...params}
                                  label={""}
                                  required={false}
                               />
        }
        onInputChange={this.onInputChange}
        getOptionSelected={(value, option) => value.name == option.name}
        autoSelect={true}
        inputValue={this.state.inputValue}
        disableClearable={true}
      />
    )
  };
};

export default withStyles(styles)(KbSearch);
