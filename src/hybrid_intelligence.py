from typing import Dict, Optional, Any


class HybridIntelligence:
    """
    Combines:
    1. Existing rule-based intelligence
    2. ML role prediction
    3. Evidence strength

    Rules remain the primary signal because they are currently
    more explainable and better aligned with the investigation logic.
    """

    def __init__(
        self,
        influencer_detector,
        ml_classifier,
        roles: Optional[Dict[str, Any]] = None,
    ):
        self.influencer_detector = influencer_detector
        self.ml_classifier = ml_classifier
        self.roles = roles or {}

    def _get_evidence_score(self, person_id: str) -> float:
        """
        Estimate evidence strength from the existing graph features.

        This is deliberately conservative:
        evidence diversity contributes to confidence but does not
        independently determine criminal significance.
        """

        try:
            features = (
                self.influencer_detector
                .compute_person_features()
                .get(person_id)
            )

            if not features:
                return 0.0

            diversity = float(
                features.get("evidence_source_diversity", 0)
            )

            # Saturate at 10 independent source categories.
            return min(diversity / 10.0, 1.0)

        except Exception:
            return 0.0

    def predict(
        self,
        person_id: str,
        rule_prediction: str,
        rule_confidence: float,
        ml_prediction: Dict[str, Any],
    ) -> Dict[str, Any]:

        ml_role = ml_prediction.get("role")
        ml_confidence = float(
            ml_prediction.get("confidence", 0.0)
        )

        rule_confidence = float(rule_confidence)

        evidence_score = self._get_evidence_score(person_id)

        agreement = (
            rule_prediction == ml_role
            if rule_prediction and ml_role
            else False
        )

        # ---------------------------------------------------------
        # Hybrid scoring
        # ---------------------------------------------------------

        rule_score = rule_confidence * 0.60
        ml_score = ml_confidence * 0.25
        evidence_component = evidence_score * 0.15

        final_score = (
            rule_score
            + ml_score
            + evidence_component
        )

        # Agreement between independent rule + ML signals
        # increases confidence slightly.
        if agreement:
            final_score += 0.05

        final_score = min(final_score, 1.0)

        # ---------------------------------------------------------
        # Role selection
        # ---------------------------------------------------------

        if agreement:
            final_role = rule_prediction

        elif rule_confidence >= ml_confidence:
            final_role = rule_prediction

        else:
            final_role = ml_role

        # ---------------------------------------------------------
        # Confidence level
        # ---------------------------------------------------------

        if final_score >= 0.80:
            confidence_level = "HIGH"
        elif final_score >= 0.60:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        return {
            "person_id": person_id,
            "role": final_role,
            "confidence": round(final_score, 4),

            "rule_prediction": rule_prediction,
            "rule_confidence": round(rule_confidence, 4),
            "rule_score": round(rule_score, 4),

            "ml_prediction": ml_role,
            "ml_confidence": round(ml_confidence, 4),
            "ml_score": round(ml_score, 4),

            "evidence_score": round(
                evidence_score,
                4,
            ),

            "agreement": agreement,
            "confidence_level": confidence_level,

            "ml_probabilities": ml_prediction.get(
                "probabilities",
                {},
            ),
        }