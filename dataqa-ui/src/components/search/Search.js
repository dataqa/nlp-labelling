import React from "react";

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

const Container = (props) => {
  return (<Grid container 
                  spacing={2} 
                  direction="column"
                  {...props}/>)
}

const Item = props => {
  return(<Grid item {...props}/>)
}

const styles = theme => ({
  main_container: {display: 'flex'},
  search_container: {margin: '10px'},
  searchbox: {flexShrink: '0'}
});

const config = (props) => ({
  debug: true,
  hasA11yNotifications: true,
  onResultClick: () => {
    /* Not implemented */
  },
  onAutocompleteResultClick: () => {
    /* Not implemented */
  },
  onAutocomplete: async ({ searchTerm }) => {
    const requestBody = buildRequest({ searchTerm });
    const json = await runRequest(props.projectName, requestBody);
    const state = buildState(json);
    return {
      autocompletedResults: state.results
    };
  }
});

const Search = (props) => {
  const { classes } = props;
  const searchConfig = config(props.projectName);
  console.log(searchConfig);

  const sessionId = uuid();


  const functionCreator = (projectName) => {
    const onSearch = async (state) => {
      const { resultsPerPage } = state;
      const requestBody = buildRequest(state);
      // Note that this could be optimized by running all of these requests
      // at the same time. Kept simple here for clarity.
      console.log("requestBody", requestBody);
      const responseJson = await runRequest(projectName, requestBody);
      return buildState(responseJson, resultsPerPage);
    }
    return onSearch
  }

  searchConfig['onSearch'] = functionCreator(props.projectName);
  const enableLabelling = true;

  return (
    <div className={classes.main_container}>
      <SideBar
          projectNameSlug={props.projectNameSlug}
          projectName={props.projectName}
          projectType={props.projectType}
      />
      <SearchProvider config={searchConfig}>
        <WithSearch mapContextToProps={({ wasSearched, results }) => ({ wasSearched, results })}>
          {({ wasSearched, results }) => {
            return (
              <ErrorBoundary>
                <Container className={classes.search_container}>
                    <Item className={classes.searchbox}>
                      <SearchBox/>
                    </Item>
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
                            projectName={props.projectName}
                            classNames={props.classNames}
                            key={result.id.raw}
                            result={result}
                            sessionId={sessionId}
                            enableLabelling={enableLabelling}
                            projectType={props.projectType}
                          />
                        ))}
                      </div>
                    </Item>
                    <Grid container justify="center">
                      <Paging />
                    </Grid>
                  </Container>
              </ErrorBoundary>
          )}}
        </WithSearch>
      </SearchProvider>
    </div>
  );
};

export default withStyles(styles)(Search);