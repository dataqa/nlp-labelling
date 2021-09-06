from snorkel.labeling import LabelModel
import numpy as np
from sklearn.metrics import precision_score, roc_auc_score, confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression


def get_combined_label(L):
    label_model = LabelModel(cardinality=2, verbose=True)
    label_model.fit(L_train=L)
    predicted = label_model.predict(L=L, tie_break_policy="abstain")
    return label_model, predicted


def use_label_model(X_train, y_train, X_test, y_test, L_train, L_test):
    label_model, predicted_train = get_combined_label(L_train)

    print("On training data")
    plt.hist(predicted_train)
    plt.show()
    print(np.unique(predicted_train, return_counts=True))
    ignore = np.where(predicted_train != -1)
    label_model_acc = label_model.score(L=L_train, Y=y_train, tie_break_policy="abstain")["accuracy"]
    print("Micro score on training data - ignoring abstain", label_model_acc)
    print("Macro score on training data - ignoring abstain",
          precision_score(y_train[ignore], predicted_train[ignore], average='macro'))
    print("ROC-AUC score: ", roc_auc_score(y_train[ignore], label_model.predict_proba(L=L_train[ignore])[:, 1]))
    labels = [0, 1]
    cm = confusion_matrix(y_train[ignore], predicted_train[ignore], labels)
    _ = ConfusionMatrixDisplay(cm).plot()
    plt.show()

    print("\nOn test data")
    predicted_test = label_model.predict(L=L_test, tie_break_policy="abstain")
    plt.hist(predicted_test)
    plt.show()
    print(np.unique(predicted_test, return_counts=True))
    ignore = np.where(predicted_test != -1)
    coverage = len(ignore[0])

    print(f"\nIgnoring abstain: coverage {len(ignore[0])}/{len(y_test)} ({len(ignore[0])/len(y_test)*100:.2f}%)")
    label_model_acc = label_model.score(L=L_test, Y=y_test, tie_break_policy="abstain")["accuracy"]
    print(f"Micro score on test data: {label_model_acc}")
    distant_supervision_low_coverage_performance = precision_score(y_test[ignore], predicted_test[ignore], average='macro')
    print(f"Macro score on test data: {distant_supervision_low_coverage_performance}")
    print("ROC-AUC score: ", roc_auc_score(y_test[ignore], label_model.predict_proba(L=L_test[ignore])[:, 1]))
    labels = [0, 1]
    cm = confusion_matrix(y_test[ignore], predicted_test[ignore], labels)
    _ = ConfusionMatrixDisplay(cm).plot()
    plt.show()

    print(f"\nAssuming abstain is majority class (full coverage {len(y_test)})")
    predicted_test[np.where(predicted_test == -1)] = 0
    print(f"Micro precision on test data: {precision_score(y_test, predicted_test, average='micro')}")
    distant_supervision_maj_class_performance = precision_score(y_test, predicted_test, average='macro')
    print(f"Macro precision on test data: {distant_supervision_maj_class_performance}")
    print("ROC-AUC score: ", roc_auc_score(y_test, label_model.predict_proba(L=L_test)[:, 1]))

    print(f"\nModel-training on labelled training examples (full coverage {len(y_test)})")
    ignore = np.where(predicted_train != -1)
    sklearn_model = LogisticRegression(solver="lbfgs")
    sklearn_model.fit(X=X_train[ignore], y=predicted_train[ignore])
    predicted_test = sklearn_model.predict(X_test)
    print(f"Micro precision on test data: {precision_score(y_test, predicted_test, average='micro')}")
    distant_supervision_model_performance = precision_score(y_test, predicted_test, average='macro')
    print(f"Macro precision on test data: {distant_supervision_model_performance}")
    print("ROC-AUC score: ", roc_auc_score(y_test, sklearn_model.predict_proba(X_test)[:, 1]))

    return (distant_supervision_low_coverage_performance,
            coverage,
            distant_supervision_maj_class_performance,
            distant_supervision_model_performance)

