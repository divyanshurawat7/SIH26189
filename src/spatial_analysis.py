"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/spatial_analysis.py

Phase 5: Spatial Analysis & Geospatial Intelligence Engine
Analyzes geographic positioning, movement, co-location, and vehicle convoy travel:
- Haversine distance calculations on real coordinates
- Shared location detection within temporal windows
- Repeated vehicle co-travel convoy detection
- Crime scene proximity around incident timestamps
- Mapping locations to persons, phones, and vehicles
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
import math
from typing import Dict, List, Optional, Tuple, Any, Set
import pandas as pd
import numpy as np

from src.data_loader import RawDataset
from src.utils.logger import get_logger

logger = get_logger("SpatialAnalysis")


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two geographic coordinates in kilometers.
    """
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@dataclass
class SpatialFinding:
    """Standardized representation of a spatial / co-location / co-travel intelligence finding."""
    finding_id: str
    pattern_type: str  # 'co_travel', 'co_location', 'crime_scene_proximity'
    person_ids: List[str] = field(default_factory=list)
    vehicle_ids: List[str] = field(default_factory=list)
    location_id: Optional[str] = None
    score: float = 0.0
    confidence: float = 0.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    shared_locations: List[str] = field(default_factory=list)
    trip_count: int = 1
    distance_km: Optional[float] = None
    source_record_ids: List[str] = field(default_factory=list)
    evidence_sources: List[str] = field(default_factory=list)
    explanation: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SpatialAnalyzer:
    """
    Geospatial analysis engine operating on locations, location_events,
    and vehicle_events without synthetic coordinate fabrication.
    """

    def __init__(self, dataset: RawDataset):
        self.data = dataset
        self._init_locations()
        self._init_mappings()
        self._init_events()

    def _init_locations(self):
        """Index locations table for rapid coordinate lookups."""
        self.locations_dict: Dict[str, Dict[str, Any]] = {}
        if hasattr(self.data, "locations") and not self.data.locations.empty:
            for _, r in self.data.locations.iterrows():
                lid = r["location_id"]
                lat = float(r["latitude"]) if pd.notna(r.get("latitude")) else None
                lon = float(r["longitude"]) if pd.notna(r.get("longitude")) else None
                self.locations_dict[lid] = {
                    "location_id": lid,
                    "city": r.get("city", ""),
                    "area_alias": r.get("area_alias", ""),
                    "latitude": lat,
                    "longitude": lon,
                    "location_type": r.get("location_type", "")
                }

    def _init_mappings(self):
        """Build entity ownership lookups."""
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

        if hasattr(self.data, "phones") and not self.data.phones.empty:
            self.phone_to_person = self.data.phones.set_index("phone_id")["person_id"].to_dict()
        else:
            self.phone_to_person = {}

        if hasattr(self.data, "fir_records") and not self.data.fir_records.empty:
            self.case_to_fir_location = (
                self.data.fir_records.set_index("case_id")["location_id"].to_dict()
            )
        else:
            self.case_to_fir_location = {}

    def _init_events(self):
        """Pre-sort and index location events and vehicle events."""
        if hasattr(self.data, "vehicle_events") and not self.data.vehicle_events.empty:
            self.veh_df = self.data.vehicle_events.copy()
            self.veh_df["dt"] = pd.to_datetime(self.veh_df["timestamp"], errors="coerce")
            self.veh_df = self.veh_df.dropna(subset=["dt"]).sort_values("dt")
            self.veh_df["owner_person"] = self.veh_df["vehicle_id"].map(self.vehicle_to_person)
        else:
            self.veh_df = pd.DataFrame()

        if hasattr(self.data, "location_events") and not self.data.location_events.empty:
            self.loc_df = self.data.location_events.copy()
            self.loc_df["dt"] = pd.to_datetime(self.loc_df["timestamp"], errors="coerce")
            self.loc_df = self.loc_df.dropna(subset=["dt"]).sort_values("dt")
        else:
            self.loc_df = pd.DataFrame()

    def get_location_details(self, location_id: str) -> Optional[Dict[str, Any]]:
        """Returns details and coordinates for a location ID."""
        return self.locations_dict.get(location_id)

    def compute_distance(self, loc1_id: str, loc2_id: str) -> Optional[float]:
        """Calculates distance in kilometers between two location IDs."""
        l1 = self.locations_dict.get(loc1_id)
        l2 = self.locations_dict.get(loc2_id)
        if not l1 or not l2:
            return None
        lat1, lon1 = l1.get("latitude"), l1.get("longitude")
        lat2, lon2 = l2.get("latitude"), l2.get("longitude")
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return None
        return haversine_distance_km(lat1, lon1, lat2, lon2)

    def detect_co_travel(
        self,
        min_shared_trips: int = 1,
        time_window_minutes: int = 90
    ) -> List[SpatialFinding]:
        """
        Detects vehicle convoy co-travel where two vehicles appear at the
        same location within `time_window_minutes` across distinct events.
        Differentiates high-confidence multi-trip convoys from occasional co-presence.
        """
        findings: List[SpatialFinding] = []
        if self.veh_df.empty:
            return findings

        # Group by location for fast localized temporal search
        loc_groups = self.veh_df.groupby("location_id")
        pair_events: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}

        for loc, group in loc_groups:
            group = group.sort_values("dt")
            dts = group["dt"].values
            vids = group["vehicle_id"].values
            eids = group["event_id"].values
            n = len(dts)

            for i in range(n):
                for j in range(i + 1, n):
                    diff_min = (dts[j] - dts[i]) / np.timedelta64(1, "m")
                    if diff_min > time_window_minutes:
                        break

                    v1, v2 = vids[i], vids[j]
                    if v1 != v2:
                        pair = (min(v1, v2), max(v1, v2))
                        if pair not in pair_events:
                            pair_events[pair] = []
                        pair_events[pair].append({
                            "location_id": loc,
                            "time_1": pd.to_datetime(dts[i]).isoformat(),
                            "time_2": pd.to_datetime(dts[j]).isoformat(),
                            "event_1": eids[i],
                            "event_2": eids[j],
                            "diff_minutes": diff_min
                        })

        idx = 1
        for (v1, v2), trips in pair_events.items():
            if len(trips) >= min_shared_trips:
                p1 = self.vehicle_to_person.get(v1)
                p2 = self.vehicle_to_person.get(v2)
                p_list = [p for p in [p1, p2] if p]

                shared_locs = sorted(list(set(t["location_id"] for t in trips)))
                all_rec_ids = sorted(list(set(
                    [t["event_1"] for t in trips] + [t["event_2"] for t in trips]
                )))

                start_t = min(t["time_1"] for t in trips)
                end_t = max(t["time_2"] for t in trips)
                min_diff = min(t["diff_minutes"] for t in trips)

                # Differentiate strong multi-trip convoy vs weak single co-presence
                is_strong = (len(trips) >= 4 and len(shared_locs) >= 2 and min_diff <= 2.0)
                strength = "strong" if is_strong else "weak"

                if is_strong:
                    confidence = min(0.98, 0.85 + (0.02 * len(trips)))
                    score = min(0.95, 0.75 + (0.04 * len(shared_locs)))
                else:
                    confidence = 0.70
                    score = 0.60

                p_str = f" ({p1} & {p2})" if p1 and p2 else ""
                expl = (
                    f"Confirmed vehicle co-travel convoy ({strength}) between {v1} and {v2}{p_str} "
                    f"across {len(trips)} shared sightings in {len(shared_locs)} distinct locations "
                    f"({', '.join(shared_locs[:3])}) with min temporal gap of {min_diff:.1f}m."
                )

                findings.append(SpatialFinding(
                    finding_id=f"COTRAVEL_{idx:03d}",
                    pattern_type="co_travel",
                    person_ids=p_list,
                    vehicle_ids=[v1, v2],
                    location_id=shared_locs[0] if shared_locs else None,
                    score=round(score, 3),
                    confidence=round(confidence, 3),
                    start_time=start_t,
                    end_time=end_t,
                    shared_locations=shared_locs,
                    trip_count=len(trips),
                    source_record_ids=all_rec_ids[:20],
                    evidence_sources=["vehicle"],
                    explanation=expl,
                    metadata={
                        "trip_records_count": len(trips),
                        "strength": strength,
                        "min_diff_minutes": round(min_diff, 1)
                    }
                ))
                idx += 1

        findings.sort(key=lambda x: (x.metadata.get("strength") == "strong", x.trip_count), reverse=True)
        return findings

    def detect_co_locations(
        self,
        time_window_minutes: int = 30,
        sample_locations: Optional[List[str]] = None
    ) -> List[SpatialFinding]:
        """
        Detects co-presence of distinct entities at the same location within `time_window_minutes`.
        """
        findings: List[SpatialFinding] = []
        if self.loc_df.empty:
            return findings

        target_df = self.loc_df
        if sample_locations:
            target_df = self.loc_df[self.loc_df["location_id"].isin(sample_locations)]

        loc_groups = target_df.groupby("location_id")
        idx = 1

        for loc, group in loc_groups:
            group = group.sort_values("dt")
            dts = group["dt"].values
            e_types = group["entity_type"].values
            e_ids = group["entity_id"].values
            r_ids = group["location_event_id"].values
            n = len(dts)

            for i in range(n):
                for j in range(i + 1, min(i + 20, n)):
                    diff_min = (dts[j] - dts[i]) / np.timedelta64(1, "m")
                    if diff_min > time_window_minutes:
                        break

                    ent1, ent2 = e_ids[i], e_ids[j]
                    if ent1 != ent2:
                        p1 = self.phone_to_person.get(ent1, ent1 if e_types[i] == "PERSON" else None)
                        p2 = self.phone_to_person.get(ent2, ent2 if e_types[j] == "PERSON" else None)
                        p_list = [p for p in [p1, p2] if p]

                        loc_info = self.locations_dict.get(loc, {})
                        alias = loc_info.get("area_alias", loc)

                        findings.append(SpatialFinding(
                            finding_id=f"COLOC_{idx:04d}",
                            pattern_type="co_location",
                            person_ids=p_list,
                            location_id=loc,
                            score=0.75,
                            confidence=0.85,
                            start_time=pd.to_datetime(dts[i]).isoformat(),
                            end_time=pd.to_datetime(dts[j]).isoformat(),
                            shared_locations=[loc],
                            trip_count=1,
                            source_record_ids=[r_ids[i], r_ids[j]],
                            evidence_sources=["location"],
                            explanation=(
                                f"Co-location detected between {ent1} and {ent2} at {alias} "
                                f"within {round(diff_min, 1)} minutes."
                            )
                        ))
                        idx += 1
                        if idx > 200:  # Cap maximum individual co-location findings
                            return findings

        return findings

    def detect_crime_scene_proximity(
        self,
        case_id: str,
        time_window_hours: float = 12.0
    ) -> List[SpatialFinding]:
        """
        Identifies entities physically observed at or adjacent to the crime
        scene location within `time_window_hours` of the incident.
        """
        findings: List[SpatialFinding] = []
        loc_id = self.case_to_fir_location.get(case_id)
        if not loc_id:
            return findings

        # Find case date
        case_row = self.data.cases[self.data.cases["case_id"] == case_id]
        if case_row.empty:
            return findings
        dt_case = pd.to_datetime(case_row.iloc[0]["opened_date"])
        if pd.isna(dt_case):
            return findings

        t_start = dt_case - timedelta(hours=time_window_hours)
        t_end = dt_case + timedelta(hours=time_window_hours)

        # 1. Location Events at Crime Location
        if not self.loc_df.empty:
            nearby_loc = self.loc_df[
                (self.loc_df["location_id"] == loc_id) &
                (self.loc_df["dt"] >= t_start) &
                (self.loc_df["dt"] <= t_end)
            ]
            for _, r in nearby_loc.iterrows():
                ent = r["entity_id"]
                pid = self.phone_to_person.get(ent, ent if r["entity_type"] == "PERSON" else None)
                diff_min = (r["dt"] - dt_case).total_seconds() / 60.0
                rel_str = f"{abs(round(diff_min, 1))} min before" if diff_min < 0 else f"{round(diff_min, 1)} min after"

                findings.append(SpatialFinding(
                    finding_id=f"PROX_{case_id}_{r['location_event_id']}",
                    pattern_type="crime_scene_proximity",
                    person_ids=[pid] if pid else [],
                    location_id=loc_id,
                    score=0.92,
                    confidence=0.90,
                    start_time=r["dt"].isoformat(),
                    end_time=r["dt"].isoformat(),
                    shared_locations=[loc_id],
                    source_record_ids=[r["location_event_id"]],
                    evidence_sources=["location"],
                    explanation=(
                        f"Entity {ent} ({pid or 'unknown'}) confirmed at crime scene {loc_id} "
                        f"{rel_str} incident time for {case_id}."
                    ),
                    metadata={"case_id": case_id, "delta_minutes": round(diff_min, 1)}
                ))

        # 2. Vehicle Events at Crime Location
        if not self.veh_df.empty:
            nearby_veh = self.veh_df[
                (self.veh_df["location_id"] == loc_id) &
                (self.veh_df["dt"] >= t_start) &
                (self.veh_df["dt"] <= t_end)
            ]
            for _, r in nearby_veh.iterrows():
                vid = r["vehicle_id"]
                pid = self.vehicle_to_person.get(vid)
                diff_min = (r["dt"] - dt_case).total_seconds() / 60.0
                rel_str = f"{abs(round(diff_min, 1))} min before" if diff_min < 0 else f"{round(diff_min, 1)} min after"

                findings.append(SpatialFinding(
                    finding_id=f"PROX_{case_id}_{r['event_id']}",
                    pattern_type="crime_scene_proximity",
                    person_ids=[pid] if pid else [],
                    vehicle_ids=[vid],
                    location_id=loc_id,
                    score=0.90,
                    confidence=0.88,
                    start_time=r["dt"].isoformat(),
                    end_time=r["dt"].isoformat(),
                    shared_locations=[loc_id],
                    source_record_ids=[r["event_id"]],
                    evidence_sources=["vehicle"],
                    explanation=(
                        f"Vehicle {vid} (owner: {pid or 'unknown'}) sighted at crime scene {loc_id} "
                        f"{rel_str} incident time for {case_id}."
                    ),
                    metadata={"case_id": case_id, "delta_minutes": round(diff_min, 1)}
                ))

        return findings
