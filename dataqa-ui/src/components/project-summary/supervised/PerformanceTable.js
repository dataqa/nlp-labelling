import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';


const useStyles = makeStyles({
    tablecell: {
        fontSize: '80%'
    }
  });

const StyledTableCell = (props) => {
    const classes = useStyles();
    return (
        <TableCell 
            align={props.align}
            className={classes.tablecell}
            component={props.component}
            scope={props.scope}
            align='center'
        >
            {props.content}
        </TableCell>
    )
}

const RuleTableHead = (props) => (
    <TableHead>
        <TableRow className={props.classes.table}>
            <StyledTableCell content={"Predicted class"}/>
            <StyledTableCell align="right" content="Precision"/>
        </TableRow>
    </TableHead>
)

const RuleTableRow = (props) => {
    return (
        <TableRow className={props.classes.table}>
            <StyledTableCell content={props.header}/>
            <StyledTableCell 
                align="right" 
                content={props.precisionString}
            />
        </TableRow>
)}

const NumberToString = (number) => {
    return `${(number * 100).toFixed(1)}`;
}

const PerformanceTable = (props) => {

    const modelClasses = props.docs.classes;

    return (

        <div>
            <Typography>
                Estimate of performance based on your rules and manual labels. To get more estimates, you need to label more.
            </Typography>
            <br/>
            <TableContainer component={Paper}>
                <Table aria-label="performance table">
                    <RuleTableHead classes={props.classes}/>
                    <TableBody>
                        {modelClasses.map((row, index) => { 
                            if(row.estimatedPrecision){
                                let precisionString = NumberToString(row.estimatedPrecision) + "%";
                                let recallString = NumberToString(row.estimatedRecall) + "%";

                                let groundTruthPrecision, groundTruthRecall;
                                if(row.groundTruthPrecision){
                                    groundTruthPrecision = ` (true: ${NumberToString(row.groundTruthPrecision)}%)`;
                                    groundTruthRecall = ` (true: ${NumberToString(row.groundTruthRecall)}%)`
                                }

                                if(row.estimatedPrecisionLowerBound){
                                    precisionString += ` (${NumberToString(row.estimatedPrecisionLowerBound)} - ${NumberToString(row.estimatedPrecisionUpperBound)})` + (groundTruthPrecision || "");
                                }else{
                                    precisionString += (groundTruthPrecision || "");
                                }

                                if(row.estimatedRecallLowerBound){
                                    recallString += ` (${NumberToString(row.estimatedRecallLowerBound)} - ${NumberToString(row.estimatedRecallUpperBound)})` + (groundTruthRecall || "");
                                }
                                else{
                                    recallString += (groundTruthRecall || "")
                                }

                                return (
                                    <RuleTableRow 
                                        key={`predicted-label-${index}`}
                                        header={`${row.name}`}
                                        classes={props.classes}
                                        precisionString={precisionString}
                                        recallString={recallString}
                                    />
                                )
                            }
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    )
}

export default PerformanceTable;