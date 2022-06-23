import re

from typing import Dict, List, Optional, Tuple, TypedDict
from nltk.corpus import words as corpus_words

# Types
ExtractedResult = Tuple[int, int, str, str]


class DataFrameRow(TypedDict):
    Title: str
    Abstract: str
    abbreviations: Optional[Dict]


# Abbreviations
def get_matching_word(word_list: List[str], stripped: str, stop_words: List[str]):
    reversed_words = reversed(word_list)
    length = len(stripped)
    matching_words = [
        (abs((i + 1) - length), w)
        for i, w in enumerate(reversed_words)
        if w.startswith(stripped[0]) and w not in stop_words
    ]

    if not len(matching_words):
        return None

    sorted_words = sorted(matching_words, key=lambda m: m[0])
    distance, word = sorted_words[0]
    approx_word_distance = len(stripped) + 3

    if distance <= approx_word_distance:
        return word

    return None


def extract_abbreviations(text: str, stop_words: List[str]) -> Dict[str, str]:
    """
    Extracts abbreviations from Title/Abstract fields of supplied rows

    Usage:
        df["abbreviations"] = df.apply(
            lambda row: extract_abbreviations(row, nlp.Defaults.stop_words),
            axis=1
        )

    Returns:
        {'PFS': 'progression-free survival', 'IHC': 'immunohistochemistry', 'OS': 'overall survival'}
        {'NSCLC': 'non-small-cell lung cancer', 'PFS': 'progression-free survival', 'OS': 'overall survival'}
        ...
    """
    results = {}
    abbreviations = re.findall(r"\([A-Z]+[0-9]*[A-Za-z]*\)", text)
    # Todo maintain lists of deny/allow abbreviations eg. IRESSA == getfitnib
    abbreviations = [a for a in abbreviations if not re.search(r"\(NCT\d+", a)]

    for abbrv in abbreviations:
        stripped = abbrv.strip("()").lower()
        abbrv_index = text.index(abbrv)
        search_str = text[0:abbrv_index].lower()
        search_str = search_str.replace("-", " ").replace("/", " ").strip()
        original_words = search_str.split(" ")
        matching_word = get_matching_word(original_words, stripped, stop_words)

        if matching_word:
            try:
                start_index = search_str.rindex(f" {matching_word}")
            except ValueError:
                start_index = search_str.rindex(matching_word)

            match = text[start_index:abbrv_index].strip()

            results[abbrv.strip("()")] = match

    return results


# find_abbreviations(df.loc[81])


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


def extract_interventions(row: DataFrameRow) -> List[ExtractedResult]:
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
    text = row["Title"].lower() + row["Abstract"].lower()
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
                        lookup_abbreviation(row["abbreviations"], w)
                        for w in word.split(" + ")
                    ]
                    filtered_words = [
                        w for w in split_words if w not in WORD_LIST and len(w) > 1
                    ]
                    word = " + ".join(sorted(filtered_words))

                if word:
                    extracted.append((match[0], match[1], matched_phrase, word))

    return extracted


PHASES = {
    "iv": "4",
    "iiii": "4",
    "4": "4",
    "iii": "3",
    "3": "3",
    "ii": "2",
    "iia": "2",
    "iib": "2",
    "2": "2",
    "ia": "1",
    "ib": "1",
    "i": "1",
    "1": "1",
}


def extract_phase(row: DataFrameRow) -> Optional[ExtractedResult]:
    """
    Extracts phase from Title/Abstract fields of supplied rows
    *Note:* start_pos and end_pos are based on row['Title']+row['Abstract']

    Usage:
        df["phase"] = df.apply(extract_phase, axis=1)

    Returns:
    An extracted Phase tuple
    (start_pos, end_pos, phase, normalised phase)

    e.g.
    (1105, 1116, "III", "3")
    """
    content = row["Title"] + row["Abstract"]
    results = []
    potentials = []

    for match in re.finditer(r"\Wphase\W([\(\w\)\/]+)", content):
        matched_phase = match.groups()[0]
        normalised_phase = PHASES.get(matched_phase.lower())

        if normalised_phase:
            results.append(
                (match.span()[0], match.span()[1], matched_phase, normalised_phase)
            )
        else:
            potentials.append(
                (match.span()[0], match.span()[1], matched_phase, matched_phase)
            )

    if len(results):
        sorted_results = sorted(results, key=lambda x: x[3], reverse=True)
        return sorted_results[0]

    if len(potentials):
        return potentials[0]
