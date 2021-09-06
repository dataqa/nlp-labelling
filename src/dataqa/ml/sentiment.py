from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dataqa.constants import TEXT_COLUMN_NAME
import numpy as np

POS_COL = "__pos__"
NEG_COL = "__neg__"
NEU_COL = "__neu__"

SENTIMENT_COL_MAPPING = {"positive": POS_COL,
                     "negative": NEG_COL,
                     "neutral": NEU_COL}


def get_sentiment(df):
    analyzer = SentimentIntensityAnalyzer()
    polarity = df[TEXT_COLUMN_NAME].apply(lambda x: analyzer.polarity_scores(x))
    positive_scores = polarity.apply(lambda x: x['pos']).values
    negative_scores = polarity.apply(lambda x: x['neg']).values
    neutral_score = polarity.apply(lambda x: x['neu']).values
    df[POS_COL] = positive_scores
    df[NEG_COL] = negative_scores
    df[NEU_COL] = neutral_score
    return df


def filter_sentiment(doc, sentiment, gt, score, label, label_abstain):
    if gt and doc[SENTIMENT_COL_MAPPING[sentiment]] > score:
        return label
    elif (not gt) and doc[SENTIMENT_COL_MAPPING[sentiment]] < score:
        return label
    return label_abstain


def get_sentiment_distribution(df):
    bins = np.linspace(0, 1.0, 20)
    pos_bin_values, bin_edges = np.histogram(df[POS_COL].values, bins=bins)
    neg_bin_values = np.histogram(df[NEG_COL].values , bins=bins)[0]
    neutral_bin_values = np.histogram(1 - df[POS_COL].values - df[NEG_COL].values, bins=bins)[0]
    distribution = [{"score": bin_val, "positive": pos_val, "negative": neg_val,
                     "neutral": neutral_val}
                    for bin_val, pos_val, neg_val, neutral_val in
                    zip(bin_edges.tolist(),
                        pos_bin_values.tolist(),
                        neg_bin_values.tolist(),
                        neutral_bin_values.tolist())]
    return distribution
