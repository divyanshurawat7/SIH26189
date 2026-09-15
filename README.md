# SIH26189 — AI-Powered Criminal Network Analysis System
**Ministry of Home Affairs | Smart India Hackathon**

An automated intelligence system designed to ingest, resolve, and analyze structured and unstructured crime-related data to uncover hidden criminal syndicates, detect key coordinators/influencers, recognize suspicious patterns, and provide actionable investigative intelligence.

---

## 1. System Architecture & Roadmap

The application pipeline is built in structured, verifiable phases:

```
[RAW MULTI-SOURCE DATA]
         │
         ▼
[PHASE 1: DATA LOADER & INTEGRITY ENGINE]  ◄── (Completed)
         │  • Ingests 20 heterogeneous evidence tables
         │  • Relational foreign-key and schema integrity checks
         │  • In-memory RawDataset container
         ▼
[PHASE 2: ENTITY RESOLUTION & NORMALIZATION]
         │  • Phone, device, account, and vehicle cross-referencing
         │  • Same-name ambiguity resolution & NLP alias linking
         ▼
[PHASE 3: GRAPH CONSTRUCTION & KNOWLEDGE BASE]
         │  • NetworkX / Graph store export
         │  • Typed, weighted, multi-layer graph modeling
         ▼
[PHASE 4: COORDINATOR & INFLUENCER DISCOVERY]
         │  • Multi-hop temporal path discovery (A → B → C → D → E)
         │  • Centrality vs influence differentiation (innocent high-degree traps)
         ▼
[PHASE 5: INVESTIGATOR INTERFACE & DOSSIER EXPORT]
```

---

## 2. Directory Structure

```
SIH26189/
├── SIH26189_SYNTHETIC_DATASET/   # Immutable source dataset
│   ├── raw/                      # 20 source evidence tables (19 relational + cases)
│   ├── graph/                    # Exported graph edges
│   ├── ground_truth/             # Benchmark labels for offline evaluation
│   ├── train/ validation/ test/  # Leakage-free partition splits
│   └── metadata/                 # Data dictionaries and validation reports
├── src/                          # Application source code
│   ├── __init__.py
│   ├── data_loader.py            # DataLoader, RawDataset container & FK validator
│   └── utils/
│       ├── __init__.py
│       └── logger.py             # Formatted system logger
├── tests/                        # Automated unit & integration tests
│   ├── __init__.py
│   └── test_data_loader.py       # Table ingestion, count & FK integrity suite
├── requirements.txt              # Production and development dependencies
└── README.md                     # Application documentation
```

---

## 3. Dataset Tables Ingested (Phase 1)

| Table | File | Rows | Description |
|---|---|---|---|
| `persons` | `persons.csv` | 1,500 | Individuals, demographic profiles, risk flags |
| `organizations` | `organizations.csv` | 300 | Front companies, businesses, criminal enterprises |
| `phones` | `phones.csv` | 2,025 | SIM card records and subscriber associations |
| `devices` | `devices.csv` | 2,000 | IMEI/hardware identifiers |
| `bank_accounts` | `bank_accounts.csv` | 913 | Financial institution accounts |
| `financial_transactions` | `financial_transactions.csv` | 20,000 | Inter-account fund transfers (UPI, NEFT, IMPS) |
| `vehicles` | `vehicles.csv` | 762 | Vehicle registrations, makes, and models |
| `vehicle_events` | `vehicle_events.csv` | 10,000 | ANPR and police checkpoint sightings |
| `locations` | `locations.csv` | 300 | Geographic points of interest and crime scenes |
| `cell_towers` | `cell_towers.csv` | 150 | Telecom BTS towers with coverage radii |
| `location_events` | `location_events.csv` | 15,001 | Cell tower subscriber pings |
| `cdr_records` | `cdr_records.csv` | 30,000 | Telecom call detail records (voice, SMS) |
| `fir_records` | `fir_records.csv` | 300 | First Information Reports filed at police stations |
| `cases` | `cases.csv` | 300 | Official investigative case dockets |
| `surveillance_reports` | `surveillance_reports.csv` | 5,000 | Field surveillance unit observation logs |
| `social_media_records` | `social_media_records.csv` | 5,000 | OSINT social media interactions and posts |
| `criminal_history` | `criminal_history.csv` | 331 | Prior arrest, charge, and conviction records |
| `intelligence_reports` | `intelligence_reports.csv` | 2,000 | Human intelligence (HUMINT) field reports |
| `relationships` | `relationships.csv` | 8,672 | Evidence-backed operational relationships |
| `evidence` | `evidence.csv` | 2,600 | Provenance chain linking facts to source records |

