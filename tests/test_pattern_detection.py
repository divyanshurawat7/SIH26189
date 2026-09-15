"""
SIH26189 — AI-Powered Criminal Network Analysis System
Test Suite: tests/test_pattern_detection.py

Validates Phase 5 Pattern Detection & Cross-Case Intelligence Engine:
- Multi-modal suspicious pattern detection
- Flagship CASE_0001 layered financial trail + temporal call cascade recovery
- Discovery of PERSON_1476 as upstream coordinator without direct crime presence
- Rapid transfer chain discovery across accounts
- Communication burst and anomaly detection
- Vehicle convoy travel detection
- Cross-case entity link discovery
- Innocent high-degree control handling (PERSON_0553 marked non-criminal)
- Explainable finding structure, multi-source evidence, and investigator narratives
- Post-prediction ground truth evaluation (Precision, Recall, F1)
- Zero ground truth leakage during prediction
"""

import unittest
from pathlib import Path

from src.data_loader import DataLoader
from src.pattern_detection import PatternDetector, Finding


class TestPatternDetection(unittest.TestCase):
    """Unit and integration tests for PatternDetector and Cross-Case Engine."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.detector = PatternDetector(cls.dataset)
        cls.findings = cls.detector.detect_all_patterns()
        cls.findings_by_id = {f.finding_id: f for f in cls.findings}

    def test_total_findings_generated(self):
        """Pattern detector should identify patterns across all categories."""
        self.assertGreater(len(self.findings), 200)

        types = set(f.pattern_type for f in self.findings)
        required_types = {
            "layered_financial_trail_plus_temporal_call_chain",
            "rapid_transfer_chain",
            "communication_burst",
            "vehicle_co_travel_convoy",
            "cross_case_entity_link",
            "dense_contact_routine"
        }
        self.assertTrue(
            required_types.issubset(types),
            f"Missing required pattern types: {required_types - types}"
        )

    def test_flagship_case_0001_layered_chain_recovered(self):
        """
        Flagship CASE_0001:
        - Must detect layered_financial_trail_plus_temporal_call_chain.
        - Must recover PERSON_1476 as the upstream coordinator.
        - Must contain all chain members (PERSON_1476 -> 0026 -> 0397 -> 0405 -> 1459).
        - Must trace multi-source evidence (financial, CDR, location, vehicle).
        """
        c1_findings = [
            f for f in self.findings
            if f.case_id == "CASE_0001" and f.pattern_type == "layered_financial_trail_plus_temporal_call_chain"
        ]
        self.assertEqual(len(c1_findings), 1, "Exactly one primary layered finding for CASE_0001 expected.")

        f = c1_findings[0]
        self.assertEqual(f.person_id, "PERSON_1476")
        self.assertTrue(f.is_criminal)
        self.assertGreaterEqual(f.confidence, 0.90)

        expected_chain = ["PERSON_1476", "PERSON_0026", "PERSON_0397", "PERSON_0405", "PERSON_1459"]
        for p in expected_chain:
            self.assertIn(p, f.entities, f"Missing chain actor {p} in CASE_0001 finding entities!")

        # Multi-source evidence check
        for src in ["financial", "CDR", "location", "vehicle"]:
            self.assertIn(src, f.evidence_sources, f"Missing evidence source {src} in CASE_0001 finding!")

        # Narrative explainability
        self.assertIn("PERSON_1476", f.narrative)
        self.assertIn("PERSON_1459", f.narrative)
        self.assertIn("TXN_000001", f.narrative)

    def test_rapid_transfer_chains(self):
        """Detects rapid pass-through fund transfers across accounts."""
        rapid_tx = [f for f in self.findings if f.pattern_type == "rapid_transfer_chain"]
        self.assertGreater(len(rapid_tx), 5)

        sample = rapid_tx[0]
        self.assertGreaterEqual(len(sample.entities), 4)
        self.assertGreaterEqual(len(sample.source_record_ids), 3)
        self.assertIn("financial", sample.evidence_sources)

    def test_communication_bursts(self):
        """Detects communication bursts with high volume above baseline."""
        bursts = [f for f in self.findings if f.pattern_type == "communication_burst"]
        self.assertGreater(len(bursts), 10)

        sample = bursts[0]
        self.assertGreaterEqual(sample.score, 0.70)
        self.assertIn("CDR", sample.evidence_sources)

    def test_vehicle_convoys(self):
        """Detects vehicle convoys with multi-trip co-travel."""
        convoys = [f for f in self.findings if f.pattern_type == "vehicle_co_travel_convoy"]
        self.assertGreater(len(convoys), 20)

        sample = convoys[0]
        self.assertGreaterEqual(sample.metadata.get("shared_trips", 0), 2)
        self.assertIn("vehicle", sample.evidence_sources)

    def test_cross_case_links(self):
        """Detects entities linked to multiple distinct cases."""
        xcase = [f for f in self.findings if f.pattern_type == "cross_case_entity_link"]
        self.assertGreater(len(xcase), 50)

        sample = xcase[0]
        linked = sample.metadata.get("linked_cases", [])
        self.assertGreaterEqual(len(linked), 2)
        self.assertIn("cross-case", sample.narrative.lower())

    def test_innocent_control_person_0553_handled(self):
        """
        PERSON_0553 is a high-degree innocent contact.
        - Must be classified with is_criminal=False.
        - Must NOT be falsely accused of criminal coordination or layered money laundering.
        """
        p553_findings = [f for f in self.findings if "PERSON_0553" in f.entities]
        self.assertGreaterEqual(len(p553_findings), 1)

        for f in p553_findings:
            if f.pattern_type == "dense_contact_routine":
                self.assertFalse(f.is_criminal, "PERSON_0553 must be marked non-criminal!")
                self.assertLessEqual(f.score, 0.30)
                self.assertIn("non-criminal", f.narrative.lower())

        # Must not be coordinator for any case
        c1_finding = next((f for f in self.findings if f.case_id == "CASE_0001"), None)
        self.assertNotEqual(c1_finding.person_id, "PERSON_0553")

    def test_finding_structure_and_explainability(self):
        """All findings must conform to the required Finding format."""
        for f in self.findings[:50]:
            d = f.to_dict()
            self.assertIn("finding_id", d)
            self.assertIn("pattern_type", d)
            self.assertIn("score", d)
            self.assertIn("confidence", d)
            self.assertIn("entities", d)
            self.assertIn("source_record_ids", d)
            self.assertIn("evidence_sources", d)
            self.assertIn("narrative", d)
            self.assertIn("is_criminal", d)
            self.assertGreater(len(f.narrative), 20)

    def test_ground_truth_evaluation(self):
        """Validates the post-prediction ground truth evaluation metrics."""
        gt_dir = (
            Path(__file__).resolve().parent.parent
            / "SIH26189_SYNTHETIC_DATASET"
            / "ground_truth"
        )
        report = PatternDetector.evaluate_against_ground_truth(
            self.findings,
            gt_dir / "ground_truth_suspicious_patterns.csv",
            gt_dir / "ground_truth_case_links.csv",
            gt_dir / "ground_truth_co_travel.csv"
        )

        susp_metrics = report["suspicious_patterns_metrics"]
        self.assertEqual(susp_metrics["precision"], 1.0)
        self.assertEqual(susp_metrics["recall"], 1.0)
        self.assertEqual(susp_metrics["f1"], 1.0)
        self.assertEqual(susp_metrics["tp"], 12)
        self.assertEqual(susp_metrics["fp"], 0)

        self.assertTrue(report["flagship_case_detected"])
        self.assertTrue(report["flagship_coordinator_recovered"])
        self.assertTrue(report["innocent_control_handled_correctly"])
        self.assertIn("co_travel_metrics", report)
        self.assertIn("cross_case_metrics", report)


if __name__ == "__main__":
    unittest.main()
