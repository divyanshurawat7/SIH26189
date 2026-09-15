"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/temporal_analysis.py

Phase 5: Temporal Analysis & Activity Timeline Engine
Analyzes chronological patterns across heterogeneous data sources:
- Unified activity timelines per person and per case
- Communication spikes and bursts (rolling window vs baseline)
- Financial transaction spikes and velocity bursts
- Pre-crime and post-crime activity windows
- Multi-hop sequential communication cascades (A -> B -> C -> ...)
- Exact timestamp matching without fabricated data
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
import pandas as pd
import numpy as np

from src.data_loader import RawDataset
from src.utils.logger import get_logger

logger = get_logger("TemporalAnalysis")


@dataclass
class ActivityEvent:
    """Standardized representation of a single timestamped real-world activity."""
    event_id: str
    timestamp: datetime
    entity_type: str
    entity_id: str
    category: str  # 'CALL', 'TRANSACTION', 'LOCATION', 'VEHICLE', 'SURVEILLANCE', 'INTEL', 'CASE_EVENT'
    source_record_id: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["timestamp"] = self.timestamp.isoformat()
        return d


class TemporalAnalyzer:
    """
    Performs chronological event reconstruction, spike detection, and
    temporal window correlation across CDR, financial, and event logs.
    """

    def __init__(self, dataset: RawDataset):
        self.data = dataset
        self._init_mappings()
        self._init_parsed_tables()

    def _init_mappings(self):
        """Construct fast lookup indices for entity cross-referencing."""
        # Phone -> Person
        if hasattr(self.data, "phones") and not self.data.phones.empty:
            self.phone_to_person = self.data.phones.set_index("phone_id")["person_id"].to_dict()
            self.person_to_phones = (
                self.data.phones.groupby("person_id")["phone_id"].apply(list).to_dict()
            )
        else:
            self.phone_to_person = {}
            self.person_to_phones = {}

        # Account -> Person
        if hasattr(self.data, "bank_accounts") and not self.data.bank_accounts.empty:
            self.account_to_person = (
                self.data.bank_accounts.set_index("account_id")["person_id"].to_dict()
            )
            self.person_to_accounts = (
                self.data.bank_accounts.groupby("person_id")["account_id"].apply(list).to_dict()
            )
        else:
            self.account_to_person = {}
            self.person_to_accounts = {}

        # Vehicle -> Person
        if hasattr(self.data, "vehicles") and not self.data.vehicles.empty:
            self.vehicle_to_person = (
                self.data.vehicles.set_index("vehicle_id")["owner_person_id"].to_dict()
            )
            self.person_to_vehicles = (
                self.data.vehicles.groupby("owner_person_id")["vehicle_id"].apply(list).to_dict()
            )
        else:
            self.vehicle_to_person = {}
            self.person_to_vehicles = {}

        # Case info lookup
        if hasattr(self.data, "cases") and not self.data.cases.empty:
            self.cases_dict = self.data.cases.set_index("case_id").to_dict(orient="index")
        else:
            self.cases_dict = {}

        if hasattr(self.data, "fir_records") and not self.data.fir_records.empty:
            self.firs_dict = self.data.fir_records.set_index("fir_id").to_dict(orient="index")
        else:
            self.firs_dict = {}

    def _init_parsed_tables(self):
        """Parse timestamps into datetime objects for fast indexing."""
        # CDR
        if hasattr(self.data, "cdr_records") and not self.data.cdr_records.empty:
            self.cdr_df = self.data.cdr_records.copy()
            self.cdr_df["dt"] = pd.to_datetime(self.cdr_df["timestamp"], errors="coerce")
            self.cdr_df["caller_person"] = self.cdr_df["caller_phone_id"].map(self.phone_to_person)
            self.cdr_df["receiver_person"] = self.cdr_df["receiver_phone_id"].map(self.phone_to_person)
        else:
            self.cdr_df = pd.DataFrame()

        # Financial
        if hasattr(self.data, "financial_transactions") and not self.data.financial_transactions.empty:
            self.tx_df = self.data.financial_transactions.copy()
            self.tx_df["dt"] = pd.to_datetime(self.tx_df["timestamp"], errors="coerce")
            self.tx_df["sender_person"] = self.tx_df["sender_account_id"].map(self.account_to_person)
            self.tx_df["receiver_person"] = self.tx_df["receiver_account_id"].map(self.account_to_person)
        else:
            self.tx_df = pd.DataFrame()

        # Location Events
        if hasattr(self.data, "location_events") and not self.data.location_events.empty:
            self.loc_df = self.data.location_events.copy()
            self.loc_df["dt"] = pd.to_datetime(self.loc_df["timestamp"], errors="coerce")
        else:
            self.loc_df = pd.DataFrame()

        # Vehicle Events
        if hasattr(self.data, "vehicle_events") and not self.data.vehicle_events.empty:
            self.veh_df = self.data.vehicle_events.copy()
            self.veh_df["dt"] = pd.to_datetime(self.veh_df["timestamp"], errors="coerce")
            self.veh_df["owner_person"] = self.veh_df["vehicle_id"].map(self.vehicle_to_person)
        else:
            self.veh_df = pd.DataFrame()

        # Surveillance
        if hasattr(self.data, "surveillance_reports") and not self.data.surveillance_reports.empty:
            self.surv_df = self.data.surveillance_reports.copy()
            self.surv_df["dt"] = pd.to_datetime(self.surv_df["timestamp"], errors="coerce")
        else:
            self.surv_df = pd.DataFrame()

        # Intel
        if hasattr(self.data, "intelligence_reports") and not self.data.intelligence_reports.empty:
            self.intel_df = self.data.intelligence_reports.copy()
            self.intel_df["dt"] = pd.to_datetime(self.intel_df["timestamp"], errors="coerce")
        else:
            self.intel_df = pd.DataFrame()

    def build_person_timeline(self, person_id: str) -> List[ActivityEvent]:
        """
        Builds a comprehensive, chronological timeline of all activities
        involving a specific person across all evidence categories.
        """
        events: List[ActivityEvent] = []
        p_phones = set(self.person_to_phones.get(person_id, []))
        p_accs = set(self.person_to_accounts.get(person_id, []))
        p_vehs = set(self.person_to_vehicles.get(person_id, []))

        # 1. CDR Calls
        if not self.cdr_df.empty:
            calls = self.cdr_df[
                (self.cdr_df["caller_phone_id"].isin(p_phones)) |
                (self.cdr_df["receiver_phone_id"].isin(p_phones)) |
                (self.cdr_df["caller_person"] == person_id) |
                (self.cdr_df["receiver_person"] == person_id)
            ]
            for _, r in calls.iterrows():
                direction = "OUTGOING" if r["caller_phone_id"] in p_phones else "INCOMING"
                other_p = r["receiver_person"] if direction == "OUTGOING" else r["caller_person"]
                events.append(ActivityEvent(
                    event_id=f"EVT_{r['call_id']}",
                    timestamp=r["dt"],
                    entity_type="PERSON",
                    entity_id=person_id,
                    category="CALL",
                    source_record_id=r["call_id"],
                    details={
                        "direction": direction,
                        "other_person": other_p,
                        "duration_seconds": r.get("duration_seconds", 0),
                        "caller_phone": r["caller_phone_id"],
                        "receiver_phone": r["receiver_phone_id"],
                        "tower": r.get("caller_tower_id") if direction == "OUTGOING" else r.get("receiver_tower_id")
                    }
                ))

        # 2. Financial Transactions
        if not self.tx_df.empty:
            txs = self.tx_df[
                (self.tx_df["sender_account_id"].isin(p_accs)) |
                (self.tx_df["receiver_account_id"].isin(p_accs)) |
                (self.tx_df["sender_person"] == person_id) |
                (self.tx_df["receiver_person"] == person_id)
            ]
            for _, r in txs.iterrows():
                is_sender = r["sender_account_id"] in p_accs
                events.append(ActivityEvent(
                    event_id=f"EVT_{r['transaction_id']}",
                    timestamp=r["dt"],
                    entity_type="PERSON",
                    entity_id=person_id,
                    category="TRANSACTION",
                    source_record_id=r["transaction_id"],
                    details={
                        "role": "SENDER" if is_sender else "RECEIVER",
                        "amount": float(r.get("amount", 0.0)),
                        "other_account": r["receiver_account_id"] if is_sender else r["sender_account_id"],
                        "other_person": r["receiver_person"] if is_sender else r["sender_person"],
                        "case_id": r.get("case_id"),
                        "location_id": r.get("location_id")
                    }
                ))

        # 3. Location Events
        if not self.loc_df.empty:
            locs = self.loc_df[
                (self.loc_df["entity_id"] == person_id) |
                (self.loc_df["entity_id"].isin(p_phones))
            ]
            for _, r in locs.iterrows():
                events.append(ActivityEvent(
                    event_id=f"EVT_{r['location_event_id']}",
                    timestamp=r["dt"],
                    entity_type="PERSON",
                    entity_id=person_id,
                    category="LOCATION",
                    source_record_id=r["location_event_id"],
                    details={
                        "location_id": r.get("location_id"),
                        "tower_id": r.get("tower_id"),
                        "accuracy": r.get("accuracy", 1.0)
                    }
                ))

        # 4. Vehicle Events
        if not self.veh_df.empty and p_vehs:
            vehs = self.veh_df[self.veh_df["vehicle_id"].isin(p_vehs)]
            for _, r in vehs.iterrows():
                events.append(ActivityEvent(
                    event_id=f"EVT_{r['event_id']}",
                    timestamp=r["dt"],
                    entity_type="PERSON",
                    entity_id=person_id,
                    category="VEHICLE",
                    source_record_id=r["event_id"],
                    details={
                        "vehicle_id": r["vehicle_id"],
                        "location_id": r.get("location_id"),
                        "event_type": r.get("event_type")
                    }
                ))

        events.sort(key=lambda x: x.timestamp)
        return events

    def build_case_timeline(self, case_id: str) -> List[ActivityEvent]:
        """
        Builds a chronological timeline of all events tied to a specific case:
        case opened date, FIR filing, related transactions, and field evidence.
        """
        events: List[ActivityEvent] = []

        # Case opened
        if case_id in self.cases_dict:
            c_info = self.cases_dict[case_id]
            dt_open = pd.to_datetime(c_info.get("opened_date"))
            if pd.notna(dt_open):
                events.append(ActivityEvent(
                    event_id=f"EVT_{case_id}_OPENED",
                    timestamp=dt_open,
                    entity_type="CASE",
                    entity_id=case_id,
                    category="CASE_EVENT",
                    source_record_id=case_id,
                    details={
                        "event_type": "CASE_OPENED",
                        "crime_type": c_info.get("crime_type"),
                        "city": c_info.get("city"),
                        "fir_id": c_info.get("fir_id")
                    }
                ))

        # FIR records
        if hasattr(self.data, "fir_records") and not self.data.fir_records.empty:
            firs = self.data.fir_records[self.data.fir_records["case_id"] == case_id]
            for _, r in firs.iterrows():
                dt_fir = pd.to_datetime(r["date"])
                if pd.notna(dt_fir):
                    events.append(ActivityEvent(
                        event_id=f"EVT_{r['fir_id']}",
                        timestamp=dt_fir,
                        entity_type="FIR",
                        entity_id=r["fir_id"],
                        category="CASE_EVENT",
                        source_record_id=r["fir_id"],
                        details={
                            "event_type": "FIR_FILED",
                            "crime_type": r.get("crime_type"),
                            "accused_id": r.get("accused_id"),
                            "complainant_id": r.get("complainant_id"),
                            "witness_id": r.get("witness_id"),
                            "location_id": r.get("location_id")
                        }
                    ))

        # Linked Financial Transactions
        if not self.tx_df.empty:
            txs = self.tx_df[self.tx_df["case_id"] == case_id]
            for _, r in txs.iterrows():
                events.append(ActivityEvent(
                    event_id=f"EVT_{r['transaction_id']}",
                    timestamp=r["dt"],
                    entity_type="CASE",
                    entity_id=case_id,
                    category="TRANSACTION",
                    source_record_id=r["transaction_id"],
                    details={
                        "amount": float(r.get("amount", 0.0)),
                        "sender_account": r.get("sender_account_id"),
                        "receiver_account": r.get("receiver_account_id"),
                        "sender_person": r.get("sender_person"),
                        "receiver_person": r.get("receiver_person")
                    }
                ))

        events.sort(key=lambda x: x.timestamp)
        return events

    def detect_communication_spikes(
        self,
        person_id: Optional[str] = None,
        window_hours: int = 24,
        threshold_factor: float = 3.0,
        min_calls_for_spike: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Detects communication bursts where volume within a rolling window exceeds
        the entity's historical baseline by `threshold_factor` (e.g. 3x normal).
        """
        spikes: List[Dict[str, Any]] = []
        if self.cdr_df.empty:
            return spikes

        target_persons = [person_id] if person_id else list(self.person_to_phones.keys())

        for pid in target_persons:
            p_phones = set(self.person_to_phones.get(pid, []))
            if not p_phones:
                continue

            calls = self.cdr_df[
                (self.cdr_df["caller_phone_id"].isin(p_phones)) |
                (self.cdr_df["receiver_phone_id"].isin(p_phones))
            ].sort_values("dt")

            if len(calls) < min_calls_for_spike:
                continue

            # Compute daily counts
            daily_counts = calls.groupby(calls["dt"].dt.date).size()
            baseline = daily_counts.mean()
            std_dev = daily_counts.std() if len(daily_counts) > 1 else 0.0

            # Rolling window scan
            dt_series = calls["dt"].values
            call_ids = calls["call_id"].values
            window_delta = np.timedelta64(window_hours, "h")

            for i in range(len(dt_series)):
                t_start = dt_series[i]
                t_end = t_start + window_delta
                # Calls in window
                mask = (dt_series >= t_start) & (dt_series <= t_end)
                count = np.sum(mask)

                if count >= min_calls_for_spike and count >= (baseline * threshold_factor):
                    w_calls = list(call_ids[mask])
                    spikes.append({
                        "person_id": pid,
                        "pattern_type": "communication_burst",
                        "start_time": pd.to_datetime(t_start).isoformat(),
                        "end_time": pd.to_datetime(t_end).isoformat(),
                        "call_count": int(count),
                        "baseline_daily": round(float(baseline), 2),
                        "multiplier": round(float(count / max(baseline, 1.0)), 2),
                        "source_record_ids": w_calls[:15],
                        "evidence_sources": ["CDR"]
                    })
                    break  # Keep the primary spike window for this cluster

        return spikes

    def detect_transaction_spikes(
        self,
        person_id: Optional[str] = None,
        window_hours: int = 48,
        min_tx_count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Detects bursts in financial activity where multiple transfers cluster
        within a short temporal window (e.g. 48 hours).
        """
        spikes: List[Dict[str, Any]] = []
        if self.tx_df.empty:
            return spikes

        target_persons = [person_id] if person_id else list(self.person_to_accounts.keys())

        for pid in target_persons:
            p_accs = set(self.person_to_accounts.get(pid, []))
            if not p_accs:
                continue

            txs = self.tx_df[
                (self.tx_df["sender_account_id"].isin(p_accs)) |
                (self.tx_df["receiver_account_id"].isin(p_accs))
            ].sort_values("dt")

            if len(txs) < min_tx_count:
                continue

            dt_series = txs["dt"].values
            tx_ids = txs["transaction_id"].values
            amounts = txs["amount"].values
            window_delta = np.timedelta64(window_hours, "h")

            for i in range(len(dt_series)):
                t_start = dt_series[i]
                t_end = t_start + window_delta
                mask = (dt_series >= t_start) & (dt_series <= t_end)
                count = np.sum(mask)

                if count >= min_tx_count:
                    tot_amt = float(np.sum(amounts[mask]))
                    w_txs = list(tx_ids[mask])
                    spikes.append({
                        "person_id": pid,
                        "pattern_type": "transaction_spike",
                        "start_time": pd.to_datetime(t_start).isoformat(),
                        "end_time": pd.to_datetime(t_end).isoformat(),
                        "transaction_count": int(count),
                        "total_amount": round(tot_amt, 2),
                        "source_record_ids": w_txs,
                        "evidence_sources": ["financial"]
                    })
                    break

        return spikes

    def analyze_pre_post_case_windows(
        self,
        case_id: str,
        pre_days: int = 10,
        post_days: int = 2
    ) -> Dict[str, Any]:
        """
        Profiles all network activities in the critical window immediately
        leading up to and following a criminal incident.
        """
        if case_id not in self.cases_dict:
            return {"case_id": case_id, "status": "CASE_NOT_FOUND"}

        c_info = self.cases_dict[case_id]
        dt_case = pd.to_datetime(c_info.get("opened_date"))
        if pd.isna(dt_case):
            return {"case_id": case_id, "status": "INVALID_DATE"}

        t_pre_start = dt_case - timedelta(days=pre_days)
        t_post_end = dt_case + timedelta(days=post_days)

        # Pre-crime window activity
        pre_calls = self.cdr_df[
            (self.cdr_df["dt"] >= t_pre_start) & (self.cdr_df["dt"] < dt_case)
        ] if not self.cdr_df.empty else pd.DataFrame()

        post_calls = self.cdr_df[
            (self.cdr_df["dt"] >= dt_case) & (self.cdr_df["dt"] <= t_post_end)
        ] if not self.cdr_df.empty else pd.DataFrame()

        pre_tx = self.tx_df[
            (self.tx_df["dt"] >= t_pre_start) & (self.tx_df["dt"] < dt_case)
        ] if not self.tx_df.empty else pd.DataFrame()

        post_tx = self.tx_df[
            (self.tx_df["dt"] >= dt_case) & (self.tx_df["dt"] <= t_post_end)
        ] if not self.tx_df.empty else pd.DataFrame()

        return {
            "case_id": case_id,
            "incident_time": dt_case.isoformat(),
            "pre_window_start": t_pre_start.isoformat(),
            "post_window_end": t_post_end.isoformat(),
            "pre_crime_call_count": len(pre_calls),
            "post_crime_call_count": len(post_calls),
            "pre_crime_tx_count": len(pre_tx),
            "post_crime_tx_count": len(post_tx),
            "pre_crime_tx_volume": round(float(pre_tx["amount"].sum()), 2) if not pre_tx.empty else 0.0,
            "post_crime_tx_volume": round(float(post_tx["amount"].sum()), 2) if not post_tx.empty else 0.0,
        }

    def detect_temporal_chains(
        self,
        max_hop_hours: float = 2.0,
        min_hops: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Discovers sequential communication cascades P_1 -> P_2 -> P_3 -> P_4
        where each call initiates shortly after the prior call, revealing
        operational command propagation.
        """
        chains: List[Dict[str, Any]] = []
        if self.cdr_df.empty:
            return chains

        valid_calls = self.cdr_df.dropna(subset=["caller_person", "receiver_person"]).sort_values("dt")
        max_delta = timedelta(hours=max_hop_hours)

        call_records = []
        for _, r in valid_calls.iterrows():
            call_records.append({
                "call_id": r["call_id"],
                "dt": r["dt"],
                "caller": r["caller_person"],
                "receiver": r["receiver_person"],
                "duration": r.get("duration_seconds", 0)
            })

        n = len(call_records)
        visited_heads = set()

        for i in range(n):
            c1 = call_records[i]
            curr_chain = [c1]
            curr_receiver = c1["receiver"]
            curr_time = c1["dt"]

            if c1["call_id"] in visited_heads:
                continue

            for j in range(i + 1, min(i + 50, n)):
                c2 = call_records[j]
                if c2["dt"] < curr_time:
                    continue
                if (c2["dt"] - curr_time) > max_delta:
                    break

                # Directed continuation: caller is the previous receiver
                if c2["caller"] == curr_receiver and c2["receiver"] not in [c["caller"] for c in curr_chain]:
                    curr_chain.append(c2)
                    curr_receiver = c2["receiver"]
                    curr_time = c2["dt"]

            if len(curr_chain) >= min_hops:
                entities = [curr_chain[0]["caller"]] + [c["receiver"] for c in curr_chain]
                source_ids = [c["call_id"] for c in curr_chain]
                visited_heads.add(c1["call_id"])
                chains.append({
                    "pattern_type": "temporal_call_chain",
                    "hops": len(curr_chain),
                    "entities": entities,
                    "source_record_ids": source_ids,
                    "start_time": curr_chain[0]["dt"].isoformat(),
                    "end_time": curr_chain[-1]["dt"].isoformat(),
                    "duration_minutes": round((curr_chain[-1]["dt"] - curr_chain[0]["dt"]).total_seconds() / 60.0, 1),
                    "evidence_sources": ["CDR"]
                })

        return chains
