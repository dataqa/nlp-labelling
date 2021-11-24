import React from 'react';
import Highlightable from '../../../highlightable/Highlightable';
import _ from 'lodash'


class HighlightableText extends React.Component{
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

    render() {
      return (
        <Highlightable 
          ranges={this.state.currentTextSpans || []}
          entityColourMap={this.props.entityColourMap}
          entityId={this.props.currentSelectedEntityId}
          id={"myuniqueid"}
          text={this.props.content}
          enabled={true}
          onTextHighlighted={(range) => this.addTextSpan(range)}
          onDeleteRange={(range) => this.deleteTextSpan(range)}
        />
      )
    }
}

export default HighlightableText;

