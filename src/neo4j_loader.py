"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/neo4j_loader.py

Phase 3: Neo4j Integration & Offline Exporter
Provides production-ready integration with Neo4j graph database:
- Environment variable configuration (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE).
- Non-blocking connection health checks with graceful offline fallback (never crashes when Neo4j is offline).
- Idempotent schema constraint generation for all 12 entity types.
- High-performance batched loading (UNWIND) for nodes and relationships.
- Standalone Cypher script exporter (.cypher) for offline ingestion via cypher-shell or Neo4j Desktop.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
import networkx as nx

from src.utils.logger import get_logger

logger = get_logger("Neo4jLoader")


@dataclass
class Neo4jConfig:
    """Connection configuration loaded from environment variables."""
    uri: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user: str = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
    password: str = os.getenv("NEO4J_PASSWORD", "password")
    database: str = os.getenv("NEO4J_DATABASE", "neo4j")


class Neo4jLoader:
    """
    Manages connection, schema constraints, batch ingestion, and offline export
    between NetworkX MultiDiGraph and Neo4j.
    """

    def __init__(self, config: Optional[Neo4jConfig] = None):
        self.config = config or Neo4jConfig()
        self._driver = None

    def get_driver(self):
        """Lazily initializes and returns Neo4j driver if reachable."""
        if self._driver is None:
            try:
                import neo4j
                self._driver = neo4j.GraphDatabase.driver(
                    self.config.uri,
                    auth=(self.config.user, self.config.password)
                )
            except Exception as e:
                logger.debug(f"Failed to initialize Neo4j driver: {e}")
                return None
        return self._driver

    def close(self) -> None:
        """Closes the Neo4j driver connection."""
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None

    def test_connection(self) -> Tuple[bool, str]:
        """
        Tests whether the Neo4j server is currently reachable and authenticated.
        Returns:
            (True, "Connected...") if successful.
            (False, "Reason...") if unreachable (does NOT raise an exception).
        """
        try:
            import neo4j
        except ImportError:
            msg = "Python 'neo4j' package is not installed."
            logger.warning(msg)
            return (False, msg)

        try:
            driver = neo4j.GraphDatabase.driver(
                self.config.uri,
                auth=(self.config.user, self.config.password),
                connection_timeout=2.0
            )
            driver.verify_connectivity()
            driver.close()
            msg = f"Successfully connected to Neo4j at {self.config.uri}"
            logger.info(msg)
            return (True, msg)
        except Exception as e:
            msg = f"Neo4j is not reachable at {self.config.uri} ({type(e).__name__}: {e})"
            logger.info(msg)
            return (False, msg)

    def create_schema_constraints(self) -> Dict[str, Any]:
        """
        Creates uniqueness constraints for all 12 entity labels in Neo4j.
        Gracefully skips if Neo4j is offline.
        """
        connected, msg = self.test_connection()
        if not connected:
            return {"status": "SKIPPED", "reason": msg, "constraints_created": 0}

        driver = self.get_driver()
        labels = [
            "PERSON", "ORGANIZATION", "PHONE", "DEVICE", "BANK_ACCOUNT",
            "VEHICLE", "LOCATION", "CELL_TOWER", "CASE", "FIR", "EVENT", "EVIDENCE"
        ]
        created = 0

        with driver.session(database=self.config.database) as session:
            for label in labels:
                query = (
                    f"CREATE CONSTRAINT {label.lower()}_id_unique IF NOT EXISTS "
                    f"FOR (n:{label}) REQUIRE n.id IS UNIQUE"
                )
                try:
                    session.run(query)
                    created += 1
                except Exception as e:
                    logger.warning(f"Constraint creation warning for {label}: {e}")

        logger.info(f"Created {created} schema constraints in Neo4j.")
        return {"status": "SUCCESS", "constraints_created": created}

    def load_from_networkx(
        self,
        G: nx.MultiDiGraph,
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        Loads the in-memory NetworkX MultiDiGraph into Neo4j using batched UNWIND Cypher queries.
        If Neo4j is offline, returns a clean status without raising errors.
        """
        connected, msg = self.test_connection()
        if not connected:
            logger.warning(f"Neo4j offline. Skipping live load: {msg}")
            return {
                "status": "SKIPPED",
                "reason": msg,
                "nodes_loaded": 0,
                "edges_loaded": 0
            }

        driver = self.get_driver()
        nodes_loaded = 0
        edges_loaded = 0

        # Group nodes by entity_type for label assignment
        nodes_by_type: Dict[str, List[Dict[str, Any]]] = {}
        for nid, data in G.nodes(data=True):
            etype = data.get("entity_type", "ENTITY")
            clean_props = {k: v for k, v in data.items() if v is not None and k != "entity_type"}
            clean_props["id"] = nid
            if etype not in nodes_by_type:
                nodes_by_type[etype] = []
            nodes_by_type[etype].append(clean_props)

        with driver.session(database=self.config.database) as session:
            # Batch load nodes
            for etype, node_list in nodes_by_type.items():
                for i in range(0, len(node_list), batch_size):
                    batch = node_list[i : i + batch_size]
                    query = (
                        f"UNWIND $batch AS row "
                        f"MERGE (n:{etype} {{id: row.id}}) "
                        f"SET n += row"
                    )
                    session.run(query, batch=batch)
                    nodes_loaded += len(batch)

            # Group edges by edge_type
            edges_by_type: Dict[str, List[Dict[str, Any]]] = {}
            for u, v, data in G.edges(data=True):
                rtype = data.get("edge_type", "RELATIONSHIP")
                edge_props = {k: v for k, v in data.items() if v is not None and k != "edge_type"}
                edge_props["source_id"] = u
                edge_props["target_id"] = v
                if rtype not in edges_by_type:
                    edges_by_type[rtype] = []
                edges_by_type[rtype].append(edge_props)

            # Batch load edges
            for rtype, edge_list in edges_by_type.items():
                for i in range(0, len(edge_list), batch_size):
                    batch = edge_list[i : i + batch_size]
                    query = (
                        f"UNWIND $batch AS row "
                        f"MATCH (u {{id: row.source_id}}), (v {{id: row.target_id}}) "
                        f"CREATE (u)-[r:{rtype}]->(v) "
                        f"SET r += row"
                    )
                    session.run(query, batch=batch)
                    edges_loaded += len(batch)

        logger.info(f"Live load complete: {nodes_loaded} nodes, {edges_loaded} relationships loaded into Neo4j.")
        return {
            "status": "SUCCESS",
            "nodes_loaded": nodes_loaded,
            "edges_loaded": edges_loaded
        }

    @classmethod
    def export_cypher_script(
        cls,
        G: nx.MultiDiGraph,
        output_file: Union[str, Path] = "export_sih26189_graph.cypher",
        max_edges: Optional[int] = None
    ) -> Path:
        """
        Exports the graph to a standalone Cypher script (.cypher) that can be imported
        into Neo4j using cypher-shell or Neo4j Desktop.
        """
        out_path = Path(output_file)
        logger.info(f"Exporting Cypher ingestion script to {out_path}...")

        labels = [
            "PERSON", "ORGANIZATION", "PHONE", "DEVICE", "BANK_ACCOUNT",
            "VEHICLE", "LOCATION", "CELL_TOWER", "CASE", "FIR", "EVENT", "EVIDENCE"
        ]

        with open(out_path, "w", encoding="utf-8") as f:
            f.write("// SIH26189 Criminal Network Graph Export\n")
            f.write("// Ingest with: cypher-shell -u neo4j -p <password> -f <filename>\n\n")

            # 1. Constraints
            f.write("// 1. Uniqueness Constraints\n")
            for label in labels:
                f.write(
                    f"CREATE CONSTRAINT {label.lower()}_id_unique IF NOT EXISTS "
                    f"FOR (n:{label}) REQUIRE n.id IS UNIQUE;\n"
                )
            f.write("\n")

            # 2. Nodes
            f.write("// 2. Entity Nodes\n")
            for nid, data in G.nodes(data=True):
                etype = data.get("entity_type", "ENTITY")
                # Format properties
                prop_parts = [f"id: '{nid}'"]
                for k, v in data.items():
                    if k in ("entity_type", "id") or v is None:
                        continue
                    if isinstance(v, (int, float)):
                        prop_parts.append(f"{k}: {v}")
                    elif isinstance(v, bool):
                        prop_parts.append(f"{k}: {'true' if v else 'false'}")
                    else:
                        safe_val = str(v).replace("'", "\\'")
                        prop_parts.append(f"{k}: '{safe_val}'")
                props_str = ", ".join(prop_parts)
                f.write(f"MERGE (n:{etype} {{id: '{nid}'}}) SET n += {{{props_str}}};\n")

            f.write("\n// 3. Relationships\n")
            edge_iter = G.edges(data=True)
            count = 0
            for u, v, data in edge_iter:
                if max_edges is not None and count >= max_edges:
                    break
                rtype = data.get("edge_type", "RELATIONSHIP")
                prop_parts = []
                for k, val in data.items():
                    if k in ("edge_type", "key") or val is None:
                        continue
                    if isinstance(val, (int, float)):
                        prop_parts.append(f"{k}: {val}")
                    elif isinstance(val, bool):
                        prop_parts.append(f"{k}: {'true' if val else 'false'}")
                    else:
                        safe_val = str(val).replace("'", "\\'")
                        prop_parts.append(f"{k}: '{safe_val}'")

                props_clause = f" {{{', '.join(prop_parts)}}}" if prop_parts else ""
                f.write(
                    f"MATCH (u {{id: '{u}'}}), (v {{id: '{v}'}}) "
                    f"CREATE (u)-[:{rtype}{props_clause}]->(v);\n"
                )
                count += 1

        logger.info(f"Successfully generated Cypher script: {out_path} ({count} edges written).")
        return out_path