---

## 4. Quickstart Guide

### Environment Setup
Activate your Python 3.11+ environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Loading the Dataset in Python
```python
from src.data_loader import DataLoader

loader = DataLoader()
dataset = loader.load_all(validate=True)

# Access any table directly
print(f"Persons: {len(dataset.persons)}")
print(f"CDR Records: {len(dataset.cdr_records)}")
print(f"Financial Transactions: {len(dataset.financial_transactions)}")

# Dictionary-style access also supported
df_fir = dataset["fir_records"]
```

### Running Entity Resolution in Python
```python
from src.data_loader import DataLoader
from src.entity_resolution import EntityResolver, CandidateGenerator

loader = DataLoader()
dataset = loader.load_all(validate=False)

resolver = EntityResolver()
candidates = CandidateGenerator.generate_candidate_pairs(dataset.persons)
results = resolver.resolve_candidates(dataset.persons, candidates)

summary = EntityResolver.get_summary(results)
print("Resolution summary:", summary)
```

### Running Graph Construction in Python
```python
from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder, GraphStatisticsReporter
from src.neo4j_loader import Neo4jLoader

loader = DataLoader()
dataset = loader.load_all(validate=False)

builder = GraphBuilder()
G = builder.build_graph(dataset)

stats = GraphStatisticsReporter.generate_statistics(G)
print(f"Graph nodes: {stats.total_nodes}, edges: {stats.total_edges}")
print(f"Flagship directed path: {' -> '.join(stats.flagship_shortest_path)}")

# Export Cypher script for offline Neo4j loading
Neo4jLoader.export_cypher_script(G, output_file="export_sih26189_graph.cypher")
```

### Running Influencer Detection in Python
```python
from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder
from src.influencer_detection import InfluencerDetector

loader = DataLoader()
dataset = loader.load_all(validate=False)

builder = GraphBuilder()
G = builder.build_graph(dataset)

detector = InfluencerDetector(G)
top_influencers = detector.get_top_influencers(20)

for rank, inf in enumerate(top_influencers, 1):
    if inf.supporting_paths:
        print("   Path:", " -> ".join(inf.supporting_paths[0]))
```

### Running Temporal & Spatial Analysis in Python
```python
from src.data_loader import DataLoader
from src.temporal_analysis import TemporalAnalyzer
from src.spatial_analysis import SpatialAnalyzer

loader = DataLoader()
dataset = loader.load_all(validate=False)

temporal = TemporalAnalyzer(dataset)
timeline = temporal.build_person_timeline("PERSON_1476")
print(f"Timeline events for PERSON_1476: {len(timeline)}")

spatial = SpatialAnalyzer(dataset)
convoys = spatial.detect_co_travel(min_shared_trips=1, time_window_minutes=90)
print(f"Detected vehicle convoys: {len(convoys)}")
```

### Running Suspicious Pattern & Cross-Case Detection in Python
```python
from src.data_loader import DataLoader
from src.pattern_detection import PatternDetector

loader = DataLoader()
dataset = loader.load_all(validate=False)

detector = PatternDetector(dataset)
findings = detector.detect_all_patterns()
print(f"Total intelligence findings generated: {len(findings)}")

# Inspect flagship case finding
flagship = next(f for f in findings if f.case_id == "CASE_0001")
print("Flagship Finding:")
print(flagship)
```

