from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


class MLRoleClassifier:

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

    ROLE_MAPPING = {
        "HIGH_DEGREE_INNOCENT": "HIGH_DEGREE",
        "INNOCENT_CONTACT": "HIGH_DEGREE",
        "RECRUITER": "OPERATIONAL_MEMBER",
    }

    def __init__(
        self,
        model_path: str = "models/role_classifier.joblib"
    ):
        self.model_path = Path(model_path)
        self.model: Optional[RandomForestClassifier] = None

    # ==========================================================
    # FEATURE PREPARATION
    # ==========================================================

    def build_training_dataframe(
        self,
        features: Dict[str, Dict[str, Any]],
        ground_truth_path: str
    ) -> pd.DataFrame:

        gt = pd.read_csv(ground_truth_path)

        rows = []

        for _, row in gt.iterrows():

            person_id = str(row["person_id"])

            if person_id not in features:
                continue

            feature_row = features[person_id].copy()

            feature_row["person_id"] = person_id
            feature_row["role"] = str(row["role"])

            rows.append(feature_row)

        df = pd.DataFrame(rows)

        if df.empty:
            raise ValueError(
                "No matching PERSON records found between "
                "graph features and ground-truth roles."
            )

        # Normalize legacy ground-truth labels.
        df["role"] = df["role"].replace(
            self.ROLE_MAPPING
        )

        # Keep only supported feature columns.
        for col in self.FEATURE_COLUMNS:
            if col not in df.columns:
                df[col] = 0.0

        return df[
            ["person_id"] + self.FEATURE_COLUMNS + ["role"]
        ]

    # ==========================================================
    # TRAIN
    # ==========================================================

    def train(
        self,
        features: Dict[str, Dict[str, Any]],
        ground_truth_path: str
    ) -> Dict[str, Any]:

        df = self.build_training_dataframe(
            features,
            ground_truth_path
        )

        X = df[self.FEATURE_COLUMNS].fillna(0.0)
        y = df["role"]

        # Stratified split when possible.
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )

        self.model = RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )

        self.model.fit(
            X_train,
            y_train
        )

        predictions = self.model.predict(X_test)

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        report = classification_report(
            y_test,
            predictions,
            output_dict=True,
            zero_division=0
        )

        # Save trained model.
        self.model_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        joblib.dump(
            self.model,
            self.model_path
        )

        return {
            "samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "accuracy": round(float(accuracy), 4),
            "classification_report": report,
            "classes": list(
                self.model.classes_
            ),
            "feature_importance": {
                feature: round(
                    float(importance),
                    5
                )
                for feature, importance in zip(
                    self.FEATURE_COLUMNS,
                    self.model.feature_importances_
                )
            }
        }

    # ==========================================================
    # LOAD
    # ==========================================================

    def load(self) -> None:

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"ML model not found: {self.model_path}"
            )

        self.model = joblib.load(
            self.model_path
        )

    # ==========================================================
    # PREDICT ONE PERSON
    # ==========================================================

    def predict(
        self,
        feature_dict: Dict[str, Any]
    ) -> Dict[str, Any]:

        if self.model is None:
            self.load()

        row = {
            feature: feature_dict.get(
                feature,
                0.0
            )
            for feature in self.FEATURE_COLUMNS
        }

        X = pd.DataFrame(
            [row],
            columns=self.FEATURE_COLUMNS
        ).fillna(0.0)

        predicted_role = self.model.predict(X)[0]

        probabilities = self.model.predict_proba(X)[0]

        class_probabilities = {
            role: round(
                float(prob),
                4
            )
            for role, prob in zip(
                self.model.classes_,
                probabilities
            )
        }

        confidence = max(
            class_probabilities.values()
        )

        return {
            "predicted_role": predicted_role,
            "confidence": round(
                confidence,
                4
            ),
            "probabilities": class_probabilities
        }

    # ==========================================================
    # PREDICT ALL PERSONS
    # ==========================================================

    def predict_all(
        self,
        features: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:

        if self.model is None:
            self.load()

        predictions = {}

        for person_id, feature_dict in features.items():

            predictions[person_id] = self.predict(
                feature_dict
            )

        return predictions