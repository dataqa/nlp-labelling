import React from 'react';
import ReactDOM from 'react-dom';
import AppRouter from './routers/AppRouter';
import 'normalize.css/normalize.css';
// import './styles/styles.scss';
// import theme from './styles/theme';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';

import Router from './playground/Router';
import AwesomeComponent from './playground/SpinningWheel';

// import FileDownload from './components/project-summary/FileDownloadButton';
import Search from './components/search/Search';
import WelcomePage from './components/welcome-page/WelcomePage';
import RegexRule from './components/rules/rule-forms/ner-rules/RegexRule';
import NounChunkRule from './components/rules/rule-forms/ner-rules/NounPhraseRule';

import ProjectParamsPage from './components/set-project-params/ProjectParamsPage';


ReactDOM.render(
      <React.Fragment>
        <CssBaseline />
        <AppRouter />
      </React.Fragment>,
    document.getElementById('app'),
  );

// ReactDOM.render(<ProjectParamsPage 
//                   projectType={"classification"}
//                   projectName={"something"}
//                   setProjectParams={(x) => console.log(x)} 
//                 />, document.getElementById('app'))


// ReactDOM.render(<FileDownload projectName={"fake health news"}/>, document.getElementById('app'));

// ReactDOM.render(<SentimentRule />, document.getElementById('app'))

// ReactDOM.render(<AwesomeComponent />, document.getElementById('app'))
// ReactDOM.render(<Router />, document.getElementById('app'))

// ReactDOM.render(<App index={0}/>, document.getElementById('app'));
// ReactDOM.render(<WelcomeMain/>, document.getElementById('app'));
// ReactDOM.render(<NameSelector/>, document.getElementById('app'));
// ReactDOM.render(<RuleMain/>, document.getElementById('app'));

// ReactDOM.render(<ExactMatchRule
//                     positiveClassName="covid"
//                     negativeClassName="no covid"
//                 />, 
//                 document.getElementById('app'));

// ReactDOM.render(<ProjecMain />, document.getElementById('app'));
// ReactDOM.render(<Projects />, document.getElementById('app'));
