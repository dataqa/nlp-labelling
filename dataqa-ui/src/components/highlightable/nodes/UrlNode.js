import React from 'react';
import PropTypes from 'prop-types';

import Node from './Node';

const UrlNode = props => {
  const style = {wordWrap: 'break-word'};

  return <Node id={props.id}
    highlightStyle={Object.assign({}, style, props.highlightStyle)}
    charIndex={props.charIndex}
    range={props.range}
    style={style}>
    <a data-position={(props.charIndex + props.url.length)}
      href={props.url}
      target="blank">
      {props.url}
    </a>
  </Node>;
};

UrlNode.propTypes = {
  highlightStyle: PropTypes.object,
  id: PropTypes.string,
  charIndex: PropTypes.number,
  range: PropTypes.object,
  url: PropTypes.string
};

export default UrlNode;