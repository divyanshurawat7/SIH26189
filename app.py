import streamlit as st
import pandas as pd
import networkx as nx
from pathlib import Path

# ============================================================
# CONFIG
# ============================================================

st.set_page_config(
    page_title="Criminal Network Intelligence",
    page_icon="🔎",
    layout="wide"
)

BASE_DIR = Path(__file__).resolve().parent

# ============================================================
# HELPERS
# ============================================================
def find_csv(filename):
    """Search recursively for a CSV anywhere inside the project."""

    matches = list(BASE_DIR.rglob(filename))

    if matches:
        return matches[0]

    return None

def load_csv(filename):
    path = find_csv(filename)

    if path is None:
        return pd.DataFrame()

    try:
        return pd.read_csv(path)
    except Exception:
        return pd.DataFrame()


def find_column(df, possible_names):
    """Find first matching column."""
    if df.empty:
        return None

    lower_map = {c.lower(): c for c in df.columns}

    for name in possible_names:
        if name.lower() in lower_map:
            return lower_map[name.lower()]

    return None


# ============================================================
# DATA LOADING
# ============================================================

@st.cache_data
def load_data():

    data = {}

    files = [
        "persons.csv",
        "cases.csv",
        "relationships.csv",
        "phones.csv",
        "bank_accounts.csv",
        "transactions.csv",
        "cdr.csv",
        "location_events.csv",
        "vehicles.csv",
        "evidence.csv",
        "fir.csv",
        "surveillance.csv",
        "social_media.csv",
    ]

    for filename in files:
        key = filename.replace(".csv", "")
        data[key] = load_csv(filename)

    return data


data = load_data()

# ============================================================
# HEADER
# ============================================================

st.title("🔎 AI-Powered Criminal Network Intelligence System")

st.caption(
    "Synthetic law-enforcement intelligence analysis • "
    "Entity Resolution • Network Analysis • Explainable Intelligence"
)

st.divider()

# ============================================================
# SIDEBAR
# ============================================================

st.sidebar.header("Investigation")

cases = data.get("cases", pd.DataFrame())

case_id_col = find_column(
    cases,
    ["case_id", "id", "caseid"]
)

if not cases.empty and case_id_col:

    case_ids = cases[case_id_col].dropna().astype(str).unique().tolist()

    selected_case = st.sidebar.selectbox(
        "Select Case",
        case_ids
    )

else:

    selected_case = st.sidebar.text_input(
        "Case ID",
        value="CASE_0001"
    )


# ============================================================
# DASHBOARD METRICS
# ============================================================

st.subheader("Investigation Overview")

c1, c2, c3, c4 = st.columns(4)

persons = data.get("persons", pd.DataFrame())
relationships = data.get("relationships", pd.DataFrame())
transactions = data.get("transactions", pd.DataFrame())
cdr = data.get("cdr", pd.DataFrame())

with c1:
    st.metric(
        "Persons",
        f"{len(persons):,}"
    )

with c2:
    st.metric(
        "Relationships",
        f"{len(relationships):,}"
    )

with c3:
    st.metric(
        "Transactions",
        f"{len(transactions):,}"
    )

with c4:
    st.metric(
        "CDR Records",
        f"{len(cdr):,}"
    )

st.divider()

# ============================================================
# CASE INFORMATION
# ============================================================

st.subheader(f"📁 Case: {selected_case}")

if not cases.empty and case_id_col:

    case_row = cases[
        cases[case_id_col].astype(str) == str(selected_case)
    ]

    if not case_row.empty:

        st.dataframe(
            case_row,
            use_container_width=True,
            hide_index=True
        )

else:

    st.info(
        "Case information could not be loaded. "
        "Check the location of cases.csv."
    )

# ============================================================
# COORDINATOR ANALYSIS
# ============================================================

# st.divider()

# st.subheader("🎯 Potential Coordinators")

# st.write(
#     "This section will display entities that appear to coordinate "
#     "activity across multiple hops."
# )

# # Try importing existing project module
# try:

#     from src.influencer_detection import InfluencerDetector

#     detector = InfluencerDetector(graph)

#     st.success(
#         "Influencer detection module found."
#     )

#     st.info(
#         "Existing coordinator-analysis module is available. "
#         "The detailed integration will be connected here next."
#     )

# except Exception as e:

#     st.warning(
#         "Coordinator detector could not be loaded yet."
#     )

#     with st.expander("Technical details"):
#         st.code(str(e))

# ============================================================
# COORDINATOR ANALYSIS
# ============================================================

st.divider()

st.subheader("🎯 Potential Coordinators")

st.write(
    "Entities that may coordinate activity across multiple hops."
)

