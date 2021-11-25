import sys

import spacy.cli

# this is a pointer to the module object instance itself.
this = sys.modules[__name__]

# we can explicitly make assignments on it
import en_core_web_sm

# this.nlp = spacy.load("en_core_web_sm", disable=["textcat"])
this.nlp = en_core_web_sm.load(disable=["textcat"])
sentencizer = this.nlp.create_pipe("sentencizer")
this.nlp.add_pipe(sentencizer)

infixes = this.nlp.Defaults.infixes
infixes = tuple([i for i in infixes if i != "#"])
infix_regex = spacy.util.compile_infix_regex(infixes)
this.nlp.tokenizer.infix_finditer = infix_regex.finditer
