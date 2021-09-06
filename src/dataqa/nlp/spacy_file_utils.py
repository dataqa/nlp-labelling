from spacy.tokens import DocBin
import dataqa.nlp.spacy_nlp as spacy_nlp


def serialise_spacy_docs(df):
    # for some reason, I need to add POS to be able to access the lemmas (https://github.com/explosion/spaCy/issues/4824)
    # I also need to add SENT_START to access the sentences (https://github.com/explosion/spaCy/issues/5578)
    doc_bin = DocBin(attrs=["POS", "LEMMA", "HEAD", "ENT_TYPE", "ENT_IOB", "DEP"])
    texts = df.text

    for doc in spacy_nlp.nlp.pipe(texts):
        doc_bin.add(doc)

    bytes_data = doc_bin.to_bytes()
    return bytes_data


def save_spacy_docs(bytes_data, spacy_binary_filepath):
    out_file = open(spacy_binary_filepath, "wb")  # open for [w]riting as [b]inary
    out_file.write(bytes_data)
    out_file.close()


def serialise_save_spacy_docs(df, spacy_binary_filepath):
    bytes_data = serialise_spacy_docs(df)
    save_spacy_docs(bytes_data, spacy_binary_filepath)
    return spacy_binary_filepath


def deserialise_spacy_docs(spacy_binary_filepath):
    with open(spacy_binary_filepath, "rb") as file:
        bytes_data = file.read()
        doc_bin = DocBin().from_bytes(bytes_data)
        data_list = list(doc_bin.get_docs(spacy_nlp.nlp.vocab))
        spacy_docs = [x for x in data_list]

    return spacy_docs


def deserialise_spacy_doc_id(spacy_binary_filepath, doc_id):
    with open(spacy_binary_filepath, "rb") as file:
        bytes_data = file.read()
        doc_bin = DocBin().from_bytes(bytes_data)
        for ind, doc in enumerate(doc_bin.get_docs(spacy_nlp.nlp.vocab)):
            if ind == doc_id:
                return doc

    raise Exception(f"Could not find document with id {doc_id}")