try:
    from src.influencer_detection import InfluencerDetector

    # --------------------------------------------------------
    # Build graph from the existing relationship data
    # --------------------------------------------------------

    graph = nx.MultiDiGraph()

    if not relationships.empty:

        source_col = find_column(
            relationships,
            [
                "source_entity_id",
                "source_id",
                "source",
                "from_id",
                "person_id"
            ]
        )

        target_col = find_column(
            relationships,
            [
                "target_entity_id",
                "target_id",
                "target",
                "to_id",
                "related_id"
            ]
        )

        type_col = find_column(
            relationships,
            [
                "relationship_type",
                "edge_type",
                "type"
            ]
        )

        if source_col and target_col:

            for _, row in relationships.iterrows():

                source = str(row[source_col])
                target = str(row[target_col])

                if source == "nan" or target == "nan":
                    continue

                relationship_type = (
                    str(row[type_col])
                    if type_col
                    else "RELATIONSHIP"
                )

                graph.add_edge(
                    source,
                    target,
                    relationship_type=relationship_type
                )

    # --------------------------------------------------------
    # Create detector
    # --------------------------------------------------------

    if graph.number_of_nodes() > 0:

        detector = InfluencerDetector(graph)

        st.success(
            f"Influencer detector loaded — "
            f"{graph.number_of_nodes():,} nodes / "
            f"{graph.number_of_edges():,} edges"
        )

        st.info(
            "Coordinator analysis engine is connected to the network."
        )

    else:

        st.warning(
            "Graph is empty. Check relationships.csv."
        )

except Exception as e:

    st.error(
        "Coordinator detector could not be loaded."
    )

    with st.expander("Technical details"):
        st.code(str(e))
# ============================================================
# NETWORK DATA
# ============================================================


# ============================================================
# NETWORK DATA
# ============================================================

st.divider()

st.subheader("🕸️ Network")

st.write(
    "Basic relationship network extracted from the synthetic dataset."
)

if not relationships.empty:

    source_col = find_column(
        relationships,
        [
            "source_entity_id",
            "source_id",
            "source",
            "from_id",
            "person_id"
        ]
    )

    target_col = find_column(
        relationships,
        [
            "target_entity_id",
            "target_id",
            "target",
            "to_id",
            "related_id"
        ]
    )

    type_col = find_column(
        relationships,
        [
            "relationship_type",
            "edge_type",
            "type"
        ]
    )

    if source_col and target_col:

        G = nx.MultiDiGraph()

        # First 500 relationships for basic visualization
        sample = relationships.head(500)

        for _, row in sample.iterrows():

            source = str(row[source_col])
            target = str(row[target_col])

            if source == "nan" or target == "nan":
                continue

            relationship_type = (
                str(row[type_col])
                if type_col
                else "RELATIONSHIP"
            )

            G.add_edge(
                source,
                target,
                relationship_type=relationship_type
            )

        # Network statistics
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric(
                "Network Nodes",
                f"{G.number_of_nodes():,}"
            )

        with col2:
            st.metric(
                "Network Edges",
                f"{G.number_of_edges():,}"
            )

        with col3:
            if type_col:
                st.metric(
                    "Relationship Types",
                    f"{relationships[type_col].nunique():,}"
                )
            else:
                st.metric(
                    "Relationship Types",
                    "—"
                )

        st.write(
            f"Showing first {len(sample):,} relationship records."
        )

        # Relationship table
        display_cols = [
            source_col,
            target_col
        ]

        if type_col:
            display_cols.append(type_col)

        st.dataframe(
            relationships[display_cols].head(100),
            use_container_width=True,
            hide_index=True
        )

    else:

        st.error(
            "Could not identify source/target columns."
        )

else:

    st.info(
        "relationships.csv was not found."
    )

# if not relationships.empty:

#     source_col = find_column(
#         relationships,
#         ["source_id", "source", "from_id", "person_id"]
#     )

#     target_col = find_column(
#         relationships,
#         ["target_id", "target", "to_id", "related_id"]
#     )

#     if source_col and target_col:

#         G = nx.Graph()

#         # Keep the initial graph small for Streamlit
#         sample = relationships.head(300)

#         for _, row in sample.iterrows():

#             source = str(row[source_col])
#             target = str(row[target_col])

#             if source != "nan" and target != "nan":

#                 G.add_edge(source, target)

#         st.write(
#             f"Showing first {len(sample):,} relationship records."
#         )

#         graph_df = pd.DataFrame(
#             list(G.edges()),
#             columns=["Source", "Target"]
#         )

#         st.dataframe(
#             graph_df.head(100),
#             use_container_width=True,
#             hide_index=True
#         )

#     else:

#         st.warning(
#             "Could not identify source/target columns "
#             "in relationships.csv."
#         )

# else:

#     st.info(
#         "relationships.csv was not found."
#     )


# ============================================================
# DATA SOURCES
# ============================================================

st.divider()

st.subheader("📊 Available Intelligence Sources")

source_rows = []

for name, df in data.items():

    source_rows.append({
        "Source": name,
        "Records": len(df),
        "Status": "Loaded" if not df.empty else "Not Found"
    })

source_df = pd.DataFrame(source_rows)

st.dataframe(
    source_df,
    use_container_width=True,
    hide_index=True
)


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "SIH26189 • Synthetic Intelligence Dataset • "
    "Investigator Console v0.1"
)