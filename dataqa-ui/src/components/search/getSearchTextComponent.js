import React from "react";
import Typography from '@material-ui/core/Typography';
import HighlightableText from '../label-page/supervised/ner/HighlightableText';
import { DEFAULT_TEXT_COLUMN, PROJECT_TYPES } from '../constants';


function getSearchTextComponent(fieldName,
                                fieldValue, 
                                projectType, 
                                classNames,
                                currentSelectedEntityId,
                                currentDisplayedLabels,
                                addTextSpan, 
                                deleteTextSpan) {
    if(projectType==PROJECT_TYPES.classification){
        return (
                <span
                    className="sui-result__value"
                    dangerouslySetInnerHTML={{ __html: fieldValue }}
                />
        )
    }

    if(projectType==PROJECT_TYPES.ner){

        if(fieldName == DEFAULT_TEXT_COLUMN){
            const entityColourMap = classNames.reduce(function(obj, itm) {
                obj[itm['id']] = itm['colour'];
        
                return obj;
            }, {});
    
            const content = fieldValue.replace(/<em>/g, '').replace(/<\/em>/g, '');
            return (
                <Typography component={'span'}>
                    <HighlightableText 
                        content={content}
                        currentSelectedEntityId={currentSelectedEntityId}
                        currentTextSpans={currentDisplayedLabels}
                        addTextSpan={addTextSpan}
                        deleteTextSpan={deleteTextSpan}
                        entityColourMap={entityColourMap}
                    />
                </Typography>
            )
        }else{
            return (
                <span
                    className="sui-result__value"
                    dangerouslySetInnerHTML={{ __html: fieldValue }}
                />
            )
        }


        
    }
}

export default getSearchTextComponent;