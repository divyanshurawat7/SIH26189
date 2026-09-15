"""
SIH26189 — AI-Powered Criminal Network Analysis System
Test Suite: tests/test_influencer_detection.py

Comprehensive tests for Phase 4: Influencer Detection + Upstream Coordinator Discovery.
Validates:
- Graph feature extraction (degree, in/out-degree, centralities, link distributions).
- Broker detection using betweenness and operational bridge links.
- Upstream coordinator detection via multi-hop directed paths without direct crime presence.
- Flagship scenario NET_001 / CASE_0001:
  * PERSON_1476 detected as UPSTREAM_COORDINATOR.
  * Exact flagship chain recovered:
    PERSON_1476 -> PERSON_0026 -> PERSON_0397 -> PERSON_0405 -> PERSON_1459 -> CASE_0001.
- False positive prevention on innocent high-degree nodes:
  * PERSON_0553 classified as non-criminal HIGH_DEGREE contact.
- Financial facilitator detection based on financial interaction volume/ratio.
- Operational member detection based on direct case / FIR appearance.
- Explainability output structure and supporting paths.
- Ground truth evaluation metrics (precision, recall, F1, FPR).
"""

import unittest
from pathlib import Path
import networkx as nx

from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder
from src.influencer_detection import InfluencerDetector, RoleType, InfluencerResult


