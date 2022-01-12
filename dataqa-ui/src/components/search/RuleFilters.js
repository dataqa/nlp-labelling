import React from "react";
import Chip from '@material-ui/core/Chip';
import { withStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import * as colors from '@material-ui/core/colors';


const MAX_FILTERS_DISPLAYED_UNDERNEATH = 5; // needs to be lower than MAX_APPLIED_FILTERS in the Search component

const styles = theme => ({
    main_container: {
        marginLeft: 10,
        display: 'flex'
    },
    chip: {
        margin: 5,
        color: 'white'
    },
    form: {
        minWidth: 120,
        marginLeft: 5
    }
});


const RuleFilters = (props) => {
    const { classes, ...rest } = props;

    return (
        (props.rules.length + props.hasTables) > 0 &&
        <div className={classes.main_container}>
            {props.withText && <p>{"Filters:"}</p>}
            {props.hasTables && !props.filterTables && <Chip
                    disabled={props.disabled}
                    className={classes.chip}
                    color="primary"
                    label={"is table"}
                    onClick={props.addFilterTable}
                    onDelete={props.removeFilterTable}
                />}
            {props.rules.filter((item, index) => index < MAX_FILTERS_DISPLAYED_UNDERNEATH)
                .map((x, ind) => <Chip
                    disabled={props.disabled}
                    key={`rule-chip-${ind}`}
                    className={classes.chip}
                    label={`rule "${x.name}"`}
                    style={{ backgroundColor: colors[x.colour][500] }}
                    onClick={props.addAppliedRuleFilter && (() => props.addAppliedRuleFilter(x['id']))}
                    onDelete={props.removeAppliedRuleFilter && (() => props.removeAppliedRuleFilter(x['id']))}
                />)}

            {props.rules.length > MAX_FILTERS_DISPLAYED_UNDERNEATH &&
                <FormControl className={classes.form}>
                    <InputLabel shrink={false}>More</InputLabel>
                    <Select
                        value={""}
                        onChange={props.addAppliedRuleFilter && ((event) => props.addAppliedRuleFilter(event.target.value))}
                    >
                        {props.rules.filter((item, index) => index >= MAX_FILTERS_DISPLAYED_UNDERNEATH)
                            .map((x, ind) => <MenuItem
                                value={x.id}
                                key={`extra-rule-chip-${ind}`}
                            >
                                {x.name}
                            </MenuItem>)}
                    </Select>
                </FormControl>
            }
        </div>

    );
}

export default withStyles(styles)(RuleFilters);