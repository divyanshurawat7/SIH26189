"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/data_loader.py

Loads, validates, and manages structured data ingestion from SIH26189_SYNTHETIC_DATASET/raw/.
Performs schema checks, primary key uniqueness verification, and relational foreign-key integrity validation.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
import time
import pandas as pd

from src.utils.logger import get_logger

logger = get_logger("DataLoader")

class DataLoaderError(Exception):
    """Base exception for DataLoader errors."""
    pass

class SchemaValidationError(DataLoaderError):
    """Raised when schema validation fails."""
    pass

class ForeignKeyValidationError(DataLoaderError):
    """Raised when foreign-key integrity validation fails."""
    pass

@dataclass
class ValidationReport:
    """Encapsulates results of schema and foreign key validations."""
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    checked_tables: List[str] = field(default_factory=list)
    foreign_key_checks_passed: int = 0
    foreign_key_checks_failed: int = 0

@dataclass
class RawDataset:
    """
    Strongly-typed container for all raw intelligence and criminal network tables.
    Supports both attribute access (dataset.persons) and dict-like access (dataset['persons']).
    """
    persons: pd.DataFrame
    organizations: pd.DataFrame
    phones: pd.DataFrame
    devices: pd.DataFrame
    bank_accounts: pd.DataFrame
    vehicles: pd.DataFrame
    locations: pd.DataFrame
    cell_towers: pd.DataFrame
    cases: pd.DataFrame
    fir_records: pd.DataFrame
    cdr_records: pd.DataFrame
    financial_transactions: pd.DataFrame
    location_events: pd.DataFrame
    vehicle_events: pd.DataFrame
    surveillance_reports: pd.DataFrame
    social_media_records: pd.DataFrame
    criminal_history: pd.DataFrame
    intelligence_reports: pd.DataFrame
    relationships: pd.DataFrame
    evidence: pd.DataFrame

    def __getitem__(self, item: str) -> pd.DataFrame:
        if hasattr(self, item):
            return getattr(self, item)
        raise KeyError(f"Table '{item}' not found in RawDataset")

    def keys(self) -> List[str]:
        return [
            "persons", "organizations", "phones", "devices", "bank_accounts",
            "vehicles", "locations", "cell_towers", "cases", "fir_records",
            "cdr_records", "financial_transactions", "location_events", "vehicle_events",
            "surveillance_reports", "social_media_records", "criminal_history",
            "intelligence_reports", "relationships", "evidence"
        ]

    def summary(self) -> Dict[str, Dict[str, Any]]:
        """Returns row count and column count for each table."""
        res = {}
        for key in self.keys():
            df = getattr(self, key)
            res[key] = {
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns)
            }
        return res

