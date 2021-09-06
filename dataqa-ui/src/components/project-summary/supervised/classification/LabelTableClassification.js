import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import TouchAppIcon from '@material-ui/icons/TouchApp';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';


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
        >
        {props.content}
        </TableCell>
    )
}

const RuleTableHead = (props) => (
    <TableHead>
        <TableRow className={props.classes.table}>
            <StyledTableCell content={"Manual label"}/>
            <StyledTableCell align="right" content="Total documents"/>
        </TableRow>
    </TableHead>
)

const ExploreButton = (props) => (
    <Tooltip title="Label">
        <IconButton aria-label="explore-label" onClick={(e) => props.exploreLabelled(e, props.label)} name="explore-label-button">
            <TouchAppIcon name="explore-label-icon"/>
        </IconButton>
    </Tooltip>
)

const RuleTableRow = (props) => {
    return (
        <TableRow className={props.classes.table}>
            <StyledTableCell content={props.header}/>
            <StyledTableCell 
                align="right" 
                content={props.total}
            />
            <StyledTableCell 
                align="right" 
                content={props.exploreLabelled && <ExploreButton 
                            exploreLabelled={props.exploreLabelled}
                            label={props.label}
                        />}
            />
        </TableRow>
)}

const LabelTableClassification = (props) => {
    console.log("Inside document summary", props);

    return ( 
        <div>
            <TableContainer component={Paper}>
                <Table aria-label="label table">
                    <RuleTableHead classes={props.classes}/>
                    <TableBody>
                        {props.modelClasses.map((row, index) => { 
                            return (
                                <RuleTableRow 
                                    header={`${row.name}`}
                                    total={row.totalManualDocs}
                                    exploreLabelled={props.exploreLabelled}
                                    label={row.id}
                                    classes={props.classes}
                                    key={`label-${row.name}-${row.index}`}
                                />
                            )
                        })}

                        <RuleTableRow 
                            header="Unlabelled"
                            total={props.totalDocuments - props.totalManualDocs}
                            exploreLabelled={props.exploreLabelled}
                            label="none"
                            classes={props.classes}
                        />
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    )
}

export default LabelTableClassification;