import React from 'react';
import PropTypes from 'prop-types';

import Node from './Node';

const EmojiNode = props => {

  return <Node id={props.id}
    highlightStyle={props.highlightStyle}
    charIndex={props.charIndex}
    range={props.range}>
    {`${props.text[props.charIndex]}${props.text[props.charIndex + 1]}`}
  </Node>;
};

EmojiNode.propTypes = {
  highlightStyle: PropTypes.object,
  id: PropTypes.string,
  charIndex: PropTypes.number,
  range: PropTypes.object,
  text: PropTypes.string,
  children: PropTypes.node
};

export default EmojiNode;