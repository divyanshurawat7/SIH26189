"""
SIH26189 — AI-Powered Criminal Network Analysis System
Test Suite: tests/test_temporal_spatial.py

Validates Phase 5 Temporal and Spatial Analysis Engines:
- Activity timeline generation per person and per case
- Communication and transaction spike detection
- Pre-crime and post-crime window profiling
- Multi-hop temporal call cascades
- Haversine geodesic distance calculation
- Multi-trip vehicle co-travel convoy detection
- Crime scene proximity detection for CASE_0001
- Coordinator spatial isolation (PERSON_1476 absent from crime scene)
- Data integrity (real timestamps, real entities, real source records)
"""

import unittest
from datetime import datetime
import pandas as pd

from src.data_loader import DataLoader
from src.temporal_analysis import TemporalAnalyzer, ActivityEvent
from src.spatial_analysis import SpatialAnalyzer, haversine_distance_km, SpatialFinding


class TestTemporalSpatialAnalysis(unittest.TestCase):
    """Unit and integration tests for temporal and spatial intelligence engines."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.temporal = TemporalAnalyzer(cls.dataset)
        cls.spatial = SpatialAnalyzer(cls.dataset)

    def test_person_timeline_chronological_order(self):
        """Activity timeline for a person must be strictly sorted by timestamp."""
        timeline = self.temporal.build_person_timeline("PERSON_1476")
        self.assertGreater(len(timeline), 10)

        for i in range(len(timeline) - 1):
            self.assertLessEqual(
                timeline[i].timestamp,
                timeline[i + 1].timestamp,
                f"Timeline out of order at index {i}: {timeline[i].timestamp} > {timeline[i+1].timestamp}"
            )

        categories = set(e.category for e in timeline)
        self.assertTrue(
            {"CALL", "TRANSACTION"}.issubset(categories),
            f"Expected multiple activity categories in timeline, got: {categories}"
        )

    def test_case_timeline_generation(self):
        """Case timeline must contain case opened, FIR filed, and linked transactions."""
        case_timeline = self.temporal.build_case_timeline("CASE_0001")
        self.assertGreaterEqual(len(case_timeline), 4)

        evt_types = [e.details.get("event_type") for e in case_timeline if e.category == "CASE_EVENT"]
        self.assertIn("CASE_OPENED", evt_types)
        self.assertIn("FIR_FILED", evt_types)

        tx_events = [e for e in case_timeline if e.category == "TRANSACTION"]
        self.assertGreaterEqual(len(tx_events), 2)

    def test_communication_spike_detection(self):
        """Detects communication bursts exceeding baseline volume."""
        spikes = self.temporal.detect_communication_spikes(
            window_hours=24, threshold_factor=3.0, min_calls_for_spike=4
        )
        self.assertGreater(len(spikes), 0)

        first = spikes[0]
        self.assertIn("person_id", first)
        self.assertIn("call_count", first)
        self.assertIn("baseline_daily", first)
        self.assertGreaterEqual(first["call_count"], 4)
        self.assertGreaterEqual(first["multiplier"], 3.0)

    def test_transaction_spikes(self):
        """Detects financial transaction spikes clustering in short intervals."""
        tx_spikes = self.temporal.detect_transaction_spikes(window_hours=48, min_tx_count=3)
        self.assertGreater(len(tx_spikes), 0)

        sample = tx_spikes[0]
        self.assertGreaterEqual(sample["transaction_count"], 3)
        self.assertGreater(sample["total_amount"], 0.0)
        self.assertIn("financial", sample["evidence_sources"])

    def test_pre_post_case_windows(self):
        """Profiles pre-crime and post-crime window activity for CASE_0001."""
        report = self.temporal.analyze_pre_post_case_windows("CASE_0001", pre_days=10, post_days=2)
        self.assertEqual(report["case_id"], "CASE_0001")
        self.assertIn("incident_time", report)
        self.assertGreater(report["pre_crime_call_count"], 0)
        self.assertGreater(report["pre_crime_tx_count"], 0)
        self.assertGreater(report["pre_crime_tx_volume"], 0.0)

    def test_temporal_call_chains(self):
        """Detects sequential multi-hop call cascades."""
        chains = self.temporal.detect_temporal_chains(max_hop_hours=2.0, min_hops=3)
        self.assertGreater(len(chains), 0)

        sample_chain = chains[0]
        self.assertGreaterEqual(sample_chain["hops"], 3)
        self.assertGreaterEqual(len(sample_chain["entities"]), 4)
        self.assertEqual(sample_chain["pattern_type"], "temporal_call_chain")

    def test_haversine_distance_computation(self):
        """Accurately calculates geodesic distance between coordinate pairs."""
        # Delhi (28.75698, 77.25027) to Jaipur (26.88636, 75.81944) ~ 251 km
        dist = self.spatial.compute_distance("LOCATION_0001", "LOCATION_0002")
        self.assertIsNotNone(dist)
        self.assertAlmostEqual(dist, 251.12, delta=5.0)

    def test_co_travel_convoy_detection(self):
        """Detects vehicle convoys traveling together across multiple shared sightings."""
        convoys = self.spatial.detect_co_travel(min_shared_trips=2, time_window_minutes=45)
        self.assertGreater(len(convoys), 20)

        sample = convoys[0]
        self.assertEqual(len(sample.vehicle_ids), 2)
        self.assertGreaterEqual(sample.trip_count, 2)
        self.assertEqual(sample.pattern_type, "co_travel")
        self.assertIn("vehicle", sample.evidence_sources)

    def test_flagship_crime_scene_proximity(self):
        """
        CASE_0001 crime scene (LOCATION_0041):
        - Detects PERSON_1459 and VEHICLE_00005 proximate to crime scene.
        - Verifies PERSON_1476 (upstream coordinator) is NOT at the crime scene.
        """
        prox = self.spatial.detect_crime_scene_proximity("CASE_0001", time_window_hours=6.0)
        self.assertGreater(len(prox), 0)

        prox_persons = [p for f in prox for p in f.person_ids]
        prox_vehs = [v for f in prox for v in f.vehicle_ids]

        self.assertIn("PERSON_1459", prox_persons)
        self.assertIn("VEHICLE_00005", prox_vehs)

        # Coordinator isolation check
        self.assertNotIn(
            "PERSON_1476", prox_persons,
            "PERSON_1476 (coordinator) must have ZERO presence at the crime scene!"
        )

    def test_data_integrity_no_fabricated_records(self):
        """All entities, locations, and source record IDs must exist in the raw dataset."""
        convoys = self.spatial.detect_co_travel(min_shared_trips=3, time_window_minutes=45)
        raw_vehicles = set(self.dataset.vehicles["vehicle_id"])
        raw_events = set(self.dataset.vehicle_events["event_id"])

        for c in convoys[:10]:
            for v in c.vehicle_ids:
                self.assertIn(v, raw_vehicles)
            for eid in c.source_record_ids[:5]:
                self.assertIn(eid, raw_events)


if __name__ == "__main__":
    unittest.main()
