export function getSlug(projectName) {
    return encodeURIComponent(projectName);
};

export function trimString(longString, maxLength){
    let displayedName = longString.trim();
    if(longString.length > maxLength){
        let lastSpace = -1;
        for(let textCharIndex = 0; textCharIndex < maxLength; textCharIndex++) {
            const currentChar = longString[textCharIndex];
            if(currentChar == ' '){
                lastSpace = textCharIndex;
            }
        }
        if((lastSpace > -1)){
            displayedName = displayedName.substring(0, lastSpace) + '...';
        }
        else{
            displayedName = displayedName.substring(0, maxLength).trim() + '...';
        }
    }
    return displayedName;
}