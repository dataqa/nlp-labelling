from modAL.models import ActiveLearner
from modAL.uncertainty import uncertainty_sampling
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score
from utils import delete_multiple_rows
import numpy as np
from distant_supervision import get_combined_label
import scipy


def run_active_learning_simulation(X_initial,
                                    y_initial,
                                   X_pool,
                                   y_pool,
                                   X_test,
                                   y_test,
                                   num_manual_user_labels):
    learner = ActiveLearner(
        estimator=LogisticRegression(solver="lbfgs"),
        query_strategy=uncertainty_sampling,
        X_training=X_initial, y_training=y_initial
    )

    # active learning
    accuracy_scores = [precision_score(y_test, learner.predict(X_test), average='macro')]

    n_queries = num_manual_user_labels
    for idx in range(n_queries):
        query_idx, query_inst = learner.query(X_pool)
        #     print(idx, y_pool[query_idx])
        print(f"iteration: {idx} - query index: {query_idx} - pool size {X_pool.shape[0]}")
        learner.teach(query_inst, y_pool[query_idx])

        X_pool, y_pool = delete_multiple_rows(X_pool.copy(), query_idx), np.delete(y_pool, query_idx, axis=0)
        last_score = precision_score(y_test, learner.predict(X_test), average='macro')
        accuracy_scores.append(last_score)

    return accuracy_scores


def run_active_learning_simulation_using_initial_labels(X_train,
                                                        y_train,
                                                        L_train,
                                                        X_test,
                                                        y_test,
                                                        num_manual_user_labels,
                                                        sample_weight=10):
    label_model, predicted_train = get_combined_label(L_train)
    learn_idx = np.where(predicted_train != -1)[0]
    X_learn = X_train[learn_idx].copy()
    y_learn = predicted_train[learn_idx].copy()

    model = LogisticRegression(solver="lbfgs", max_iter=2000)
    model.fit(X_learn, y_learn)

    # active learning
    learner = ActiveLearner(
        estimator=model,
        query_strategy=uncertainty_sampling,
        X_training=X_learn,
        y_training=y_learn
    )

    # initially we want to sample from all (at this stage, we don't have any manual label)
    X_sample = X_train.copy()
    idx_sample = np.arange(len(y_train))
    sample_weights = np.array([1] * X_learn.shape[0])

    accuracy_scores = [precision_score(y_test, learner.predict(X_test), average='macro')]

    n_queries = num_manual_user_labels

    print(f"Starting simulation with {X_learn.shape[0]} learning set, {X_sample.shape[0]} sample set.")

    for idx in range(n_queries):
        query_sample_idx, query_inst = learner.query(X_sample)
        # index in original full space
        query_idx = idx_sample[query_sample_idx[0]]

        if query_idx in learn_idx:
            learn_sample_idx = np.where(learn_idx == query_idx)[0][0]
            y_learn[learn_sample_idx] = y_train[query_idx]
            sample_weights[learn_sample_idx] = sample_weight
            print(f"{idx} - query instance {query_idx} in learning pool at index {learn_sample_idx}: "
                  f"{len(y_learn)} in learning, {len(idx_sample)} in sample")
        else:
            sample_weights = np.append(sample_weights, sample_weight)
            y_learn = np.append(y_learn, y_train[query_idx])
            X_learn = scipy.sparse.vstack([X_learn, X_train[query_idx]])
            print(f"{idx} - query instance {query_idx} NOT in learning pool: "
                  f"{len(y_learn)} in learning, {len(idx_sample)} in sample")


        # we want to fit only on the ones predicted by rule + manual labels
        learner.fit(X_learn, y_learn, sample_weight=sample_weights)

        X_sample, idx_sample = (delete_multiple_rows(X_sample, query_sample_idx),
                                np.delete(idx_sample, query_sample_idx, axis=0))

        last_score = precision_score(y_test, learner.predict(X_test), average='macro')

        accuracy_scores.append(last_score)

    return accuracy_scores