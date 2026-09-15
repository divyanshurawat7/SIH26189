#!/usr/bin/env python3
"""
generate_sih26189_dataset.py
============================
Deterministic generator & reconciler for SIH26189 synthetic criminal network dataset.
Enforces the flagship requirement for NET_001 / CASE_0001:
  PERSON_A -> PERSON_B -> PERSON_C -> PERSON_D -> PERSON_E -> CRIME_EVENT

Where:
  A = PERSON_1476 (UPSTREAM_COORDINATOR) - zero direct edges to CASE/EVENT/CRIME
  B = PERSON_0026 (BROKER)
  C = PERSON_0397 (BROKER)
  D = PERSON_0405 (OPERATIONAL_MEMBER)
  E = PERSON_1459 (OPERATIONAL_MEMBER) - accused in FIR_0001, direct APPEARED_IN_CASE, at LOCATION_0041

Deterministic with RANDOM_SEED = 26189.
"""

import os
import sys
import json
import random
import datetime
import numpy as np
import pandas as pd

RANDOM_SEED = 26189

def get_base_dir():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(script_dir, "SIH26189_SYNTHETIC_DATASET")
    if os.path.exists(dataset_dir):
        return dataset_dir
    return script_dir

def run_generator():
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    base = get_base_dir()
    print(f"[*] Running SIH26189 Dataset Generator on: {base}")
    print(f"[*] RANDOM_SEED = {RANDOM_SEED}")

    # Flagship Entities
    PERSON_A = "PERSON_1476"
    PERSON_B = "PERSON_0026"
    PERSON_C = "PERSON_0397"
    PERSON_D = "PERSON_0405"
    PERSON_E = "PERSON_1459"
    CASE_FLAGSHIP = "CASE_0001"
    FIR_FLAGSHIP = "FIR_0001"
    CRIME_LOCATION = "LOCATION_0041"
    CRIME_TIMESTAMP = "2025-08-29 19:24:50"
    FIR_TIMESTAMP = "2025-08-30 04:24:50"

    # -------------------------------------------------------------
    # 1. Update fir_records.csv
    # -------------------------------------------------------------
    fir_path = os.path.join(base, "raw", "fir_records.csv")
    firs = pd.read_csv(fir_path)
    f1_mask = firs["fir_id"] == FIR_FLAGSHIP
    if f1_mask.any():
        firs.loc[f1_mask, "accused_id"] = PERSON_E
        firs.loc[f1_mask, "location_id"] = CRIME_LOCATION
        firs.loc[f1_mask, "narrative"] = (
            "Investigating officer noted unusual movement in the area prior to the reported incident. "
            "Primary suspect identified on scene."
        )
    firs.to_csv(fir_path, index=False)
    print(f"[+] Updated {fir_path}: accused_id = {PERSON_E}")

    # -------------------------------------------------------------
    # 2. Update graph_edges.csv
    # -------------------------------------------------------------
    edges_path = os.path.join(base, "graph", "graph_edges.csv")
    edges = pd.read_csv(edges_path)
    
    # Ensure no direct edge from A to CASE_0001
    a_case_mask = (
        ((edges["source_id"] == PERSON_A) & (edges["target_id"] == CASE_FLAGSHIP)) |
        ((edges["target_id"] == PERSON_A) & (edges["source_id"] == CASE_FLAGSHIP))
    )
    if a_case_mask.any():
        edges.loc[a_case_mask, "source_id"] = PERSON_E
        edges.loc[a_case_mask, "confidence"] = 0.89
    else:
        # Check if E already has an APPEARED_IN_CASE edge
        e_case_mask = (edges["source_id"] == PERSON_E) & (edges["target_id"] == CASE_FLAGSHIP)
        if not e_case_mask.any():
            new_edge = {
                "source_id": PERSON_E,
                "source_type": "PERSON",
                "target_id": CASE_FLAGSHIP,
                "target_type": "CASE",
                "edge_type": "APPEARED_IN_CASE",
                "timestamp": FIR_TIMESTAMP,
                "weight": 0.05,
                "confidence": 0.89,
                "source_record_id": FIR_FLAGSHIP
            }
            edges = pd.concat([edges, pd.DataFrame([new_edge])], ignore_index=True)

    # 2.1 Enforce directed first hop: PERSON_A -> PERSON_B
    ab_rev_mask = (edges["source_id"] == PERSON_B) & (edges["target_id"] == PERSON_A)
    if ab_rev_mask.any():
        edges.loc[ab_rev_mask, "source_id"] = PERSON_A
        edges.loc[ab_rev_mask, "target_id"] = PERSON_B
        edges.loc[ab_rev_mask, "source_record_id"] = edges.loc[ab_rev_mask, "source_record_id"].astype(str).str.replace(
            f"{PERSON_B}_{PERSON_A}", f"{PERSON_A}_{PERSON_B}"
        )
        print(f"[+] Fixed graph_edges direction: {PERSON_A} -> {PERSON_B}")
    edges.to_csv(edges_path, index=False)

    # -------------------------------------------------------------
    # 3. Update relationships.csv & ground_truth_relationships.csv
    # -------------------------------------------------------------
    rel_path = os.path.join(base, "raw", "relationships.csv")
    rels = pd.read_csv(rel_path)
    r_mask = (
        ((rels["source_entity_id"] == PERSON_A) & (rels["target_entity_id"] == CASE_FLAGSHIP)) |
        ((rels["target_entity_id"] == PERSON_A) & (rels["source_entity_id"] == CASE_FLAGSHIP))
    )
    if r_mask.any():
        rels.loc[r_mask, "source_entity_id"] = PERSON_E
        rels.loc[r_mask, "confidence"] = 0.89

    # Enforce directed first hop in relationships: PERSON_A -> PERSON_B
    ab_rel_mask = (rels["source_entity_id"] == PERSON_B) & (rels["target_entity_id"] == PERSON_A)
    if ab_rel_mask.any():
        rels.loc[ab_rel_mask, "source_entity_id"] = PERSON_A
        rels.loc[ab_rel_mask, "target_entity_id"] = PERSON_B
        rels.loc[ab_rel_mask, "source_record_id"] = rels.loc[ab_rel_mask, "source_record_id"].astype(str).str.replace(
            f"{PERSON_B}_{PERSON_A}", f"{PERSON_A}_{PERSON_B}"
        )
        print(f"[+] Fixed relationships direction: {PERSON_A} -> {PERSON_B}")
    rels.to_csv(rel_path, index=False)

    gt_rel_path = os.path.join(base, "ground_truth", "ground_truth_relationships.csv")
    gt_rels = pd.read_csv(gt_rel_path)
    gt_r_mask = (
        ((gt_rels["source_entity_id"] == PERSON_A) & (gt_rels["target_entity_id"] == CASE_FLAGSHIP)) |
        ((gt_rels["target_entity_id"] == PERSON_A) & (gt_rels["source_entity_id"] == CASE_FLAGSHIP))
    )
    if gt_r_mask.any():
        gt_rels.loc[gt_r_mask, "source_entity_id"] = PERSON_E

    ab_gt_mask = (gt_rels["source_entity_id"] == PERSON_B) & (gt_rels["target_entity_id"] == PERSON_A)
    if ab_gt_mask.any():
        gt_rels.loc[ab_gt_mask, "source_entity_id"] = PERSON_A
        gt_rels.loc[ab_gt_mask, "target_entity_id"] = PERSON_B
        print(f"[+] Fixed ground_truth_relationships direction: {PERSON_A} -> {PERSON_B}")
    gt_rels.to_csv(gt_rel_path, index=False)

    # -------------------------------------------------------------
    # 4. Update evidence.csv
    # -------------------------------------------------------------
    ev_path = os.path.join(base, "raw", "evidence.csv")
    evs = pd.read_csv(ev_path)
    # EVID_000172 comes from FIR_0001
    ev_fir_mask = (evs["source_record_id"] == FIR_FLAGSHIP) | (evs["evidence_id"] == "EVID_000172")
    if ev_fir_mask.any():
        evs.loc[ev_fir_mask, "entity_id"] = PERSON_E
        evs.loc[ev_fir_mask, "description"] = (
            "Investigating officer noted unusual movement in the area prior to the reported incident. "
            "Primary suspect identified on scene."
        )

    # EVID_000508 was from INTEL_00001 which linked A to CASE_0001 directly
    ev_intel_mask = (evs["evidence_id"] == "EVID_000508") | (
        (evs["entity_id"] == PERSON_A) & (evs["case_id"] == CASE_FLAGSHIP)
    )
    if ev_intel_mask.any():
        evs.loc[ev_intel_mask, "case_id"] = np.nan

    # Align evidence supporting A->B relationship
    ab_ev_mask = (evs["entity_id"] == PERSON_B) & (evs["related_entity_id"] == PERSON_A)
    if ab_ev_mask.any():
        evs.loc[ab_ev_mask, "entity_id"] = PERSON_A
        evs.loc[ab_ev_mask, "related_entity_id"] = PERSON_B

    evs.to_csv(ev_path, index=False)
    print(f"[+] Updated {ev_path}: EVID_000172 points to {PERSON_E}, A unlinked from case evidence, A->B aligned")

    # -------------------------------------------------------------
    # 5. Update intelligence_reports.csv
    # -------------------------------------------------------------
    intel_path = os.path.join(base, "raw", "intelligence_reports.csv")
    intel = pd.read_csv(intel_path)
    # INTEL_00001: background intel on A meeting associates, unlinked from CASE_0001
    i1_mask = intel["report_id"] == "INTEL_00001"
    if i1_mask.any():
        intel.loc[i1_mask, "case_id"] = np.nan
    intel.to_csv(intel_path, index=False)
    print(f"[+] Updated {intel_path}: INTEL_00001 case_id cleared")

    # -------------------------------------------------------------
    # 6. Update surveillance_reports.csv
    # -------------------------------------------------------------
    surv_path = os.path.join(base, "raw", "surveillance_reports.csv")
    surv = pd.read_csv(surv_path)
    # SURV_00001: Swati Chauhan (A) was in Indore, routine surveillance, clear case_id
    s1_mask = surv["report_id"] == "SURV_00001"
    if s1_mask.any():
        surv.loc[s1_mask, "case_id"] = np.nan

    # Ensure there is direct surveillance tying E (Rajesh Rathore) to CASE_0001 near LOCATION_0041
    s_case_mask = surv["case_id"] == CASE_FLAGSHIP
    if s_case_mask.any():
        first_case_idx = surv[s_case_mask].index[0]
        surv.loc[first_case_idx, "person_reference"] = "Rajesh Rathore"
        surv.loc[first_case_idx, "vehicle_reference"] = "VEHICLE_00005"
        surv.loc[first_case_idx, "location_id"] = CRIME_LOCATION
        surv.loc[first_case_idx, "observation"] = (
            f"Rajesh Rathore was observed operating VEHICLE_00005 near {CRIME_LOCATION} "
            "prior to the reported incident."
        )
    surv.to_csv(surv_path, index=False)
    print(f"[+] Updated {surv_path}: SURV_00001 unlinked from CASE_0001; E surveillance established")

    # -------------------------------------------------------------
    # 7. Update financial_transactions.csv
    # -------------------------------------------------------------
    txn_path = os.path.join(base, "raw", "financial_transactions.csv")
    txns = pd.read_csv(txn_path)
    # Clear pre-tagged case_id from A's transaction TXN_000001 & TXN_000005
    acc_path = os.path.join(base, "raw", "bank_accounts.csv")
    accs = pd.read_csv(acc_path)
    a_accs = accs[accs["person_id"] == PERSON_A]["account_id"].tolist()
    a_txn_mask = (txns["case_id"] == CASE_FLAGSHIP) & (
        (txns["sender_account_id"].isin(a_accs)) | (txns["receiver_account_id"].isin(a_accs))
    )
    if a_txn_mask.any():
        txns.loc[a_txn_mask, "case_id"] = np.nan
    txns.to_csv(txn_path, index=False)
    print(f"[+] Updated {txn_path}: cleared case_id from A's transactions")

    # -------------------------------------------------------------
    # 8. Update location_events.csv
    # -------------------------------------------------------------
    loc_path = os.path.join(base, "raw", "location_events.csv")
    locs = pd.read_csv(loc_path)
    # Ensure E has a direct location event near the crime location around crime time
    e_loc_mask = (locs["entity_id"] == PERSON_E) & (locs["location_id"] == CRIME_LOCATION)
    if not e_loc_mask.any():
        e_event = {
            "location_event_id": "LOCEV_015001",
            "timestamp": "2025-08-29 19:10:00",
            "entity_type": "PERSON",
            "entity_id": PERSON_E,
            "tower_id": "TOWER_0001",
            "location_id": CRIME_LOCATION,
            "source": "TOWER_PING",
            "accuracy": 0.88,
            "confidence": 0.94
        }
        locs = pd.concat([locs, pd.DataFrame([e_event])], ignore_index=True)
    # Verify A has zero location events at CRIME_LOCATION
    a_crime_loc = (locs["entity_id"] == PERSON_A) & (locs["location_id"] == CRIME_LOCATION)
    if a_crime_loc.any():
        locs = locs[~a_crime_loc]
    locs.to_csv(loc_path, index=False)
    print(f"[+] Updated {loc_path}: E has location event at {CRIME_LOCATION}; A has 0")

    # -------------------------------------------------------------
    # 9. Synchronize train/ split partitions
    # -------------------------------------------------------------
    print("[*] Synchronizing train/ validation/ test/ partitions...")
    train_cases_path = os.path.join(base, "train", "cases.csv")
    train_cases = set(pd.read_csv(train_cases_path)["case_id"])

    # Synchronize train/fir_records.csv
    firs[firs["case_id"].isin(train_cases)].to_csv(os.path.join(base, "train", "fir_records.csv"), index=False)

    # Synchronize train/evidence.csv
    evs[evs["case_id"].isin(train_cases)].to_csv(os.path.join(base, "train", "evidence.csv"), index=False)

    # Synchronize train/financial_transactions.csv
    txns[txns["case_id"].isin(train_cases)].to_csv(os.path.join(base, "train", "financial_transactions.csv"), index=False)

    # Synchronize train/intelligence_reports.csv
    intel[intel["case_id"].isin(train_cases)].to_csv(os.path.join(base, "train", "intelligence_reports.csv"), index=False)

    # Synchronize train/surveillance_reports.csv
    surv[surv["case_id"].isin(train_cases)].to_csv(os.path.join(base, "train", "surveillance_reports.csv"), index=False)
    print("[+] Partitions synchronized successfully.")

    # -------------------------------------------------------------
    # 10. Update dataset_statistics.json
    # -------------------------------------------------------------
    stats_path = os.path.join(base, "metadata", "dataset_statistics.json")
    if os.path.exists(stats_path):
        with open(stats_path, "r") as f:
            stats = json.load(f)
        stats["generated_at_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        stats["row_counts"]["fir_records.csv"] = len(firs)
        stats["row_counts"]["graph_edges.csv"] = len(edges)
        stats["row_counts"]["relationships.csv"] = len(rels)
        stats["row_counts"]["evidence.csv"] = len(evs)
        stats["row_counts"]["location_events.csv"] = len(locs)
        with open(stats_path, "w") as f:
            json.dump(stats, f, indent=2)
        print(f"[+] Updated {stats_path}")

    print("[*] Regeneration complete!")

if __name__ == "__main__":
    run_generator()
