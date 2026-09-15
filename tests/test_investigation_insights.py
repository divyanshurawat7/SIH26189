"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: tests/test_investigation_insights.py

Phase 6 Test Suite: Investigation Insights Layer
Validates that investigator dossiers, actor roles, multi-hop chains,
cross-case linkages, and false-positive controls are accurately generated
with full explainability and zero ground-truth leakage.
"""

import unittest
from pathlib import Path

from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder
from src.evidence_traceability import EvidenceTracer
from src.investigation_insights import (
    InvestigationInsightsGenerator,
    PersonInsight,
    CaseInsight,
    NetworkInsight,
    CrossCaseInsight
)


class TestInvestigationInsights(unittest.TestCase):
    """Unit tests for investigation dossiers, narratives, and chain explanations."""

    @classmethod
    def setUpClass(cls):
        repo_root = Path(__file__).resolve().parent.parent
        raw_dir = repo_root / "SIH26189_SYNTHETIC_DATASET" / "raw"
        cls.data = DataLoader(raw_dir).load_all()
        cls.graph = GraphBuilder().build_graph(cls.data)
        cls.tracer = EvidenceTracer(cls.data, cls.graph)
        cls.insights_gen = InvestigationInsightsGenerator(
            dataset=cls.data,
            graph=cls.graph,
            tracer=cls.tracer
        )

    def test_person_insight_upstream_coordinator(self):
        """PERSON_1476 must be analyzed as an Upstream Coordinator with multi-hop reach."""
        p_insight = self.insights_gen.generate_person_insight("PERSON_1476")
        self.assertIsInstance(p_insight, PersonInsight)
        self.assertEqual(p_insight.person_id, "PERSON_1476")
        self.assertEqual(p_insight.predicted_role, "UPSTREAM_COORDINATOR")
        self.assertTrue(p_insight.is_criminally_significant)
        self.assertGreaterEqual(p_insight.confidence, 0.90)
        self.assertGreaterEqual(p_insight.evidence_diversity, 5)
        self.assertIn("CDR", p_insight.source_categories)
        self.assertIn("FINANCIAL_TRANSACTION", p_insight.source_categories)
        self.assertIn("UPSTREAM COORDINATOR", p_insight.narrative)
        self.assertGreater(len(p_insight.strongest_supporting_evidence), 0)

    def test_person_insight_broker(self):
        """PERSON_0026 must be analyzed as a Broker with high betweenness."""
        p_insight = self.insights_gen.generate_person_insight("PERSON_0026")
        self.assertEqual(p_insight.person_id, "PERSON_0026")
        self.assertEqual(p_insight.predicted_role, "BROKER")
        self.assertTrue(p_insight.is_criminally_significant)
        self.assertGreater(p_insight.betweenness, 0.0)
        self.assertIn("Broker", p_insight.network_position)

    def test_person_insight_operational_member(self):
        """PERSON_1459 must be analyzed as an Operational Member directly tied to CASE_0001."""
        p_insight = self.insights_gen.generate_person_insight("PERSON_1459")
        self.assertEqual(p_insight.person_id, "PERSON_1459")
        self.assertEqual(p_insight.predicted_role, "OPERATIONAL_MEMBER")
        self.assertTrue(p_insight.is_criminally_significant)
        self.assertIn("CASE_0001", p_insight.connected_cases)

    def test_innocent_control_person_0553_explanation(self):
        """
        Innocent control PERSON_0553 must have an explicit forensic justification
        explaining why high volume does not equal criminal significance.
        """
        expl = self.insights_gen.explain_false_positive_control("PERSON_0553")
        self.assertEqual(expl["person_id"], "PERSON_0553")
        self.assertFalse(expl["is_criminally_significant"])
        self.assertFalse(expl["has_criminal_history"])
        self.assertFalse(expl["has_fir_accused"])
        self.assertFalse(expl["has_multi_hop_chain"])
        self.assertIn("non-criminal", expl["justification"].lower())

    def test_flagship_case_0001_dossier(self):
        """
        Flagship CASE_0001 dossier must completely reconstruct the 5-hop operational chain,
        isolate the coordinator, and prove multi-source evidence diversity.
        """
        c1 = self.insights_gen.generate_flagship_case_0001_dossier()
        self.assertIsInstance(c1, CaseInsight)
        self.assertEqual(c1.case_id, "CASE_0001")
        self.assertEqual(c1.status, "closed")
        self.assertEqual(c1.upstream_coordinator, "PERSON_1476")
        self.assertIn("PERSON_0026", c1.brokers)
        self.assertIn("PERSON_1459", c1.operational_members)

        # 5-hop directed chain: A -> B -> C -> D -> E -> CASE
        expected_chain = [
            "PERSON_1476", "PERSON_0026", "PERSON_0397", "PERSON_0405", "PERSON_1459", "CASE_0001"
        ]
        self.assertEqual(c1.operational_chain, expected_chain)
        self.assertEqual(len(c1.hop_evidence), 5)

        # Upstream coordinator isolation check: 0 direct edges
        self.assertFalse(
            self.graph.has_edge("PERSON_1476", "CASE_0001"),
            "PERSON_1476 must have zero direct graph edges to CASE_0001!"
        )

        # Multi-source evidence diversity
        self.assertGreaterEqual(c1.evidence_diversity, 5)
        self.assertGreater(len(c1.source_record_ids), 0)
        self.assertIn("FIR_0001", c1.fir_id)

    def test_network_insight_generation(self):
        """Syndicate NET_001 insight must aggregate key influencers and hierarchy."""
        net1 = self.insights_gen.generate_network_insight("NET_001")
        self.assertIsInstance(net1, NetworkInsight)
        self.assertEqual(net1.network_id, "NET_001")
        self.assertEqual(net1.primary_case, "CASE_0001")
        self.assertEqual(net1.upstream_coordinator, "PERSON_1476")
        self.assertIn("PERSON_0026", net1.brokers)
        self.assertGreater(len(net1.key_influencers), 0)
        self.assertIn("Syndicate NET_001", net1.narrative)

    def test_cross_case_insight_generation(self):
        """Cross-case insights must explain why an entity is shared and list supporting records."""
        # Find a cross-case entity from findings
        all_findings = self.insights_gen._get_findings()
        xcase_findings = [f for f in all_findings if f.pattern_type == "cross_case_entity_link"]
        self.assertGreater(len(xcase_findings), 0)

        sample_ent = xcase_findings[0].metadata.get("shared_entity_id")
        x_insight = self.insights_gen.generate_cross_case_insight(sample_ent)
        self.assertIsNotNone(x_insight)
        self.assertIsInstance(x_insight, CrossCaseInsight)
        self.assertEqual(x_insight.shared_entity_id, sample_ent)
        self.assertGreaterEqual(len(x_insight.linked_cases), 1)
        self.assertGreater(len(x_insight.supporting_evidence_ids), 0)

    def test_no_ground_truth_leakage(self):
        """Insights generation must run strictly without reading ground truth files."""
        # Check that insights_gen does not have any ground_truth file attributes or paths
        self.assertFalse(hasattr(self.insights_gen, "ground_truth"))
        self.assertFalse(hasattr(self.tracer, "ground_truth"))

    def test_explainability_narratives_non_empty(self):
        """All investigator narratives must be substantive, factual, and informative."""
        p_insight = self.insights_gen.generate_person_insight("PERSON_1476")
        self.assertGreater(len(p_insight.narrative), 40)
        self.assertGreater(len(p_insight.explanation), 20)

        c1 = self.insights_gen.generate_flagship_case_0001_dossier()
        self.assertGreater(len(c1.narrative), 40)


if __name__ == "__main__":
    unittest.main()
