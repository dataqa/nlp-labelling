const PROJECT_TYPES = { classification: "classification", 
                        ner: "ner",
                        entity_disambiguation: "entity_disambiguation"};

const PROJECT_TYPES_ABBREV = { classification: "classification", 
                                ner: "NER",
                                entity_disambiguation: "entity linking"};

const WIKI_DOCS_FILE_FORMAT = "https://dataqa.ai/docs/v1.1.1/file_formats/NER";
const DOCS_TEXT_FILE_FORMAT = "https://dataqa.ai/docs/v1.1.1/file_formats/classification";
const DOCS_CLASSNAME_FILE_FORMAT = "https://dataqa.ai/docs/v1.1.1/file_formats/classification";
const DOCS_MENTIONS_FILE_FORMAT = "https://dataqa.ai/docs/v1.1.1/file_formats/entity_disambiguation";
const DOCS_KB_FILE_FORMAT = "https://dataqa.ai/docs/v1.1.1/file_formats/entity_disambiguation";

const FILE_TYPE_DOCUMENTS = "documents";
const FILE_TYPE_DOCUMENTS_WIKI = "documents_wiki";
const FILE_TYPE_KB = "kb";

const DEFAULT_WIKI_COLUMN = "url";
const DEFAULT_TEXT_COLUMN = "text";
const DEFAULT_CLASS_NAME_COLUMN = "label";
const DEFAULT_MENTIONS_COLUMNS = ["text", "mentions"];
const DEFAULT_KB_COLUMNS = ["name", "description"];

export { PROJECT_TYPES,
         PROJECT_TYPES_ABBREV,
         DOCS_MENTIONS_FILE_FORMAT,
         DOCS_KB_FILE_FORMAT,
         DOCS_TEXT_FILE_FORMAT,
         DOCS_CLASSNAME_FILE_FORMAT,
         FILE_TYPE_DOCUMENTS,
         FILE_TYPE_KB,
         FILE_TYPE_DOCUMENTS_WIKI,
         DEFAULT_TEXT_COLUMN,
         DEFAULT_CLASS_NAME_COLUMN,
         DEFAULT_MENTIONS_COLUMNS,
         DEFAULT_KB_COLUMNS,
         DEFAULT_WIKI_COLUMN,
         WIKI_DOCS_FILE_FORMAT };
