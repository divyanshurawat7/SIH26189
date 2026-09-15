"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: tests/test_api.py

Phase 7: Investigation REST API Backend Tests
Tests all endpoints, Pydantic response serialization, 404/400 validation,
filter queries, and the flagship CASE_0001 dynamic investigation dossier.
"""

import unittest
from fastapi.testclient import TestClient

from src.api import app, init_app_state, get_app_state


class TestInvestigationAPI(unittest.TestCase):
    """Integration test suite for the Investigation REST API."""

    @classmethod
    def setUpClass(cls):
        """Initializes the backend intelligence engine once for all tests."""
        init_app_state()
        cls.client = TestClient(app)
        cls.state = get_app_state()

    # =========================================================================
    # 1. Health Endpoint Tests
    # =========================================================================

    def test_health_endpoint(self):
        """Verify GET /health returns 200 with required keys and metadata."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "SIH26189 Investigation API")
        self.assertEqual(data["dataset"], "synthetic")
        self.assertEqual(data["phases_completed"], 6)

    def test_overview_endpoint(self):
        """Verify GET /overview returns aggregate stats, top influencers, and findings."""
        response = self.client.get("/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_persons"], 1500)
        self.assertEqual(data["total_cases"], 300)
        self.assertEqual(data["total_networks"], 12)
        self.assertGreater(data["total_findings"], 0)
        self.assertGreater(len(data["top_influencers"]), 0)
        # Verify PERSON_1476 is recognized in top influencers
        coord_ids = [inf["person_id"] for inf in data["top_influencers"]]
        self.assertIn("PERSON_1476", coord_ids)

    # =========================================================================
    # 2. Person Endpoints Tests
    # =========================================================================

    def test_person_lookup_flagship_coordinator(self):
        """Verify GET /persons/PERSON_1476 returns coordinator details."""
        response = self.client.get("/persons/PERSON_1476")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["person_id"], "PERSON_1476")
        self.assertEqual(data["predicted_role"], "UPSTREAM_COORDINATOR")
        self.assertTrue(data["criminal_significance"])
        self.assertGreaterEqual(data["confidence"], 0.80)
        self.assertGreaterEqual(data["evidence_diversity"], 4)
        self.assertIn("investigator_narrative", data)
        self.assertIn("graph_features", data)
        self.assertGreater(data["graph_features"]["degree"], 0)

    def test_person_lookup_innocent_control(self):
        """Verify GET /persons/PERSON_0553 is correctly protected as non-criminal."""
        response = self.client.get("/persons/PERSON_0553")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["person_id"], "PERSON_0553")
        self.assertFalse(data["criminal_significance"])
        self.assertIn("non-criminal", data["investigator_narrative"].lower())

    def test_person_unknown_404(self):
        """Verify GET /persons/{unknown} returns 404 Not Found."""
        response = self.client.get("/persons/PERSON_999999")
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    def test_person_network(self):
        """Verify GET /persons/PERSON_1476/network returns local topology and paths."""
        response = self.client.get("/persons/PERSON_1476/network")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["person_id"], "PERSON_1476")
        self.assertIsInstance(data["direct_connections"], list)
        self.assertGreater(len(data["direct_connections"]), 0)
        self.assertIsInstance(data["operational_paths"], list)
        self.assertGreater(len(data["operational_paths"]), 0)
        self.assertIsInstance(data["roles_of_connected_persons"], dict)
        self.assertIsInstance(data["strongest_relationships"], list)

    def test_person_evidence(self):
        """Verify GET /persons/PERSON_1476/evidence returns traceable source items."""
        response = self.client.get("/persons/PERSON_1476/evidence")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        first_item = data[0]
        self.assertIn("source_type", first_item)
        self.assertIn("source_record_id", first_item)
        self.assertIn("confidence", first_item)
        self.assertIn("description", first_item)

    # =========================================================================
    # 3. Case Endpoints Tests
    # =========================================================================

    def test_case_lookup_flagship(self):
        """Verify GET /cases/CASE_0001 returns case details, FIR, and key actors."""
        response = self.client.get("/cases/CASE_0001")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["case_id"], "CASE_0001")
        self.assertEqual(data["fir_information"]["fir_id"], "FIR_0001")
        self.assertEqual(data["important_persons"]["upstream_coordinator"], "PERSON_1476")
        self.assertIn("PERSON_1459", data["important_persons"]["operational_members"])
        self.assertIsInstance(data["locations"], list)
        self.assertIsInstance(data["vehicles"], list)
        self.assertIn("investigation_narrative", data)

    def test_case_unknown_404(self):
        """Verify GET /cases/{unknown} returns 404 Not Found."""
        response = self.client.get("/cases/CASE_999999")
        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    def test_case_timeline(self):
        """Verify GET /cases/CASE_0001/timeline returns chronologically ordered events."""
        response = self.client.get("/cases/CASE_0001/timeline")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["case_id"], "CASE_0001")
        self.assertGreater(data["total_events"], 0)
        self.assertIsInstance(data["events"], list)
        ev = data["events"][0]
        self.assertIn("timestamp", ev)
        self.assertIn("event_type", ev)
        self.assertIn("source_record_id", ev)

    def test_case_evidence_grouped(self):
        """Verify GET /cases/CASE_0001/evidence returns categorized evidence dict."""
        response = self.client.get("/cases/CASE_0001/evidence")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["case_id"], "CASE_0001")
        self.assertGreater(data["total_records"], 0)
        self.assertGreater(data["categories_count"], 0)
        grouped = data["evidence_by_category"]
        self.assertIsInstance(grouped, dict)
        # Check that at least FIR_RECORD and EVIDENCE_RECORD are present
        self.assertTrue(any(cat in grouped for cat in ["FIR_RECORD", "EVIDENCE_RECORD", "LOCATION_EVENT"]))

    # =========================================================================
    # 4. Network Endpoints Tests
    # =========================================================================

    def test_network_lookup(self):
        """Verify GET /networks/NET_001 returns syndicate structure."""
        response = self.client.get("/networks/NET_001")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["network_id"], "NET_001")
        self.assertEqual(data["primary_case"], "CASE_0001")
        self.assertEqual(data["upstream_coordinator"], "PERSON_1476")
        self.assertIsInstance(data["brokers"], list)
        self.assertIsInstance(data["operational_members"], list)
        self.assertIn("investigation_narrative", data)

    def test_network_invalid_404(self):
        """Verify GET /networks/{invalid} returns 404."""
        response = self.client.get("/networks/INVALID_NET")
        self.assertEqual(response.status_code, 404)

    # =========================================================================
    # 5. Findings Endpoints Tests
    # =========================================================================

    def test_findings_list(self):
        """Verify GET /findings returns list of detected behavioral patterns."""
        response = self.client.get("/findings")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        first = data[0]
        self.assertIn("finding_id", first)
        self.assertIn("finding_type", first)
        self.assertIn("score", first)
        self.assertIn("confidence", first)

    def test_findings_filter_case(self):
        """Verify GET /findings?case_id=CASE_0001 filters by case."""
        response = self.client.get("/findings?case_id=CASE_0001")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        for f in data:
            self.assertEqual(f["case"], "CASE_0001")

    def test_findings_filter_confidence(self):
        """Verify GET /findings?min_confidence=0.85 filters by confidence."""
        response = self.client.get("/findings?min_confidence=0.85")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for f in data:
            self.assertGreaterEqual(f["confidence"], 0.85)

    def test_finding_detail(self):
        """Verify GET /findings/{id} returns complete finding with evidence items."""
        # Pick the first finding ID
        all_f = self.state.findings
        self.assertGreater(len(all_f), 0)
        fid = all_f[0].finding_id

        response = self.client.get(f"/findings/{fid}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["finding_id"], fid)
        self.assertIn("supporting_evidence", data)
        self.assertIn("source_records", data)
        self.assertIn("explanation", data)

    def test_finding_unknown_404(self):
        """Verify GET /findings/{unknown} returns 404."""
        response = self.client.get("/findings/FINDING_NONEXISTENT_9999")
        self.assertEqual(response.status_code, 404)

    # =========================================================================
    # 6. Cross-Case Endpoints Tests
    # =========================================================================

    def test_cross_case_verified_or_incidental(self):
        """Verify GET /cross-case/{entity} handles linkage strength properly."""
        # Find any entity from cross-case findings if available, or test an entity
        xcase_findings = [f for f in self.state.findings if f.pattern_type == "cross_case_entity_link"]
        if xcase_findings:
            f0 = xcase_findings[0]
            target_entity = f0.metadata.get("shared_entity_id") or f0.entities[0]
            response = self.client.get(f"/cross-case/{target_entity}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["entity"], target_entity)
            self.assertEqual(data["strength_of_linkage"], "strong_criminal_coordination")
            self.assertGreaterEqual(len(data["connected_cases"]), 1)

    def test_cross_case_unknown_404(self):
        """Verify GET /cross-case/{unknown} returns 404."""
        response = self.client.get("/cross-case/UNKNOWN_ENTITY_XYZ")
        self.assertEqual(response.status_code, 404)

    # =========================================================================
    # 7. Investigation Dossier (Primary Demo Endpoint) Tests
    # =========================================================================

    def test_investigation_dossier_flagship_case_0001(self):
        """
        Verify GET /investigation/CASE_0001 returns complete Phase 6 dossier:
        coordinator PERSON_1476, 5-hop chain, categorized evidence, diversity, narrative.
        """
        response = self.client.get("/investigation/CASE_0001")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Case summary & coordinator
        self.assertEqual(data["case_id"], "CASE_0001")
        self.assertEqual(data["upstream_coordinator"], "PERSON_1476")
        self.assertEqual(
            data["operational_chain"],
            ["PERSON_1476", "PERSON_0026", "PERSON_0397", "PERSON_0405", "PERSON_1459", "CASE_0001"]
        )

        # Intermediary roles
        self.assertIn("PERSON_0026", data["brokers"])
        self.assertIn("PERSON_1459", data["operational_members"])

        # Traceability & evidence
        self.assertGreaterEqual(data["confidence"], 0.90)
        self.assertIsInstance(data["financial_evidence"], list)
        self.assertIsInstance(data["communication_evidence"], list)
        self.assertIsInstance(data["spatial_evidence"], list)
        self.assertIsInstance(data["vehicle_evidence"], list)
        self.assertIsInstance(data["temporal_evidence"], list)
        self.assertIn("investigator_narrative", data)

    def test_investigation_dossier_dynamic_case_0002(self):
        """Verify GET /investigation/CASE_0002 dynamically generates without hardcoding."""
        response = self.client.get("/investigation/CASE_0002")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["case_id"], "CASE_0002")
        self.assertIn("case_summary", data)
        self.assertIn("investigator_narrative", data)

    def test_investigation_dossier_unknown_404(self):
        """Verify GET /investigation/{unknown} returns 404."""
        response = self.client.get("/investigation/CASE_88888")
        self.assertEqual(response.status_code, 404)

    # =========================================================================
    # 8. Validation & Error Handling Tests
    # =========================================================================

    def test_invalid_parameters_400(self):
        """Verify invalid query parameter (e.g. min_confidence > 1.0) returns 400 Bad Request."""
        response = self.client.get("/findings?min_confidence=1.5")
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_json_serialization_all_routes(self):
        """Verify all response objects serialize to JSON without datetime or set errors."""
        endpoints = [
            "/health",
            "/persons/PERSON_1476",
            "/persons/PERSON_1476/network",
            "/persons/PERSON_1476/evidence",
            "/cases/CASE_0001",
            "/cases/CASE_0001/timeline",
            "/cases/CASE_0001/evidence",
            "/networks/NET_001",
            "/findings?min_confidence=0.8",
            "/investigation/CASE_0001"
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 200, f"Failed at endpoint {ep}")
            # Ensure JSON decoding succeeds
            payload = res.json()
            self.assertIsInstance(payload, (dict, list), f"Payload not dict or list for {ep}")


if __name__ == "__main__":
    unittest.main()