### Running Evidence Traceability & Investigation Insights (Phase 6) in Python
```python
from src.data_loader import DataLoader
from src.graph_builder import GraphBuilder
from src.evidence_traceability import EvidenceTracer
from src.investigation_insights import InvestigationInsightsGenerator

loader = DataLoader()
dataset = loader.load_all(validate=False)
graph = GraphBuilder().build_graph(dataset)

# 1. High-Performance Evidence Tracer (O(1) lookups across all 11 source categories)
tracer = EvidenceTracer(dataset, graph)

# Lookup single record provenance
item = tracer.get_evidence_by_record_id("CALL_000001")
print(f"Record Provenance: {item}")

# Trace multi-hop chain with hop-by-hop breakdown
chain = ["PERSON_1476", "PERSON_0026", "PERSON_0397", "PERSON_0405", "PERSON_1459", "CASE_0001"]
chain_trace = tracer.trace_chain(chain)
print(f"Chain Diversity Score: {chain_trace.diversity_score}, Categories: {chain_trace.source_categories}")

# 2. Investigation Insights Generator
insights = InvestigationInsightsGenerator(dataset, graph, tracer)

# Generate Person Dossier
p_dossier = insights.generate_person_insight("PERSON_1476")
print(f"Person Insight: {p_dossier.name} [{p_dossier.predicted_role}] (Conf: {p_dossier.confidence})")
print(f"Narrative: {p_dossier.narrative}")

# Generate Flagship CASE_0001 Dossier
c_dossier = insights.generate_flagship_case_0001_dossier()
print(f"Case Dossier: {c_dossier.case_id} | Upstream Coordinator: {c_dossier.upstream_coordinator}")
print(f"Recovered Chain: {' -> '.join(c_dossier.operational_chain)}")
print(f"Case Narrative: {c_dossier.narrative}")

# False-Positive Control Audit (PERSON_0553)
fp_audit = insights.explain_false_positive_control("PERSON_0553")
print(f"PERSON_0553 Innocence Justification: {fp_audit['justification']}")
```

### Running the Investigation REST API Backend (Phase 7)

The system exposes a high-performance, explainable REST API built on **FastAPI**, **Pydantic**, and **Uvicorn**.

#### 1. Installation
```bash
pip install -r requirements.txt
```

#### 2. Starting the Development Server
```bash
uvicorn src.api:app --reload --port 8000
```
*Note: The intelligence engine indexes the dataset and builds graph models once during startup (~29s warmup). Once loaded, individual API queries execute in $<0.5\text{ ms}$.*

#### 3. Accessing Interactive API Documentation
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### 4. Available Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, dataset status, and completed pipeline phases |
| `GET` | `/persons/{person_id}` | Actor dossier, predicted role, centralities, evidence diversity, and narrative |
| `GET` | `/persons/{person_id}/network` | 1-hop topology, influencer neighbors, operational paths, role breakdown |
| `GET` | `/persons/{person_id}/evidence` | Traceable evidence records for the person across 11 source categories |
| `GET` | `/cases/{case_id}` | Case overview, FIR details, key actors, locations, vehicles, patterns |
| `GET` | `/cases/{case_id}/timeline` | Chronologically ordered forensic event stream (calls, transactions, sightings, FIR) |
| `GET` | `/cases/{case_id}/evidence` | Traceable case evidence grouped by source category (`CDR`, `FINANCIAL`, etc.) |
| `GET` | `/networks/{network_id}` | Syndicate structural profile (`NET_001`–`NET_012`), hierarchy, key paths |
| `GET` | `/findings` | Filterable pattern findings (`?case_id=...&person_id=...&min_confidence=0.8`) |
| `GET` | `/findings/{finding_id}` | Detailed finding with supporting records, categories, and explanation |
| `GET` | `/cross-case/{entity_id}` | Cross-case analysis with linkage strength and overlap suppression logic |
| `GET` | `/investigation/{case_id}` | **Primary Demo Endpoint**: Dynamic end-to-end dossier (coordinator, 5-hop chain, multi-source evidence) |

#### 5. Example Requests and Responses

