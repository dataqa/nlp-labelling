import React from "react";
import RuleFilters from './RuleFilters';
import { Input } from '@material-ui/core';
import _ from 'lodash';


import {
  ErrorBoundary,
  SearchProvider,
  WithSearch,
  SearchBox,
  PagingInfo,
  ResultsPerPage,
  Paging
} from "@elastic/react-search-ui";
import "@elastic/react-search-ui-views/lib/styles/styles.css";
import Grid from '@material-ui/core/Grid';
import SideBar from '../SideBar';
import { withStyles } from '@material-ui/core/styles';

import buildRequest from "./buildRequest";
import runRequest from "./runRequest";
import buildState from "./buildState";
import ResultWithLabels from "./ResultwithLabels";

import uuid from 'react-uuid';


const MAX_APPLIED_FILTERS = 3;

const Container = (props) => {
  return (<Grid container
    spacing={2}
    direction="column"
    {...props} />)
}

const Item = props => {
  return (<Grid item {...props} />)
}

const styles = theme => ({
  main_container: { display: 'flex' },
  search_container: { margin: '10px' },
  searchbox: { flexShrink: '0' }
});

const config = (projectName, appliedRuleFilters, filterTables) => ({
  debug: true,
  hasA11yNotifications: true,
  onResultClick: () => {
    /* Not implemented */
  },
  onAutocompleteResultClick: () => {
    /* Not implemented */
  },
  onAutocomplete: async ({ searchTerm }) => {
    const requestBody = buildRequest({ searchTerm, appliedRuleFilters, filterTables });
    const json = await runRequest(projectName, requestBody);
    const state = buildState(json);
    return {
      autocompletedResults: state.results
    };
  }
});


const onSearch = async (projectName, appliedRuleFilters, filterTables, state) => {
  console.log("Inside onSearch", projectName);
  const { resultsPerPage } = state;
  const requestBody = buildRequest({ ...state, appliedRuleFilters, filterTables });
  // Note that this could be optimized by running all of these requests
  // at the same time. Kept simple here for clarity.
  console.log("requestBody", requestBody);
  const responseJson = await runRequest(projectName, requestBody);
  return buildState(responseJson, resultsPerPage);
}



function SearchInput({ getAutocomplete, getButtonProps, getInputProps, appliedFilters }) {
  return (
    <>
      <div className="sui-search-box__wrapper">
        <Input
          {...getInputProps()}
          startAdornment={appliedFilters}
        />
        {getAutocomplete()}
      </div>
      <input {...getButtonProps()} />
    </>
  );
}

class Search extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      appliedRuleFilters: [],
      rules: props.rules,
      filterTables: false
    };
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.rules.length != this.props.rules.length) {
      this.setState({ rules: this.props.rules });
    }
  }

  setFilterTables = (flag) => {
    this.setState({ filterTables: flag });
  }

  addAppliedRuleFilter = (ruleId) => {
    console.log(ruleId);
    this.setState((prevState) => {
      const newRules = prevState.rules.filter((rule) => rule.id != ruleId);
      const newlyAppliedRuleFilter = prevState.rules.filter((rule) => rule.id == ruleId);

      return {
        appliedRuleFilters: prevState.appliedRuleFilters.concat(newlyAppliedRuleFilter),
        rules: newRules
      }
    });
  }

  removeAppliedRuleFilter = (ruleId) => {
    console.log(ruleId);
    this.setState((prevState) => {
      const removedFilter = prevState.appliedRuleFilters.filter((rule) => rule.id == ruleId);
      const newAppliedRuleFilters = prevState.appliedRuleFilters.filter((rule) => rule.id != ruleId);
      let newRules = prevState.rules.concat(removedFilter);
      newRules = _.orderBy(newRules, ['id']);

      return {
        appliedRuleFilters: newAppliedRuleFilters,
        rules: newRules
      }
    });
  }

  render = () => {
    console.log("Inside Search render ", this.props, this.state);
    const { classes } = this.props;

    const sessionId = uuid();
    const enableLabelling = true;

    const searchConfig = config(this.props.projectName, this.state.appliedRuleFilters, this.state.filterTables);

    searchConfig['onSearch'] = (state) => onSearch(this.props.projectName,
      this.state.appliedRuleFilters,
      this.state.filterTables,
      state);

    return (
      <div className={classes.main_container}>
        <SideBar
          projectNameSlug={this.props.projectNameSlug}
          projectName={this.props.projectName}
          projectType={this.props.projectType}
        />
        <SearchProvider config={searchConfig}>
          <WithSearch mapContextToProps={({ wasSearched, results }) => ({ wasSearched, results })}>
            {({ wasSearched, results }) => {
              return (
                <ErrorBoundary>
                  <Container className={classes.search_container}>
                    <Item className={classes.searchbox}>
                      <SearchBox
                        inputView={({ getAutocomplete, getButtonProps, getInputProps }) => SearchInput({
                          getAutocomplete, getButtonProps, getInputProps, appliedFilters: <RuleFilters
                            rules={this.state.appliedRuleFilters}
                            wikiData={this.props.wikiData}
                            filterTables={!this.state.filterTables}
                            addFilterTable={(() => this.setFilterTables(true))}
                            removeFilterTable={(() => this.setFilterTables(false))}
                            removeAppliedRuleFilter={this.removeAppliedRuleFilter}
                          />
                        })}
                      />
                    </Item>
                    <RuleFilters
                      rules={this.state.rules}
                      wikiData={this.props.wikiData}
                      filterTables={this.state.filterTables}
                      addFilterTable={(() => this.setFilterTables(true))}
                      disabled={(this.state.appliedRuleFilters.length + this.state.filterTables) >= MAX_APPLIED_FILTERS}
                      addAppliedRuleFilter={this.state.appliedRuleFilters.length < MAX_APPLIED_FILTERS ? this.addAppliedRuleFilter : undefined}
                      withText={true}
                    />
                    <Item>
                      <Grid container direction="row" justify="space-between">
                        <Item>{wasSearched && <PagingInfo />}</Item>
                        <Item>{wasSearched && <ResultsPerPage />}</Item>
                      </Grid>
                    </Item>
                    <Item>
                      <div>
                        {results.map(result => (
                          <ResultWithLabels
                            projectName={this.props.projectName}
                            classNames={this.props.classNames}
                            key={result.id.raw}
                            result={result}
                            sessionId={sessionId}
                            enableLabelling={enableLabelling}
                            projectType={this.props.projectType}
                          />
                        ))}
                      </div>
                    </Item>
                    <Grid container justify="center">
                      <Paging />
                    </Grid>
                  </Container>
                </ErrorBoundary>
              )
            }}
          </WithSearch>
        </SearchProvider>
      </div>
    );

  }
}


export default withStyles(styles)(Search);