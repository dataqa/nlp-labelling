import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { withStyles } from '@material-ui/core/styles';
import Highlightable from '../../../highlightable/Highlightable';
import _ from 'lodash'


const styles = theme => ({
    root: {
        width: '80%',
        minHeight: '200px',
        padding: theme.spacing(1),
        margin: theme.spacing(5)
      }});

class HighlightableTable extends React.Component{
    state = {
        currentTextSpans: this.props.currentTextSpans
    };

    compareSpan = (span1, span2) => {
        return (span1.start == span2.start) && (span1.end == span2.end);
    }

    compareSpans = (x, y) => {
        if(x.length !== y.length){
            return false;
        }
    
        const difference = _.differenceWith(x, y, this.compareSpan);
        console.log("Comparing spans", x, y, difference);
        return difference === undefined || difference.length==0;
    };

    componentDidUpdate(prevProps){
        if(!this.compareSpans(prevProps.currentTextSpans, this.props.currentTextSpans)) {
            console.log("props at TextNER have changed");
            this.setState({currentTextSpans: this.props.currentTextSpans});
        }
    }

    setTextSpans = (range) => {
        this.props.setTextSpans(range)
    }

    addTextSpan(range){
        if(this.props.currentSelectedEntityId === undefined){
            alert("Need to select entity.");
            return;
        }
        range["entityId"] = this.props.currentSelectedEntityId;
        this.props.addTextSpan(range);
    }

    deleteTextSpan(rangeToDelete){
        this.props.deleteTextSpan(rangeToDelete);
    }

    render(){
        const { classes, ...rest } = this.props;
        console.log("Style is ", classes);
        return (
            <TableContainer component={Paper} className={classes.root}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {this.props.content.columnNames.map((row, index) => (
                                <TableCell key={`${index}-column-name`}>{row}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>                    
                        {this.props.content.rows.map((row, index) => (
                            <TableRow key={`${index}-row-wiki-table`}>
                            {Object.entries(row).map((singleRow, singleRowIndex) => (
                                <TableCell key={`${singleRow[0]}-cell-wiki-table`}>
                                    <Highlightable 
                                        startChar={this.props.content.charStarts[index][singleRow[0]]}
                                        ranges={this.state.currentTextSpans || []}
                                        entityColourMap={this.props.entityColourMap}
                                        entityId={this.props.currentSelectedEntityId}
                                        id={"myuniqueid"}
                                        text={singleRow[1]}
                                        enabled={true}
                                        onTextHighlighted={(range) => this.addTextSpan(range)}
                                        onDeleteRange={(range) => this.deleteTextSpan(range)}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
          );
    }
}

export default withStyles(styles)(HighlightableTable);