##### Health Check (`GET /health`)
```bash
curl -s http://localhost:8000/health
```
```json
{
  "status": "ok",
  "service": "SIH26189 Investigation API",
  "dataset": "synthetic",
  "phases_completed": 6
}
```

##### Flagship Case Investigation Dossier (`GET /investigation/CASE_0001`)
```bash
curl -s http://localhost:8000/investigation/CASE_0001
```
```json
{
  "case_id": "CASE_0001",
  "case_summary": {
    "case_id": "CASE_0001",
    "crime_type": "extortion",
    "status": "under_investigation",
    "fir_id": "FIR_0001",
    "incident_date": "2024-01-15",
    "incident_location": "LOCATION_0041"
  },
  "upstream_coordinator": "PERSON_1476",
  "operational_chain": [
    "PERSON_1476",
    "PERSON_0026",
    "PERSON_0397",
    "PERSON_0405",
    "PERSON_1459",
    "CASE_0001"
  ],
  "brokers": ["PERSON_0026", "PERSON_0397", "PERSON_0405"],
  "operational_members": ["PERSON_1459"],
  "financial_facilitators": [],
  "financial_evidence": [...],
  "communication_evidence": [...],
  "temporal_evidence": [...],
  "spatial_evidence": [...],
  "vehicle_evidence": [...],
  "cross_case_connections": [],
  "evidence_traceability": {
    "total_case_records": 10,
    "evidence_diversity_score": 6,
    "source_categories": [
      "EVIDENCE_RECORD",
      "FINANCIAL_TRANSACTION",
      "FIR_RECORD",
      "INTELLIGENCE_REPORT",
      "RELATIONSHIP",
      "SURVEILLANCE_REPORT"
    ],
    "operational_chain_length": 6
  },
  "confidence": 0.98,
  "investigator_narrative": "Investigation of CASE_0001 (extortion, status: under_investigation) directed by Upstream Coordinator PERSON_1476 via operational chain (PERSON_1476 -> PERSON_0026 -> PERSON_0397 -> PERSON_0405 -> PERSON_1459 -> CASE_0001)..."
}
```

### Running Automated Tests
```bash
python -m unittest discover tests/ -v
```

---

## 5. Phase Summary & Status

- [x] **Phase 1: Data Ingestion & Schema Integrity**: Complete (20 raw tables loaded, FK validated, 6/6 tests passing).
- [x] **Phase 2: Person Entity Resolution**: Complete (Explainable multi-attribute matching, candidate blocking, 0 false merges on 65 traps, 25/25 tests passing).
- [x] **Phase 3: Graph Construction & Neo4j Integration**: Complete (NetworkX MultiDiGraph with 12 entity types, full source traceability, 0 coordinator direct edges, Cypher exporter, offline fallback, 15/15 tests passing).
- [x] **Phase 4: Upstream Coordinator Discovery & Influencer Detection**: Complete (Graph feature extraction, broker detection, multi-hop directed chain recovery, innocent high-degree trap differentiation, post-prediction GT evaluation — 10/10 tests passing).
- [x] **Phase 5: Suspicious Pattern, Temporal, Spatial, & Cross-Case Analysis**: Complete (Activity timelines, communication bursts, rapid transfer chains, layered financial+call cascades, dual-tier vehicle convoys, audited cross-case entity links, innocent control handling, post-prediction GT evaluation — 20/20 tests passing).
- [x] **Phase 6: Evidence Traceability & Investigation Insights**: Complete (Unified evidence tracing across all 11 source categories, in-memory O(1) indexing of 98,904 records, hop-by-hop multi-hop chain tracing, source diversity scoring, explainable confidence aggregation, Person/Case/Network/Cross-Case dossiers, innocent PERSON_0553 forensic justification — 93/93 tests passing).
- [x] **Phase 7: Investigation REST API Backend**: Complete (FastAPI, Pydantic v2, Uvicorn service layer, 12 endpoints covering actor profiles, case timelines, grouped evidence, syndicate structures, filterable pattern findings, cross-case analysis, and dynamic flagship investigation dossiers; sub-millisecond query latencies — **117/117 total tests passing**).