class TestInfluencerDetection(unittest.TestCase):
    """Unit and integration tests for InfluencerDetector."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.builder = GraphBuilder()
        cls.G = cls.builder.build_graph(
            cls.dataset,
            include_events=False,
            include_cdr_calls=True,
            include_transactions=True,
            max_cdr_edges=2000,
            max_transaction_edges=2000
        )
        cls.detector = InfluencerDetector(cls.G)
        cls.influencers = cls.detector.detect_influencers()
        cls.inf_map = {r.person_id: r for r in cls.influencers}

    def test_graph_features_computed_for_all_persons(self):
        """All 1500 person nodes must have complete graph features."""
        features = self.detector.compute_person_features()
        self.assertEqual(len(features), 1500)

        sample_feat = features["PERSON_1476"]
        required_keys = {
            "degree", "weighted_degree", "in_degree", "out_degree",
            "betweenness_centrality", "closeness_centrality",
            "connected_persons_count", "communication_links_count",
            "financial_links_count", "operational_links_count",
            "evidence_sources", "evidence_source_diversity"
        }
        self.assertTrue(
            required_keys.issubset(sample_feat.keys()),
            f"Missing feature keys: {required_keys - sample_feat.keys()}"
        )

    def test_flagship_coordinator_detected(self):
        """PERSON_1476 must be detected as UPSTREAM_COORDINATOR."""
        res = self.inf_map.get(InfluencerDetector.FLAGSHIP_COORDINATOR)
        self.assertIsNotNone(res, f"{InfluencerDetector.FLAGSHIP_COORDINATOR} not found in results!")
        self.assertEqual(res.predicted_role, RoleType.UPSTREAM_COORDINATOR.value)
        self.assertTrue(res.is_criminally_significant)
        self.assertGreaterEqual(res.confidence_score, 0.75)

    def test_flagship_directed_chain_recovered(self):
        """The exact 5-hop directed chain to CASE_0001 must be recovered in supporting_paths."""
        res = self.inf_map.get(InfluencerDetector.FLAGSHIP_COORDINATOR)
        self.assertIsNotNone(res)

        path_found = False
        for path in res.supporting_paths:
            if path == InfluencerDetector.FLAGSHIP_EXPECTED_PATH:
                path_found = True
                break

        self.assertTrue(
            path_found,
            f"Flagship path {InfluencerDetector.FLAGSHIP_EXPECTED_PATH} was not recovered in {res.supporting_paths}"
        )

    def test_innocent_high_degree_trap_handling(self):
        """PERSON_0553 must be distinguished as innocent/non-criminal HIGH_DEGREE contact."""
        res = self.inf_map.get(InfluencerDetector.FLAGSHIP_INNOCENT)
        self.assertIsNotNone(res, f"{InfluencerDetector.FLAGSHIP_INNOCENT} not found in results!")

        # Must NOT be misclassified as UPSTREAM_COORDINATOR or BROKER
        self.assertNotEqual(res.predicted_role, RoleType.UPSTREAM_COORDINATOR.value)
        self.assertNotEqual(res.predicted_role, RoleType.BROKER.value)

        # Must be marked non-criminally significant
        self.assertFalse(
            res.is_criminally_significant,
            "PERSON_0553 should be classified as non-criminally significant (innocent contact)!"
        )
        self.assertIn("non-criminal", res.explanation.lower())

    def test_broker_detection(self):
        """Flagship broker PERSON_0026 must be detected as BROKER with high betweenness."""
        res = self.inf_map.get("PERSON_0026")
        self.assertIsNotNone(res)
        self.assertEqual(res.predicted_role, RoleType.BROKER.value)
        self.assertTrue(res.is_criminally_significant)
        self.assertGreater(res.graph_features["betweenness_centrality"], 0.01)

    def test_operational_member_detection(self):
        """PERSON_1459 (accused in FIR_0001, appeared in CASE_0001) must be OPERATIONAL_MEMBER."""
        res = self.inf_map.get("PERSON_1459")
        self.assertIsNotNone(res)
        self.assertEqual(res.predicted_role, RoleType.OPERATIONAL_MEMBER.value)
        self.assertTrue(res.is_criminally_significant)
        self.assertIn("CASE_0001", res.connected_cases)

    def test_financial_facilitator_detection(self):
        """Detects financial facilitators based on high financial interaction volume/ratio."""
        res = self.inf_map.get("PERSON_0721")
        self.assertIsNotNone(res)
        # Should be detected as FINANCIAL_FACILITATOR
        self.assertEqual(res.predicted_role, RoleType.FINANCIAL_FACILITATOR.value)
        self.assertTrue(res.is_criminally_significant)
        self.assertGreaterEqual(res.graph_features["financial_links_count"], 4)

    def test_explainability_structure(self):
        """Every influencer result must contain required fields, narrative, and supporting sources."""
        for r in self.influencers[:50]:
            d = r.to_dict()
            self.assertIn("person_id", d)
            self.assertIn("predicted_role", d)
            self.assertIn("confidence_score", d)
            self.assertIn("graph_features", d)
            self.assertIn("supporting_paths", d)
            self.assertIn("supporting_evidence_sources", d)
            self.assertIn("connected_cases", d)
            self.assertIn("explanation", d)
            self.assertTrue(len(r.explanation) > 20)

    def test_top_influencers_ranking(self):
        """Top influencers should prioritize criminal coordinators and brokers over peripheral contacts."""
        top20 = self.detector.get_top_influencers(20)
        self.assertEqual(len(top20), 20)

        # Flagship coordinator PERSON_1476 and broker PERSON_0026 should be near top
        top_pids = [r.person_id for r in top20]
        self.assertIn("PERSON_1476", top_pids)
        self.assertIn("PERSON_0026", top_pids)

    def test_ground_truth_evaluation_suite(self):
        """Validates the post-prediction ground truth evaluation metrics."""
        gt_path = (
            Path(__file__).resolve().parent.parent
            / "SIH26189_SYNTHETIC_DATASET"
            / "ground_truth"
            / "ground_truth_roles.csv"
        )
        report = InfluencerDetector.evaluate_against_ground_truth(self.influencers, gt_path)
        self.assertTrue(report["flagship_coordinator_detected"])
        self.assertTrue(report["flagship_path_recovered"])
        self.assertTrue(report["innocent_high_degree_false_positive_prevented"])
        self.assertIn("role_metrics", report)


if __name__ == "__main__":
    unittest.main()
