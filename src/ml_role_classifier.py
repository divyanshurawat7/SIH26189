from pathlib import Path
import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
)
try:
    from xgboost import XGBClassifier
except ImportError:
    XGBClassifier = None
from sklearn.metrics import classification_report, accuracy_score


# Features already produced by InfluencerDetector
FEATURE_COLUMNS = [
    "degree",
    "weighted_degree",
    "in_degree",
    "out_degree",
    "betweenness_centrality",
    "closeness_centrality",
    "connected_persons_count",
    "communication_links_count",
    "financial_links_count",
    "location_links_count",
    "operational_links_count",
    "op_in_links",
    "op_out_links",
    "direct_case_count",
    "evidence_source_diversity",
]


class RoleClassifier:
    def __init__(self, model_path="models/role_classifier.joblib"):
        self.model_path = Path(model_path)
        self.model = None
        self.feature_columns = FEATURE_COLUMNS

    def load_ground_truth(self, path):
        return pd.read_csv(path)

    def build_training_dataframe(self, features, ground_truth):
        """
        features:
            dict/person -> feature dict

        ground_truth:
            network_id, person_id, role
        """

        rows = []

        for _, gt in ground_truth.iterrows():
            person_id = gt["person_id"]

            if person_id not in features:
                continue

            row = {
                "person_id": person_id,
                "network_id": gt["network_id"],
                "role": gt["role"],
            }

            person_features = features[person_id]

            for feature in FEATURE_COLUMNS:
                row[feature] = person_features.get(feature, 0.0)

            rows.append(row)

        return pd.DataFrame(rows)

    def train(self, features, ground_truth_path):
        ground_truth = self.load_ground_truth(ground_truth_path)

        df = self.build_training_dataframe(
            features,
            ground_truth
        )

        if df.empty:
            raise ValueError(
                "No matching persons found between graph features "
                "and ground truth."
            )

        print(f"\nML dataset: {len(df)} persons")
        print(f"Networks: {df['network_id'].nunique()}")

        print("\nRole distribution:")
        print(df["role"].value_counts())

        X = df[self.feature_columns]
        y = df["role"]
        groups = df["network_id"]

        # ---------------------------------------------------------
        # Encode labels
        # ---------------------------------------------------------

        classes = sorted(y.unique())

        class_to_id = {
            role: idx
            for idx, role in enumerate(classes)
        }

        id_to_class = {
            idx: role
            for role, idx in class_to_id.items()
        }

        y_encoded = y.map(class_to_id)

        # ---------------------------------------------------------
        # NETWORK-WISE STRATIFIED CROSS VALIDATION
        # ---------------------------------------------------------

        cv = StratifiedGroupKFold(
            n_splits=4,
            shuffle=True,
            random_state=42,
        )

        rf_scores = []
        xgb_scores = []

        rf_macro_f1 = []
        xgb_macro_f1 = []

        print("\n" + "=" * 60)
        print("NETWORK-WISE MODEL BENCHMARK")
        print("=" * 60)

        for fold, (train_idx, test_idx) in enumerate(
            cv.split(X, y_encoded, groups),
            start=1,
        ):
            X_train = X.iloc[train_idx]
            X_test = X.iloc[test_idx]

            y_train = y_encoded.iloc[train_idx]
            y_test = y_encoded.iloc[test_idx]

            train_networks = sorted(
                set(groups.iloc[train_idx])
            )

            test_networks = sorted(
                set(groups.iloc[test_idx])
            )

            print(f"\n--- Fold {fold} ---")
            print("Train networks:", train_networks)
            print("Test networks: ", test_networks)
            print(
                f"Train samples: {len(X_train)} | "
                f"Test samples: {len(X_test)}"
            )

            # -----------------------------------------------------
            # RANDOM FOREST
            # -----------------------------------------------------

            rf = RandomForestClassifier(
                n_estimators=400,
                max_depth=12,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            )

            rf.fit(X_train, y_train)

            rf_pred = rf.predict(X_test)

            rf_acc = accuracy_score(
                y_test,
                rf_pred,
            )

            rf_f1 = f1_score(
                y_test,
                rf_pred,
                average="macro",
                zero_division=0,
            )

            rf_scores.append(rf_acc)
            rf_macro_f1.append(rf_f1)

            # -----------------------------------------------------
            # XGBOOST
            # -----------------------------------------------------

            xgb = XGBClassifier(
                n_estimators=300,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.85,
                colsample_bytree=0.85,
                objective="multi:softprob",
                num_class=len(classes),
                eval_metric="mlogloss",
                random_state=42,
                n_jobs=-1,
            )

            xgb.fit(X_train, y_train)

            xgb_pred = xgb.predict(X_test)

            xgb_acc = accuracy_score(
                y_test,
                xgb_pred,
            )

            xgb_f1 = f1_score(
                y_test,
                xgb_pred,
                average="macro",
                zero_division=0,
            )

            xgb_scores.append(xgb_acc)
            xgb_macro_f1.append(xgb_f1)

            print(
                f"RF   -> Accuracy: {rf_acc:.4f} | "
                f"Macro-F1: {rf_f1:.4f}"
            )

            print(
                f"XGB  -> Accuracy: {xgb_acc:.4f} | "
                f"Macro-F1: {xgb_f1:.4f}"
            )

        # ---------------------------------------------------------
        # SUMMARY
        # ---------------------------------------------------------

        rf_mean_acc = sum(rf_scores) / len(rf_scores)
        xgb_mean_acc = sum(xgb_scores) / len(xgb_scores)

        rf_mean_f1 = sum(rf_macro_f1) / len(rf_macro_f1)
        xgb_mean_f1 = sum(xgb_macro_f1) / len(xgb_macro_f1)

        print("\n" + "=" * 60)
        print("MODEL COMPARISON")
        print("=" * 60)

        print(
            f"\nRandom Forest:"
            f"\n  Mean Accuracy : {rf_mean_acc:.4f}"
            f"\n  Mean Macro-F1 : {rf_mean_f1:.4f}"
        )

        print(
            f"\nXGBoost:"
            f"\n  Mean Accuracy : {xgb_mean_acc:.4f}"
            f"\n  Mean Macro-F1 : {xgb_mean_f1:.4f}"
        )

        # ---------------------------------------------------------
        # SELECT BEST MODEL BY MACRO-F1
        # ---------------------------------------------------------

        if xgb_mean_f1 >= rf_mean_f1:
            best_model_name = "XGBoost"
            best_model = xgb
        else:
            best_model_name = "RandomForest"
            best_model = rf

        print(
            f"\nBEST MODEL: {best_model_name}"
        )

        # ---------------------------------------------------------
        # RETRAIN BEST MODEL ON ALL LABELED DATA
        # ---------------------------------------------------------

        if best_model_name == "XGBoost":

            final_model = XGBClassifier(
                n_estimators=300,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.85,
                colsample_bytree=0.85,
                objective="multi:softprob",
                num_class=len(classes),
                eval_metric="mlogloss",
                random_state=42,
                n_jobs=-1,
            )

        else:

            final_model = RandomForestClassifier(
                n_estimators=400,
                max_depth=12,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            )

        final_model.fit(
            X,
            y_encoded,
        )

        self.model = final_model

        # ---------------------------------------------------------
        # FEATURE IMPORTANCE
        # ---------------------------------------------------------

        importance = pd.Series(
            final_model.feature_importances_,
            index=self.feature_columns,
        ).sort_values(
            ascending=False
        )

        print("\nTop ML Features:")

        print(
            importance.head(10)
        )

        # ---------------------------------------------------------
        # SAVE MODEL
        # ---------------------------------------------------------

        self.model_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        joblib.dump(
            {
                "model": self.model,
                "feature_columns": self.feature_columns,
                "classes": classes,
                "class_to_id": class_to_id,
                "id_to_class": id_to_class,
                "model_name": best_model_name,
                "rf_mean_accuracy": rf_mean_acc,
                "rf_mean_macro_f1": rf_mean_f1,
                "xgb_mean_accuracy": xgb_mean_acc,
                "xgb_mean_macro_f1": xgb_mean_f1,
            },
            self.model_path,
        )

        print(
            f"\nModel saved to: {self.model_path}"
        )

        return {
            "best_model": best_model_name,
            "rf_accuracy": rf_mean_acc,
            "rf_macro_f1": rf_mean_f1,
            "xgb_accuracy": xgb_mean_acc,
            "xgb_macro_f1": xgb_mean_f1,
            "feature_importance": importance.to_dict(),
        }

    def load(self):
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {self.model_path}"
            )

        data = joblib.load(self.model_path)

        self.model = data["model"]
        self.feature_columns = data["feature_columns"]

        self.classes = data["classes"]
        self.class_to_id = data["class_to_id"]
        self.id_to_class = {
            int(k): v
            for k, v in data["id_to_class"].items()
        }

        self.model_name = data.get(
            "model_name",
            "Unknown"
        )

    def predict(self, person_features):
        if self.model is None:
            self.load()

        X = pd.DataFrame(
            [
                {
                    feature: person_features.get(
                        feature,
                        0.0
                    )
                    for feature in self.feature_columns
                }
            ]
        )

        # Model returns encoded class ID
        predicted_id = int(
            self.model.predict(X)[0]
        )

        predicted_role = self.id_to_class[
            predicted_id
        ]

        probabilities = self.model.predict_proba(X)[0]

        class_probabilities = {
            self.id_to_class[idx]: float(prob)
            for idx, prob in enumerate(probabilities)
        }

        confidence = max(probabilities)

        return {
            "role": predicted_role,
            "confidence": float(confidence),
            "probabilities": class_probabilities,
            "model": getattr(
                self,
                "model_name",
                "Unknown"
            ),
        }

