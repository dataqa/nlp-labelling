import React from 'react';

import { TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { withStyles } from '@material-ui/core/styles';

import $ from 'jquery';
import _ from 'lodash';


const styles = theme => ({
    inputRoot: {
      marginBottom: 16,
      width: 200
    },
});



class KbSearch extends React.Component {

  state = {
    options: [],
    inputValue: '',
    value: null
  }

  componentDidMount = () => {
    this.onInputChange({}, '', 'input');
  }

  componentDidUpdate = (prevProps, prevState) => {
    const prevDisplayedKbs = new Set(prevProps.displayedKbs.map((x, ind) => x.label));
    const newDisplayedKbs = new Set(this.props.displayedKbs.map((x, ind) => x.label));
    if(!_.isEqual(prevDisplayedKbs, newDisplayedKbs)){
      this.onInputChange({}, '', 'input');
    }
  }

  removeDisplayedKbsfromOptions = (displayedKbs, options) => {
    const kbIds = displayedKbs.map((x) => x.label);

    // need to filter out the kbs that are already displayed
    const displayedOptions = options.filter(x => !kbIds.includes(x.id))

    return displayedOptions;
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
          const displayedOptions = this.removeDisplayedKbsfromOptions(this.props.displayedKbs,
            options);

          this.setState({ options: displayedOptions });
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
      const displayedOptions = this.state.options.filter(x => x.id != input.id);

      this.setState( {inputValue: '',
                      selectedValue: null,
                      options: displayedOptions});
    }
    if(reason == 'clear'){
        this.setState( {inputValue: ''} );
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
        value={this.state.value}
      />
    )
  };
};

export default withStyles(styles)(KbSearch);
