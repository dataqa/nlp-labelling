
function buildFrom(current, resultsPerPage) {
  if (!current || !resultsPerPage) return;
  return (current - 1) * resultsPerPage;
}

function buildMatch(searchTerm) {
  return searchTerm
    ? {
      multi_match: {
        query: searchTerm,
        fields: ["text"]
      }
    }
    : { match_all: {} };
}


function buildRuleFilter(appliedRuleFilters) {
  return appliedRuleFilters.map((rule) => {
    return ({
      "nested": {
        "path": "rules",
        "query": {
          "bool": {
            "must": [
              {
                "match": {
                  "rules.rule_id": rule.id
                }
              }
            ]
          }
        }
      }
    })
  })
}

function buildTableFilter() {
  return {
    "match": {
      "is_table": {
        "query": "true"
      }
    }
  }
}

function buildFilters(appliedRuleFilters, filterTables){
  let ruleFilters = buildRuleFilter(appliedRuleFilters);
  if(filterTables){
    return ruleFilters.concat(buildTableFilter())
  }
  return ruleFilters;
}

/*
  Converts current application state to an Elasticsearch request.
  When implementing an onSearch Handler in Search UI, the handler needs to take the
  current state of the application and convert it to an API request.
  For instance, there is a "current" property in the application state that you receive
  in this handler. The "current" property represents the current page in pagination. This
  method converts our "current" property to Elasticsearch's "from" parameter.
  This "current" property is a "page" offset, while Elasticsearch's "from" parameter
  is a "item" offset. In other words, for a set of 100 results and a page size
  of 10, if our "current" value is "4", then the equivalent Elasticsearch "from" value
  would be "40". This method does that conversion.
  We then do similar things for searchTerm, filters, sort, etc.
*/
export default function buildRequest(state) {
  const {
    current,
    resultsPerPage,
    searchTerm,
    appliedRuleFilters,
    filterTables
  } = state;

  const match = buildMatch(searchTerm);
  const filters = buildFilters(appliedRuleFilters, filterTables);
  const size = resultsPerPage;
  const from = buildFrom(current, resultsPerPage);

  const body = {
    // Static query Configuration
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
    highlight: {
      number_of_fragments: 0,
      fields: {
        text: {}
      }
    },
    //https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-source-filtering.html#search-request-source-filtering
    _source: ["id", "text", "manual_label.*"],

    // Dynamic values based on current Search UI state
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/full-text-queries.html
    query: {
      bool: {
        must: filters.concat(match)
      }
    },
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-from-size.html
    ...(size && { size }),
    ...(from && { from })
  };

  console.log("Inside buildRequest", state, body, filters);

  return body;
}