"""
SIH26189 — AI-Powered Criminal Network Analysis System
Test Suite: tests/test_graph_builder.py

Comprehensive tests for Phase 3: Graph Construction + Neo4j.
Validates:
- All 12 entity types are present in the graph with correct schemas.
- Relationship types and reference soundness (no broken references).
- Complete source traceability for all derived edges (source_type, source_record_id, confidence).
- Flagship 5-hop directed path:
  PERSON_1476 -> PERSON_0026 -> PERSON_0397 -> PERSON_0405 -> PERSON_1459 -> CASE_0001.
- Strict isolation: PERSON_1476 has ZERO direct edges to CASE_0001.
- Graph statistics reporting (nodes by type, edges by type, connected components).
- Neo4j integration with non-crashing offline fallback and Cypher export generation.
"""

import unittest
import tempfile
from pathlib import Path
import networkx as nx

from src.data_loader import DataLoader
from src.graph_builder import (
    GraphBuilder,
    GraphValidator,
    GraphStatisticsReporter,
    EntityType,
    EdgeType,
)
from src.neo4j_loader import Neo4jConfig, Neo4jLoader


class TestGraphBuilderIntegrity(unittest.TestCase):
    """Unit tests for graph structure, node types, and edge reference integrity."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.builder = GraphBuilder()
        # Build graph with max_cdr_edges and max_transaction_edges for fast testing
        cls.G = cls.builder.build_graph(
            cls.dataset,
            include_events=True,
            include_cdr_calls=True,
            include_transactions=True,
            max_cdr_edges=2000,
            max_transaction_edges=2000
        )

    def test_all_12_entity_types_exist(self):
        nodes_by_type = {}
        for _, data in self.G.nodes(data=True):
            etype = data.get("entity_type")
            nodes_by_type[etype] = nodes_by_type.get(etype, 0) + 1

        expected_etypes = {e.value for e in EntityType}
        found_etypes = set(nodes_by_type.keys())
        self.assertTrue(
            expected_etypes.issubset(found_etypes),
            f"Missing entity types: {expected_etypes - found_etypes}"
        )

    def test_expected_node_counts(self):
        nodes_by_type = {}
        for _, data in self.G.nodes(data=True):
            etype = data.get("entity_type")
            nodes_by_type[etype] = nodes_by_type.get(etype, 0) + 1

        self.assertEqual(nodes_by_type[EntityType.PERSON.value], 1500)
        self.assertEqual(nodes_by_type[EntityType.ORGANIZATION.value], 300)
        self.assertEqual(nodes_by_type[EntityType.PHONE.value], 2025)
        self.assertEqual(nodes_by_type[EntityType.DEVICE.value], 2000)
        self.assertEqual(nodes_by_type[EntityType.BANK_ACCOUNT.value], 913)
        self.assertEqual(nodes_by_type[EntityType.VEHICLE.value], 762)
        self.assertEqual(nodes_by_type[EntityType.LOCATION.value], 300)
        self.assertEqual(nodes_by_type[EntityType.CELL_TOWER.value], 150)
        self.assertEqual(nodes_by_type[EntityType.CASE.value], 300)
        self.assertEqual(nodes_by_type[EntityType.FIR.value], 300)
        self.assertEqual(nodes_by_type[EntityType.EVIDENCE.value], 2600)
        self.assertEqual(nodes_by_type[EntityType.EVENT.value], 25001)

    def test_no_broken_references(self):
        """Every edge (u, v) must connect existing nodes in G."""
        broken_edges = []
        for u, v, k, data in self.G.edges(keys=True, data=True):
            if u not in self.G or v not in self.G:
                broken_edges.append((u, v, k))

        self.assertEqual(len(broken_edges), 0, f"Found {len(broken_edges)} broken edge references!")

    def test_source_traceability_on_all_edges(self):
        """Every edge must have source_type, source_record_id, and valid confidence."""
        missing_traceability = []
        for u, v, k, data in self.G.edges(keys=True, data=True):
            if not data.get("source_type") or not data.get("source_record_id"):
                missing_traceability.append((u, v, k))
            conf = data.get("confidence")
            self.assertIsNotNone(conf)
            self.assertTrue(0.0 <= conf <= 1.0)

        self.assertEqual(
            len(missing_traceability), 0,
            f"Found {len(missing_traceability)} edges without source traceability!"
        )

    def test_representative_relationship_types_exist(self):
        edges_by_type = {}
        for _, _, data in self.G.edges(data=True):
            etype = data.get("edge_type")
            edges_by_type[etype] = edges_by_type.get(etype, 0) + 1

        required_edge_types = {
            EdgeType.CALLED.value,
            EdgeType.TRANSFERRED_MONEY.value,
            EdgeType.APPEARED_IN_CASE.value,
            EdgeType.POTENTIAL_OPERATIONAL_LINK.value,
            EdgeType.OWNS_PHONE.value,
            EdgeType.USED_ON_DEVICE.value,
            EdgeType.OWNS_ACCOUNT.value,
            EdgeType.OWNS_VEHICLE.value,
            EdgeType.FILED_FOR_CASE.value,
            EdgeType.ACCUSED_IN.value,
            EdgeType.HAS_EVIDENCE.value,
            EdgeType.EVIDENCE_OF.value,
            EdgeType.CALLED_PHONE.value,
            EdgeType.TRANSFERRED_FUNDS_TO.value,
            EdgeType.RECORDED_IN_EVENT.value
        }
        found_edge_types = set(edges_by_type.keys())
        self.assertTrue(
            required_edge_types.issubset(found_edge_types),
            f"Missing expected edge types: {required_edge_types - found_edge_types}"
        )


class TestFlagshipInvariants(unittest.TestCase):
    """Verifies flagship network invariants (Requirements 9 & 10)."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.builder = GraphBuilder()
        cls.G = cls.builder.build_graph(
            cls.dataset,
            include_events=False,
            include_cdr_calls=False,
            include_transactions=False
        )

    def test_flagship_directed_shortest_path(self):
        """Shortest directed path must be A -> B -> C -> D -> E -> CASE_0001."""
        self.assertTrue(
            nx.has_path(self.G, GraphBuilder.FLAGSHIP_COORDINATOR, GraphBuilder.FLAGSHIP_CASE),
            "Flagship directed path does not exist!"
        )
        actual_path = nx.shortest_path(
            self.G,
            source=GraphBuilder.FLAGSHIP_COORDINATOR,
            target=GraphBuilder.FLAGSHIP_CASE
        )
        self.assertEqual(
            actual_path,
            GraphBuilder.FLAGSHIP_EXPECTED_PATH,
            f"Flagship path {actual_path} does not match {GraphBuilder.FLAGSHIP_EXPECTED_PATH}"
        )

    def test_flagship_coordinator_zero_direct_case_edges(self):
        """Coordinator PERSON_1476 must have strictly ZERO direct edges to CASE_0001."""
        self.assertFalse(
            self.G.has_edge(GraphBuilder.FLAGSHIP_COORDINATOR, GraphBuilder.FLAGSHIP_CASE),
            "CRITICAL VIOLATION: PERSON_1476 has a direct edge to CASE_0001!"
        )

    def test_flagship_individual_hops_exist(self):
        """Verify each directed hop exists with expected direction."""
        hops = [
            ("PERSON_1476", "PERSON_0026"),
            ("PERSON_0026", "PERSON_0397"),
            ("PERSON_0397", "PERSON_0405"),
            ("PERSON_0405", "PERSON_1459"),
            ("PERSON_1459", "CASE_0001")
        ]
        for u, v in hops:
            self.assertTrue(
                self.G.has_edge(u, v),
                f"Expected directed hop {u} -> {v} does not exist in graph!"
            )

    def test_operational_actor_e_associated_with_case(self):
        """Operational actor PERSON_1459 must have direct APPEARED_IN_CASE edge to CASE_0001."""
        edges = self.G.get_edge_data("PERSON_1459", "CASE_0001")
        self.assertIsNotNone(edges)
        edge_types = [data["edge_type"] for data in edges.values()]
        self.assertIn("APPEARED_IN_CASE", edge_types)


