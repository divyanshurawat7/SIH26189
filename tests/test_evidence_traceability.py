"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: tests/test_evidence_traceability.py

Phase 6 Test Suite: Evidence Traceability
Validates that every finding, relationship, and multi-hop chain traces back to
verifiable source records in the raw dataset with zero fabricated IDs.
"""

import unittest
from pathlib import Path
import pandas as pd

from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder
from src.evidence_traceability import EvidenceTracer, EvidenceItem, EvidenceTrace
from src.pattern_detection import Finding


class TestEvidenceTraceability(unittest.TestCase):
    """Unit tests for EvidenceTracer, EvidenceItem, and provenance resolution."""

    @classmethod
    def setUpClass(cls):
        repo_root = Path(__file__).resolve().parent.parent
        raw_dir = repo_root / "SIH26189_SYNTHETIC_DATASET" / "raw"
        cls.data = DataLoader(raw_dir).load_all()
        cls.graph = GraphBuilder().build_graph(cls.data)
        cls.tracer = EvidenceTracer(cls.data, cls.graph)

    def test_source_record_lookup(self):
        """Look up individual records across distinct source types in O(1) time."""
        # 1. CDR
        cdr = self.tracer.get_evidence_by_record_id("CALL_000001")
        self.assertIsNotNone(cdr)
        self.assertEqual(cdr.source_type, "CDR")
        self.assertEqual(cdr.source_record_id, "CALL_000001")
        self.assertIn("PHONE_01476", cdr.entity_ids)

        # 2. Transaction
        txn = self.tracer.get_evidence_by_record_id("TXN_000001")
        self.assertIsNotNone(txn)
        self.assertEqual(txn.source_type, "FINANCIAL_TRANSACTION")
        self.assertEqual(txn.source_record_id, "TXN_000001")

        # 3. FIR
        fir = self.tracer.get_evidence_by_record_id("FIR_0001")
        self.assertIsNotNone(fir)
        self.assertEqual(fir.source_type, "FIR_RECORD")
        self.assertEqual(fir.case_id, "CASE_0001")

        # 4. Location Event
        locev = self.tracer.get_evidence_by_record_id("LOCEV_015001")
        self.assertIsNotNone(locev)
        self.assertEqual(locev.source_type, "LOCATION_EVENT")
        self.assertEqual(locev.location_id, "LOCATION_0041")

        # 5. Relationship
        rel = self.tracer.get_evidence_by_record_id("REL_000004")
        self.assertIsNotNone(rel)
        self.assertEqual(rel.source_type, "RELATIONSHIP")

    def test_evidence_existence_validation(self):
        """Every returned source_record_id must verifiably exist in the raw dataset."""
        sample_ids = ["CALL_000001", "TXN_000001", "FIR_0001", "LOCEV_015001", "REL_000004"]
        for rid in sample_ids:
            item = self.tracer.get_evidence_by_record_id(rid)
            self.assertIsNotNone(item, f"Record {rid} not found in index")

            if item.source_type == "CDR":
                match = self.data.cdr_records[self.data.cdr_records["call_id"] == rid]
                self.assertFalse(match.empty, f"{rid} missing from raw cdr_records")
            elif item.source_type == "FINANCIAL_TRANSACTION":
                match = self.data.financial_transactions[self.data.financial_transactions["transaction_id"] == rid]
                self.assertFalse(match.empty, f"{rid} missing from raw financial_transactions")
            elif item.source_type == "FIR_RECORD":
                match = self.data.fir_records[self.data.fir_records["fir_id"] == rid]
                self.assertFalse(match.empty, f"{rid} missing from raw fir_records")
            elif item.source_type == "LOCATION_EVENT":
                match = self.data.location_events[self.data.location_events["location_event_id"] == rid]
                self.assertFalse(match.empty, f"{rid} missing from raw location_events")
            elif item.source_type == "RELATIONSHIP":
                match = self.data.relationships[self.data.relationships["relationship_id"] == rid]
                self.assertFalse(match.empty, f"{rid} missing from raw relationships")

    def test_finding_to_evidence_mapping(self):
        """Finding objects must resolve to concrete evidence items."""
        sample_finding = Finding(
            finding_id="TEST_FINDING_001",
            person_id="PERSON_1476",
            case_id="CASE_0001",
            pattern_type="layered_financial_trail_plus_temporal_call_chain",
            score=0.95,
            confidence=0.92,
            start_time="2025-08-15 00:00:00",
            end_time="2025-08-30 00:00:00",
            entities=["PERSON_1476", "PERSON_0026"],
            source_record_ids=["CALL_000001", "TXN_000001"],
            evidence_sources=["CDR", "financial_transactions"],
            narrative="Test layered finding narrative."
        )

        trace = self.tracer.trace_finding(sample_finding)
        self.assertIsInstance(trace, EvidenceTrace)
        self.assertEqual(trace.target_id, "TEST_FINDING_001")
        self.assertGreaterEqual(trace.source_count, 2)
        self.assertIn("CDR", trace.source_categories)
        self.assertIn("FINANCIAL_TRANSACTION", trace.source_categories)
        self.assertGreaterEqual(trace.aggregate_confidence, 0.80)

    def test_evidence_source_diversity(self):
        """
        Multiple records from the same category must count as 1 category.
        Evidence diversity score must correctly reflect independent categories.
        """
        # 3 calls from the same source category
        items_same_cat = [
            EvidenceItem("E1", "CDR", "CALL_000001", ["P1", "P2"]),
            EvidenceItem("E2", "CDR", "CALL_000002", ["P1", "P2"]),
            EvidenceItem("E3", "CDR", "CALL_000003", ["P1", "P2"]),
        ]
        cnt, cats, div = EvidenceTracer.calculate_evidence_diversity(items_same_cat)
        self.assertEqual(cnt, 1, "Multiple calls must count as exactly 1 source category!")
        self.assertEqual(cats, ["CDR"])
        self.assertAlmostEqual(div, 1 / 6.0, places=2)

        # 4 distinct categories
        items_multi_cat = [
            EvidenceItem("E1", "CDR", "CALL_000001", ["P1", "P2"]),
            EvidenceItem("E2", "FINANCIAL_TRANSACTION", "TXN_000001", ["P1", "P2"]),
            EvidenceItem("E3", "LOCATION_EVENT", "LOCEV_000001", ["P1"]),
            EvidenceItem("E4", "VEHICLE_EVENT", "VEVENT_000001", ["V1"]),
        ]
        cnt2, cats2, div2 = EvidenceTracer.calculate_evidence_diversity(items_multi_cat)
        self.assertEqual(cnt2, 4)
        self.assertAlmostEqual(div2, 4 / 6.0, places=2)

    def test_confidence_calculation(self):
        """Explainable confidence aggregation must be bounded and never invent 100% certainty."""
        items = [
            EvidenceItem("E1", "CDR", "CALL_000001", ["P1", "P2"], confidence=0.90, reliability=0.90),
            EvidenceItem("E2", "FINANCIAL_TRANSACTION", "TXN_000001", ["P1", "P2"], confidence=0.85, reliability=0.85),
        ]
        conf, rel = EvidenceTracer.calculate_aggregate_confidence(items)
        self.assertGreater(conf, 0.0)
        self.assertLessEqual(conf, 0.98, "Never claim 100% certainty unless explicitly justified!")
        self.assertGreater(rel, 0.0)
        self.assertLessEqual(rel, 0.98)

    def test_hop_by_hop_traceability(self):
        """Single hop between two actors must resolve to underlying records with categories."""
        hop_info = self.tracer.explain_hop("PERSON_1476", "PERSON_0026")
        self.assertEqual(hop_info["source"], "PERSON_1476")
        self.assertEqual(hop_info["target"], "PERSON_0026")
        self.assertGreaterEqual(hop_info["evidence_count"], 4)
        self.assertIn("CDR", hop_info["source_categories"])
        self.assertIn("FINANCIAL_TRANSACTION", hop_info["source_categories"])

    def test_chain_tracing_flagship(self):
        """
        Flagship 5-hop directed chain to CASE_0001 must resolve across all hops
        with rich source diversity and zero hardcoding.
        """
        flagship_chain = [
            "PERSON_1476", "PERSON_0026", "PERSON_0397", "PERSON_0405", "PERSON_1459", "CASE_0001"
        ]
        trace = self.tracer.trace_chain(flagship_chain)
        self.assertIsInstance(trace, EvidenceTrace)
        self.assertEqual(len(trace.hop_traces), 5)
        self.assertGreaterEqual(trace.source_count, 20)
        self.assertGreaterEqual(len(trace.source_categories), 5)
        self.assertGreaterEqual(trace.diversity_score, 0.80)
        self.assertIn("CDR", trace.source_categories)
        self.assertIn("FINANCIAL_TRANSACTION", trace.source_categories)
        self.assertIn("FIR_RECORD", trace.source_categories)

    def test_location_and_case_evidence_retrieval(self):
        """Direct retrieval by case_id and location_id must return verified evidence."""
        case_items = self.tracer.get_evidence_for_case("CASE_0001")
        self.assertGreaterEqual(len(case_items), 5)
        case_cats = set(it.source_type for it in case_items)
        self.assertIn("FIR_RECORD", case_cats)

        loc_items = self.tracer.get_evidence_for_location("LOCATION_0041")
        self.assertGreaterEqual(len(loc_items), 1)
        loc_cats = set(it.source_type for it in loc_items)
        self.assertTrue(len(loc_cats) >= 1)


if __name__ == "__main__":
    unittest.main()
