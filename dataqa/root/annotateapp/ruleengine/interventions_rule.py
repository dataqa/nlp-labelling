import re
from annotateapp.extract import extract_abbreviations
from annotateapp.models import Document, DocumentLabel, Rule
from nltk.corpus import words as corpus_words

ExtractedResult = tuple[int, int, str, str]

FILTER_LIST = [
    "patients",
    "arm",
    "high-dose",
    "low-dose",
    "evaluating",
    "vs",
    "second-line",
    "pts",
    "cycles",
]
WHITE_LIST = ["chemotherapy", "radiotherapy", "placebo"]

DRUG_NAME = r"[\w|-]+"
TREATMENTS = r"(chemotherapy|radiotherapy)"


INTERVENTION_REGEXES = [
    rf"random.*receive\s({DRUG_NAME})\sor\s({DRUG_NAME})\W",
    rf"({DRUG_NAME})\s(?:versus|vs?|vs?\.)\s({DRUG_NAME}\s(?:\+|plus|and)\s{DRUG_NAME})\W",
    rf"random.*receive\s(?:either)*\s({DRUG_NAME})\s(?:orally|intravenously).*\sor\s({DRUG_NAME})\W(?:orally|intravenously)",
    rf"({DRUG_NAME})\s?\W?\s?(?:\d+\.?\d+)\s?mg",
    rf"({DRUG_NAME}\s(?:\+|plus)\s\w+)\s(?:versus|vs?|vs?\.)\s({DRUG_NAME})",
    rf"({DRUG_NAME})\s(?:versus|vs?|vs?\.)\s(\1\splus\s{DRUG_NAME})",
    rf"placebo\s(?:and|\+|plus|with)\s{DRUG_NAME}\W",
    rf"{DRUG_NAME}\s(?:and|\+|plus|with)\splacebo",
    rf"({DRUG_NAME})\swas\sadministered",
    rf"{TREATMENTS}\W?\s(?:and|\+|plus|with)\s({DRUG_NAME})",
]
WORD_LIST = set(corpus_words.words() + FILTER_LIST) - set(WHITE_LIST)


def lookup_abbreviation(abbreviations, word):
    lookup_word = word.upper().strip()
    return abbreviations.get(lookup_word, word)


def extract_interventions(text: str) -> list[ExtractedResult]:
    """
    Extracts interventions from Title/Abstract fields of supplied rows
    Requires DataFrame to contain 'abbreviations'

    *Note:* start_pos and end_pos are based on row['Title']+row['Abstract']

    Usage:
        df["interventions"] = df.apply(extract_interventions, axis=1)

    Returns:
    A list of extracted interventions tuples e.g.
    [(start_pos, end_pos, intervention, normalised intervention), ...]

    [(1105, 1116, "efatutazone", "efatutazone"), (1164, 1173, "erlotinib", "erlotinib")]
    """
    abbreviations = extract_abbreviations(text, [])
    extracted = []
    for regex in INTERVENTION_REGEXES:
        matched_regexes = list(re.finditer(regex, text))
        for match in matched_regexes:
            matches = [
                x[0] + (x[1],) for x in list(zip(match.regs[1:], match.groups()))
            ]
            matches = [x for x in matches if x[2] not in WORD_LIST]

            for match in matches:
                matched_phrase = match[2]
                word = None
                try:
                    int(matched_phrase)
                except ValueError:
                    word = (
                        matched_phrase.replace(" and ", " + ")
                        .replace(" plus ", " + ")
                        .strip(".;- ")
                    )
                    split_words = [
                        lookup_abbreviation(abbreviations, w) for w in word.split(" + ")
                    ]
                    filtered_words = [
                        w for w in split_words if w not in WORD_LIST and len(w) > 1
                    ]
                    word = " + ".join(sorted(filtered_words))

                if word:
                    extracted.append((match[0], match[1], matched_phrase, word))

    return extracted


class InterventionsRule:
    """
    Can include other stuff like instructional text for users
    """

    @staticmethod
    def run_rule(rule: Rule, documents: list[Document]) -> list[DocumentLabel]:
        document_labels = []
        for document in documents:
            extracted_interventions = extract_interventions(document.text)
            for (
                start_pos,
                end_pos,
                phrase,
                phrase_normalised,
            ) in extracted_interventions:
                document_labels.append(
                    DocumentLabel(
                        document=document,
                        phrase=phrase,
                        phrase_normalised=phrase_normalised,
                        start_pos=start_pos,
                        end_pos=end_pos,
                    )
                )

        return DocumentLabel.objects.bulk_create(document_labels)