class DataLoader:
    """
    Data loader for SIH26189 raw data tables.
    """

    TABLE_FILES = {
        "persons": "persons.csv",
        "organizations": "organizations.csv",
        "phones": "phones.csv",
        "devices": "devices.csv",
        "bank_accounts": "bank_accounts.csv",
        "vehicles": "vehicles.csv",
        "locations": "locations.csv",
        "cell_towers": "cell_towers.csv",
        "cases": "cases.csv",
        "fir_records": "fir_records.csv",
        "cdr_records": "cdr_records.csv",
        "financial_transactions": "financial_transactions.csv",
        "location_events": "location_events.csv",
        "vehicle_events": "vehicle_events.csv",
        "surveillance_reports": "surveillance_reports.csv",
        "social_media_records": "social_media_records.csv",
        "criminal_history": "criminal_history.csv",
        "intelligence_reports": "intelligence_reports.csv",
        "relationships": "relationships.csv",
        "evidence": "evidence.csv",
    }

    CORE_COLUMNS = {
        "persons": ["person_id", "name", "city", "primary_phone_id"],
        "organizations": ["organization_id", "organization_name", "city"],
        "phones": ["phone_id", "person_id", "device_id"],
        "devices": ["device_id", "device_type"],
        "bank_accounts": ["account_id", "person_id", "account_type"],
        "vehicles": ["vehicle_id", "owner_person_id"],
        "locations": ["location_id", "city"],
        "cell_towers": ["tower_id", "location_id"],
        "cases": ["case_id", "fir_id", "status"],
        "fir_records": ["fir_id", "case_id", "accused_id", "complainant_id", "witness_id", "location_id"],
        "cdr_records": ["call_id", "timestamp", "caller_phone_id", "receiver_phone_id", "duration_seconds"],
        "financial_transactions": ["transaction_id", "timestamp", "sender_account_id", "receiver_account_id", "amount"],
        "location_events": ["location_event_id", "timestamp", "entity_id", "location_id"],
        "vehicle_events": ["event_id", "timestamp", "vehicle_id", "location_id"],
        "surveillance_reports": ["report_id", "case_id", "location_id"],
        "social_media_records": ["social_record_id", "person_id"],
        "criminal_history": ["history_id", "person_id"],
        "intelligence_reports": ["report_id"],
        "relationships": ["relationship_id", "source_entity_id", "target_entity_id", "relationship_type"],
        "evidence": ["evidence_id", "evidence_type", "entity_id"]
    }

    PRIMARY_KEYS = {
        "persons": "person_id",
        "organizations": "organization_id",
        "phones": "phone_id",
        "devices": "device_id",
        "bank_accounts": "account_id",
        "vehicles": "vehicle_id",
        "locations": "location_id",
        "cell_towers": "tower_id",
        "cases": "case_id",
        "fir_records": "fir_id",
        "cdr_records": "call_id",
        "financial_transactions": "transaction_id",
        "location_events": "location_event_id",
        "vehicle_events": "event_id",
        "surveillance_reports": "report_id",
        "social_media_records": "social_record_id",
        "criminal_history": "history_id",
        "intelligence_reports": "report_id",
        "relationships": "relationship_id",
        "evidence": "evidence_id"
    }

    def __init__(self, raw_data_dir: Optional[Path] = None):
        if raw_data_dir is None:
            # Default to repo root / SIH26189_SYNTHETIC_DATASET / raw
            repo_root = Path(__file__).resolve().parent.parent
            self.raw_data_dir = repo_root / "SIH26189_SYNTHETIC_DATASET" / "raw"
        else:
            self.raw_data_dir = Path(raw_data_dir)

        if not self.raw_data_dir.exists():
            raise DataLoaderError(f"Raw data directory does not exist: {self.raw_data_dir}")

    def load_all(self, validate: bool = True) -> RawDataset:
        """
        Loads all 20 raw CSV files into a RawDataset container.
        Optionally validates schema and foreign-key integrity.
        """
        logger.info(f"Loading raw dataset from {self.raw_data_dir}...")
        start_time = time.time()
        dfs: Dict[str, pd.DataFrame] = {}

        for table_name, filename in self.TABLE_FILES.items():
            filepath = self.raw_data_dir / filename
            if not filepath.exists():
                raise DataLoaderError(f"Required table file missing: {filepath}")
            try:
                # low_memory=False to prevent mixed-type warning on sparse fields
                df = pd.read_csv(filepath, low_memory=False)
                dfs[table_name] = df
                logger.debug(f"Loaded {table_name:25s}: {len(df):6d} rows")
            except Exception as e:
                raise DataLoaderError(f"Failed to read CSV '{filepath}': {e}") from e

        dataset = RawDataset(**dfs)
        load_duration = time.time() - start_time
        logger.info(f"Successfully loaded all {len(dfs)} raw tables in {load_duration:.2f}s")

        if validate:
            report = self.validate(dataset)
            if not report.is_valid:
                error_msg = "; ".join(report.errors)
                raise SchemaValidationError(f"Dataset validation failed: {error_msg}")

        return dataset

    def validate(self, dataset: RawDataset) -> ValidationReport:
        """Runs schema checks and relational foreign-key checks."""
        report = ValidationReport()
        logger.info("Executing schema and relational foreign-key validation...")

        # 1. Schema & non-emptiness check
        for table_name, req_cols in self.CORE_COLUMNS.items():
            report.checked_tables.append(table_name)
            df = getattr(dataset, table_name)
            if len(df) == 0:
                report.errors.append(f"Table '{table_name}' is empty")
                report.is_valid = False

            missing_cols = set(req_cols) - set(df.columns)
            if missing_cols:
                report.errors.append(f"Table '{table_name}' missing columns: {missing_cols}")
                report.is_valid = False

            # Primary key uniqueness
            pk = self.PRIMARY_KEYS.get(table_name)
            if pk and pk in df.columns:
                dups = df[pk].duplicated().sum()
                if dups > 0:
                    report.errors.append(f"Table '{table_name}' primary key '{pk}' has {dups} duplicates")
                    report.is_valid = False

        # 2. Foreign-Key integrity checks
        persons_set: Set[str] = set(dataset.persons["person_id"])
        phones_set: Set[str] = set(dataset.phones["phone_id"])
        devices_set: Set[str] = set(dataset.devices["device_id"])
        accounts_set: Set[str] = set(dataset.bank_accounts["account_id"])
        vehicles_set: Set[str] = set(dataset.vehicles["vehicle_id"])
        locations_set: Set[str] = set(dataset.locations["location_id"])
        towers_set: Set[str] = set(dataset.cell_towers["tower_id"])
        cases_set: Set[str] = set(dataset.cases["case_id"])
        firs_set: Set[str] = set(dataset.fir_records["fir_id"])

        fk_specs = [
            ("phones", "person_id", persons_set, False),
            ("phones", "device_id", devices_set, False),
            ("bank_accounts", "person_id", persons_set, False),
            ("vehicles", "owner_person_id", persons_set, False),
            ("cell_towers", "location_id", locations_set, False),
            ("cases", "fir_id", firs_set, False),
            ("fir_records", "case_id", cases_set, False),
            ("fir_records", "accused_id", persons_set, False),
            ("fir_records", "complainant_id", persons_set, False),
            ("fir_records", "witness_id", persons_set, True),
            ("fir_records", "location_id", locations_set, False),
            ("cdr_records", "caller_phone_id", phones_set, False),
            ("cdr_records", "receiver_phone_id", phones_set, False),
            ("financial_transactions", "sender_account_id", accounts_set, False),
            ("financial_transactions", "receiver_account_id", accounts_set, False),
            ("location_events", "tower_id", towers_set, True),
            ("location_events", "location_id", locations_set, True),
            ("vehicle_events", "vehicle_id", vehicles_set, False),
            ("vehicle_events", "location_id", locations_set, False),
            ("evidence", "case_id", cases_set, True)
        ]

        for source_table, col_name, target_set, allow_null in fk_specs:
            df = getattr(dataset, source_table)
            if col_name not in df.columns:
                continue
            series = df[col_name].dropna() if allow_null else df[col_name]
            unmatched = set(series) - target_set
            if unmatched:
                sample = list(unmatched)[:5]
                report.errors.append(
                    f"FK check failed: {source_table}.{col_name} has {len(unmatched)} invalid references. Sample: {sample}"
                )
                report.foreign_key_checks_failed += 1
                report.is_valid = False
            else:
                report.foreign_key_checks_passed += 1

        if report.is_valid:
            logger.info(
                f"Validation passed: {len(report.checked_tables)} tables verified, "
                f"{report.foreign_key_checks_passed} FK relations verified."
            )
        else:
            logger.error(f"Validation failed with {len(report.errors)} errors.")

        return report

if __name__ == "__main__":
    loader = DataLoader()
    dataset = loader.load_all(validate=True)
    summary = dataset.summary()
    print("\n" + "=" * 65)
    print(f"{'TABLE NAME':26s} | {'ROWS':8s} | {'COLUMNS':8s}")
    print("=" * 65)
    total_rows = 0
    for tbl, info in summary.items():
        print(f"{tbl:26s} | {info['row_count']:8d} | {info['column_count']:8d}")
        total_rows += info["row_count"]
    print("=" * 65)
    print(f"Total Ingested Tables: {len(summary)}")
    print(f"Total Ingested Rows:   {total_rows}")
    print("=" * 65)
