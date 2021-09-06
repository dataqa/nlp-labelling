from pathlib import Path
import subprocess
import sys

import spacy
import spacy.cli

from dataqa.constants import ROOT_PATH

try:
    _ = spacy.cli.info('en-core-web-sm')
except:
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           str(Path(ROOT_PATH, "nlp", "en_core_web_sm-2.3.1.tar.gz"))])

# this is a pointer to the module object instance itself.
this = sys.modules[__name__]

# we can explicitly make assignments on it
import en_core_web_sm

# this.nlp = spacy.load("en_core_web_sm", disable=["textcat"])
this.nlp = en_core_web_sm.load(disable=["textcat"])
sentencizer = this.nlp.create_pipe("sentencizer")
this.nlp.add_pipe(sentencizer)
