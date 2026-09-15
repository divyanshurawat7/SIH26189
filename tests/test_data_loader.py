"""
Unit and integration tests for src/data_loader.py.
Verifies table loading, row counts, schema integrity, and foreign keys.
"""

import unittest
from pathlib import Path
import pandas as pd

from src.data_loader import (
    DataLoader,
    RawDataset,
    ValidationReport,
    DataLoaderError
)

class TestDataLoader(unittest.TestCase):
    """Test suite for DataLoader and RawDataset container."""

    @classmethod
    def setUpClass(cls):
        """Instantiate loader once for the suite."""
        cls.loader = DataLoader()
        cls.dataset = cls.loader.load_all(validate=True)

    def test_01_loader_instantiation(self):
        """Test loader initializes with valid directory."""
        self.assertTrue(self.loader.raw_data_dir.exists())
        self.assertTrue(self.loader.raw_data_dir.is_dir())

        # Non-existent path should raise DataLoaderError
        with self.assertRaises(DataLoaderError):
            DataLoader(Path("/invalid/path/does/not/exist"))

    def test_02_all_tables_loaded(self):
        """Test that all 20 tables are loaded into the dataset container."""
        expected_tables = [
            "persons", "organizations", "phones", "devices", "bank_accounts",
            "vehicles", "locations", "cell_towers", "cases", "fir_records",
            "cdr_records", "financial_transactions", "location_events", "vehicle_events",
            "surveillance_reports", "social_media_records", "criminal_history",
            "intelligence_reports", "relationships", "evidence"
        ]
        self.assertEqual(len(self.dataset.keys()), 20)
        for tbl in expected_tables:
            self.assertTrue(hasattr(self.dataset, tbl), f"Missing table attribute: {tbl}")
            df = getattr(self.dataset, tbl)
            self.assertIsInstance(df, pd.DataFrame, f"Table {tbl} is not a DataFrame")
            self.assertGreater(len(df), 0, f"Table {tbl} is empty")

    def test_03_expected_row_counts(self):
        """Test exact expected row counts for all raw tables."""
        expected_counts = {
            "persons": 1500,
            "organizations": 300,
            "phones": 2025,
            "devices": 2000,
            "bank_accounts": 913,
            "financial_transactions": 20000,
            "vehicles": 762,
            "vehicle_events": 10000,
            "locations": 300,
            "cell_towers": 150,
            "location_events": 15001,
            "cdr_records": 30000,
            "fir_records": 300,
            "surveillance_reports": 5000,
            "social_media_records": 5000,
            "criminal_history": 331,
            "intelligence_reports": 2000,
            "relationships": 8672,
            "evidence": 2600,
            "cases": 300,
        }

        for tbl, expected_count in expected_counts.items():
            actual_count = len(getattr(self.dataset, tbl))
            self.assertEqual(
                actual_count,
                expected_count,
                f"Row count mismatch for '{tbl}': expected {expected_count}, got {actual_count}"
            )

    def test_04_schema_and_fk_validation(self):
        """Test schema validation and relational foreign key integrity."""
        report = self.loader.validate(self.dataset)
        self.assertIsInstance(report, ValidationReport)
        self.assertTrue(report.is_valid, f"Validation failed with errors: {report.errors}")
        self.assertEqual(len(report.errors), 0)
        self.assertEqual(len(report.checked_tables), 20)
        self.assertGreaterEqual(report.foreign_key_checks_passed, 15)
        self.assertEqual(report.foreign_key_checks_failed, 0)

    def test_05_container_access_patterns(self):
        """Test both attribute access and dict-style access on RawDataset."""
        # Attribute access
        self.assertEqual(len(self.dataset.persons), 1500)
        # Dict access
        self.assertEqual(len(self.dataset["persons"]), 1500)

        # Non-existent key should raise KeyError
        with self.assertRaises(KeyError):
            _ = self.dataset["non_existent_table"]

    def test_06_flagship_data_invariants(self):
        """Test that the source dataset keeps the flagship invariants intact."""
        firs = self.dataset.fir_records
        f1 = firs[firs["fir_id"] == "FIR_0001"]
        self.assertEqual(len(f1), 1)
        # Coordinator A must NOT be accused
        self.assertNotEqual(f1.iloc[0]["accused_id"], "PERSON_1476")
        # Operational actor E MUST be accused
        self.assertEqual(f1.iloc[0]["accused_id"], "PERSON_1459")

        # Evidence for FIR_0001 must point to PERSON_1459
        evs = self.dataset.evidence
        e172 = evs[evs["evidence_id"] == "EVID_000172"]
        self.assertEqual(len(e172), 1)
        self.assertEqual(e172.iloc[0]["entity_id"], "PERSON_1459")

if __name__ == "__main__":
    unittest.main()
