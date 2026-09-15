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
    print(f"{rank}. {inf.person_id} [{inf.predicted_role}] (Conf: {inf.confidence_score:.2f})")
    if inf.supporting_paths:
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
convoys = spatial.detect_co_travel(min_shared_trips=2, time_window_minutes=45)
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
- [x] **Phase 5: Suspicious Pattern, Temporal, Spatial, & Cross-Case Analysis**: Complete (Activity timelines, communication bursts, rapid transfer chains, layered financial+call cascades, vehicle convoys, cross-case entity links, innocent control handling, post-prediction GT evaluation — **75/75 total tests passing**).
- [ ] **Phase 6: Investigator Interface & Case Dossier Generation**: Pending.