def train_from_engine():
    """
    Train the ML role classifier directly from the existing
    SIH26189 graph-feature pipeline.
    """

    from src.api import init_app_state

    print("\nInitializing intelligence engine...")
    state = init_app_state()

    # Reuse already-computed graph features.
    features = state.influencer_detector._features

    print(f"\nAvailable graph features: {len(features)} persons")

    classifier = RoleClassifier()

    ground_truth_path = (
        "SIH26189_SYNTHETIC_DATASET/"
        "ground_truth/"
        "ground_truth_roles.csv"
    )

    result = classifier.train(
        features=features,
        ground_truth_path=ground_truth_path,
    )

    print("\n" + "=" * 60)
    print("ML ROLE CLASSIFIER TRAINING COMPLETE")
    print("=" * 60)

    print(f"Best Model: {result['best_model']}")
    print(f"RF Mean Accuracy: {result['rf_accuracy']:.4f}")
    print(f"RF Mean Macro-F1: {result['rf_macro_f1']:.4f}")
    print(f"XGB Mean Accuracy: {result['xgb_accuracy']:.4f}")
    print(f"XGB Mean Macro-F1: {result['xgb_macro_f1']:.4f}")

    # print("\nTrain networks:")
    # for network in result["train_networks"]:
    #     print(f"  {network}")

    # print("\nTest networks:")
    # for network in result["test_networks"]:
    #     print(f"  {network}")

    print("\nTop features:")
    for feature, importance in list(
        result["feature_importance"].items()
    )[:10]:
        print(f"  {feature}: {importance:.4f}")


if __name__ == "__main__":
    train_from_engine()



