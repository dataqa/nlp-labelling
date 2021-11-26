import React from 'react';
import RuleTable from './RuleTable';
import LabelTable from './LabelTable';
import PerformanceTable from './PerformanceTable';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import CircularProgress from '@material-ui/core/CircularProgress';


class ProjectDataDrawers extends React.Component{ 

    state = {
        tab: 0
    }

    setTabValue = (e, value) => {
        this.setState({tab: value});
    }

    render(){
        if(!this.props.loading){
            return (
                <div className={this.props.classes.project_content}>
                    <AppBar position="static">
                        <Tabs value={this.state.tab} onChange={this.setTabValue}>
                            <Tab label="Rules" />
                            <Tab label="Manual labels" />
                            <Tab label="Estimated performance" />
                        </Tabs>
                    </AppBar>
                    <div className={this.props.classes.offset} style={{minHeight: '30px'}} />
                    {this.state.tab == 0 && 
                        <RuleTable 
                            rules={this.props.rules}
                            docs={this.props.docs}
                            projectType={this.props.projectType}
                            deleteRule={this.props.deleteRule}
                            exploreRule={this.props.exploreRule}
                            disableDeletingRules={this.props.disableDeletingRules}
                            classes={this.props.classes}
                        />
                    }
                    {this.state.tab == 1 && 
                        <LabelTable 
                            docs={this.props.docs}
                            projectType={this.props.projectType}
                            classNames={this.props.classNames}
                            exploreLabelled={this.props.exploreLabelled}
                            classes={this.props.classes}
                        />
                    }
                    {this.state.tab == 2 &&
                        <PerformanceTable
                            docs={this.props.docs}
                            projectType={this.props.projectType}
                            classes={this.props.classes}
                        />
                    }                     
                </div>
            )
        }
        else{
            return (
                <div className={this.props.classes.progress}>
                    <CircularProgress/>
                </div>
            )
        }
    }
}

export default ProjectDataDrawers;