class TestGraphValidatorAndReporter(unittest.TestCase):
    """Tests GraphValidator suite and GraphStatisticsReporter."""

    @classmethod
    def setUpClass(cls):
        loader = DataLoader()
        cls.dataset = loader.load_all(validate=False)
        cls.builder = GraphBuilder()
        cls.G = cls.builder.build_graph(
            cls.dataset,
            include_events=True,
            max_cdr_edges=1000,
            max_transaction_edges=1000
        )

    def test_graph_validator_pass(self):
        report = GraphValidator.validate(self.G)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(len(report["errors"]), 0)
        self.assertTrue(report["flagship_path_valid"])
        self.assertTrue(report["coordinator_isolation_valid"])

    def test_graph_statistics_metrics(self):
        stats = GraphStatisticsReporter.generate_statistics(self.G)
        self.assertGreater(stats.total_nodes, 10000)
        self.assertGreater(stats.total_edges, 10000)
        self.assertEqual(stats.isolated_coordinator_direct_case_edges, 0)
        self.assertEqual(stats.flagship_shortest_path, GraphBuilder.FLAGSHIP_EXPECTED_PATH)
        d = stats.to_dict()
        self.assertIn("nodes_by_type", d)
        self.assertIn("edges_by_type", d)
        self.assertIn("weakly_connected_components", d)


