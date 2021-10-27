const PROJECT_TYPES = { classification: "classification", 
                        ner: "ner",
                        entity_disambiguation: "entity_disambiguation"};
    
const DOCS_MENTIONS_FILE_FORMAT = "https://dataqa.ai";
const DOCS_KB_FILE_FORMAT = "https://dataqa.ai";

const FILE_TYPE_DOCUMENTS = "documents";
const FILE_TYPE_KB = "kb";

const DEFAULT_TEXT_COLUMN = "text";
const DEFAULT_CLASS_NAME_COLUMN = "label";

export { PROJECT_TYPES,
         DOCS_MENTIONS_FILE_FORMAT,
         DOCS_KB_FILE_FORMAT,
         FILE_TYPE_DOCUMENTS,
         FILE_TYPE_KB,
         DEFAULT_TEXT_COLUMN,
         DEFAULT_CLASS_NAME_COLUMN };
