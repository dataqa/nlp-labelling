import numpy as np
import scipy
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import precision_score, classification_report, roc_auc_score


def process_data(df_train, df_test):
    vectorizer = TfidfVectorizer()
    X_train = vectorizer.fit_transform(df_train['text'])
    y_train = np.array(df_train['label'].to_list())

    X_test = vectorizer.transform(df_test['text'])
    y_test = df_test['label'].values
    return X_train, y_train, X_test, y_test


def get_performance_with_all_labelled(X_train,
                                       y_train,
                                       X_test,
                                       y_test):
    model = LogisticRegression(solver="lbfgs")
    model.fit(X_train, y_train)
    y_predicted = model.predict(X_test)
    print("Predicted label distribution\n", pd.DataFrame(y_predicted)[0].value_counts())
    all_training_data_performance = precision_score(y_test, y_predicted, average='macro')
    print(f"Macro-precision score: {all_training_data_performance}")
    print("ROC-AUC score: ", roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]))
    return all_training_data_performance


def get_performance_with_small_labelled_sample(X_train,
                                               y_train,
                                               X_test,
                                               y_test,
                                               num_manual_user_labels):
    initial_idx = sorted(np.random.choice(range(X_train.shape[0]),
                                          size=num_manual_user_labels,
                                          replace=False),
                         reverse=True)
    X_initial, y_initial = X_train[initial_idx], y_train[initial_idx]
    X_pool, y_pool = delete_multiple_rows(X_train.copy(), initial_idx), \
                     np.delete(y_train, initial_idx, axis=0)
    print("Initial sample label distribution\n", pd.DataFrame(y_initial)[0].value_counts())

    model = LogisticRegression(solver="lbfgs")
    model.fit(X_initial, y_initial)
    y_predicted = model.predict(X_test)

    random_manual_performance = precision_score(y_test,
                                                y_predicted,
                                                average='macro')

    print(f"Macro-precision score: {random_manual_performance}")
    print("ROC-AUC score: ", roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]))
    print("Predicted label distribution\n", pd.DataFrame(y_predicted)[0].value_counts())
    print("Classification report\n", classification_report(y_test, model.predict(X_test)))
    return random_manual_performance, X_initial, y_initial, X_pool, y_pool


def delete_row_csr(mat, i):
    if not isinstance(mat, scipy.sparse.csr_matrix):
        raise ValueError("works only for CSR format -- use .tocsr() first")
    n = mat.indptr[i + 1] - mat.indptr[i]
    if n > 0:
        mat.data[mat.indptr[i]:-n] = mat.data[mat.indptr[i + 1]:]
        mat.data = mat.data[:-n]
        mat.indices[mat.indptr[i]:-n] = mat.indices[mat.indptr[i + 1]:]
        mat.indices = mat.indices[:-n]
    mat.indptr[i:-1] = mat.indptr[i + 1:]
    mat.indptr[i:] -= n
    mat.indptr = mat.indptr[:-1]
    mat._shape = (mat._shape[0] - 1, mat._shape[1])
    return mat


def delete_multiple_rows(mat, row_idx):
    for i in row_idx:
        mat = delete_row_csr(mat, i)
    return mat


def get_all_stats(L_train):
    results = {}
    num_points, num_rules = L_train.shape
    covered = (L_train != -1).sum(axis=0)
    results['coverage'] = [cov/float(num_points) for cov in covered]
    overlaps = (L_train != -1).sum(axis=1)
    repeated_overlaps = np.tile((overlaps > 1), (num_rules, 1)).T
    overlaps_absolute_num = np.logical_and((L_train != -1), repeated_overlaps).sum(axis=0)
    results['overlaps'] = [overlap/float(num_points) for overlap in overlaps_absolute_num]
    conflicts = []
    for rule_ind in range(num_rules):
        other_rules_ind = [x for x in range(num_rules) if x!=rule_ind]
        other_rules = L_train[:, other_rules_ind]

        repeated_rule = np.tile(L_train[:, rule_ind], (num_rules - 1, 1)).T
        x = np.logical_and((repeated_rule != -1), (repeated_rule != other_rules))
        y = np.logical_and(x, (other_rules != -1))

        total_conflicts = (y.sum(axis=1) > 0).sum()
        conflicts.append(total_conflicts/float(num_points))
    results['conflicts'] = conflicts
    return results