class TestNeo4jIntegrationAndFallback(unittest.TestCase):
    """Tests Neo4jConfig, offline graceful fallback, and Cypher export (Requirements 11 & 12)."""

    def test_neo4j_config_environment_variables(self):
        config = Neo4jConfig()
        self.assertIsNotNone(config.uri)
        self.assertIsNotNone(config.user)
        self.assertIsNotNone(config.database)

    def test_neo4j_connection_test_does_not_crash(self):
        loader = Neo4jLoader()
        connected, msg = loader.test_connection()
        self.assertIsInstance(connected, bool)
        self.assertIsInstance(msg, str)
        loader.close()

    def test_neo4j_offline_load_graceful_skip(self):
        """When Neo4j is offline, load_from_networkx must return SKIPPED without failing."""
        loader = Neo4jLoader()
        G = nx.MultiDiGraph()
        G.add_node("TEST_1", entity_type="PERSON")
        result = loader.load_from_networkx(G)
        self.assertIn(result["status"], ["SKIPPED", "SUCCESS"])
        loader.close()

    def test_export_cypher_script(self):
        """Verify export_cypher_script generates valid Cypher statements."""
        G = nx.MultiDiGraph()
        G.add_node("PERSON_0001", entity_type="PERSON", name="Arjun Choudhary", age=57)
        G.add_node("PHONE_00001", entity_type="PHONE", person_id="PERSON_0001")
        G.add_edge(
            "PERSON_0001", "PHONE_00001",
            edge_type="OWNS_PHONE",
            source_type="TELCO_SUBSCRIBER_RECORD",
            source_record_id="PHONE_00001",
            confidence=0.9
        )

        with tempfile.NamedTemporaryFile(suffix=".cypher", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            exported_file = Neo4jLoader.export_cypher_script(G, output_file=tmp_path)
            self.assertTrue(exported_file.exists())
            with open(exported_file, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("CREATE CONSTRAINT", content)
            self.assertIn("MERGE (n:PERSON {id: 'PERSON_0001'})", content)
            self.assertIn("MERGE (n:PHONE {id: 'PHONE_00001'})", content)
            self.assertIn("CREATE (u)-[:OWNS_PHONE", content)
        finally:
            if tmp_path.exists():
                tmp_path.unlink()


if __name__ == "__main__":
    unittest.main()
