import React from 'react';

const TypeSelector = (props) => {
    return (
        <select name="type-word" value={props.value} onChange={props.setType}>
            <option value="exact case-insensitive">Exact match case-insensitive</option>
            <option value="exact case-sensitive">Exact match case-sensitive</option>
            <option value="token case-insensitive">Token match case-insensitive</option>
            <option value="token case-sensitive">Token match case-sensitive</option>
            <option value="entity person">Named entity: PERSON</option>
            <option value="entity norp">Named entity: NOPR</option>
            <option value="entity org">Named entity: ORG</option>
            <option value="entity gpe">Named entity: GPE</option>
            <option value="entity date">Named entity: DATE</option>
            <option value="entity time">Named entity: TIME</option>
            <option value="entity money">Named entity: MONEY</option>
            <option value="entity quantity">Named entity: QUANTITY</option>
            <option value="lemma">Stemmed word</option>
        </select>
    )
}

export default TypeSelector;