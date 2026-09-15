"""
SIH26189 — AI-Powered Criminal Network Analysis System
Module: src/entity_resolution.py

Phase 2: Person Entity Resolution
Identifies records that likely refer to the same real-world PERSON while
strictly avoiding false merges of distinct individuals with similar names.

Features:
- Robust name normalization (lowercase, punctuation, whitespace, camelCase splitting, initial handling).
- Candidate pair blocking (inverted indexing on initial+surname, address, phone) to eliminate >99% of unneeded comparisons.
- Multi-attribute explainable similarity scoring across:
  name, name_variant, gender, age, city, address_id, primary_phone_id.
- Conservative decision thresholds (HIGH, MEDIUM, LOW) with hard conflict penalties (gender, severe age gap, distinct first names).
- Detailed, auditable investigator explanations and explicit matched/conflicting field tracking.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
import difflib
import re
from typing import Dict, List, Optional, Tuple, Any, Set, Union
import pandas as pd

from src.utils.logger import get_logger

logger = get_logger("EntityResolution")


class ResolutionDecision(str, Enum):
    """Conservative decision categories for entity resolution."""
    HIGH = "HIGH"        # Likely same real-world entity
    MEDIUM = "MEDIUM"    # Needs investigator review
    LOW = "LOW"          # Likely different entity


@dataclass
class ResolutionResult:
    """
    Structured outcome of comparing two entity records.
    Contains decision, similarity score, explicit matched/conflicting attributes,
    and a clear investigator explanation.
    """
    person_id_1: str
    person_id_2: str
    similarity_score: float
    decision: str
    matched_fields: List[str] = field(default_factory=list)
    conflicting_fields: List[str] = field(default_factory=list)
    explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary representation."""
        return asdict(self)

    def __str__(self) -> str:
        return (
            f"[{self.decision}] {self.person_id_1} <-> {self.person_id_2} "
            f"(Score: {self.similarity_score:.3f})\n"
            f"  Matched:     {', '.join(self.matched_fields) if self.matched_fields else 'None'}\n"
            f"  Conflicting: {', '.join(self.conflicting_fields) if self.conflicting_fields else 'None'}\n"
            f"  Explanation: {self.explanation}"
        )


class NameNormalizer:
    """
    Normalizes person names and evaluates linguistic similarity.
    Handles case, punctuation, camelCase splitting, initials, and common abbreviations.
    """

    # Common Indian / formal titles that can safely be removed during normalization
    HONORIFICS = {"mr", "mrs", "ms", "miss", "dr", "smt", "shri", "adv", "prof"}

    @classmethod
    def normalize(cls, name: Optional[str]) -> str:
        """
        Normalizes a name string:
        - None/nan -> ""
        - Splits camelCase words (e.g. 'ManojNair' -> 'Manoj Nair')
        - Strips punctuation (dots, commas, hyphens, quotes, slashes)
        - Removes leading honorifics/titles
        - Collapses whitespace
        - Converts to lowercase
        """
        if not name or pd.isna(name):
            return ""
        s = str(name).strip()

        # Split CamelCase or concatenated capitalized tokens (e.g. 'ManojNair' -> 'Manoj Nair')
        s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)

        # Replace non-alphanumeric characters with space
        s = re.sub(r"[^a-zA-Z0-9\s]", " ", s)

        # Lowercase and split tokens
        tokens = [t.lower() for t in s.split() if t.strip()]

        # Strip leading honorific if followed by other tokens
        if tokens and tokens[0] in cls.HONORIFICS and len(tokens) > 1:
            tokens = tokens[1:]

        return " ".join(tokens)

    @classmethod
    def get_tokens(cls, name: Optional[str]) -> List[str]:
        """Returns list of normalized name tokens."""
        norm = cls.normalize(name)
        return norm.split() if norm else []

    @classmethod
    def extract_initial_and_surname(cls, name: Optional[str]) -> Tuple[str, str]:
        """
        Extracts (first_initial, surname) for candidate blocking.
        Example: 'Priya Chauhan' -> ('p', 'chauhan')
                 'P. Chauhan'     -> ('p', 'chauhan')
                 'Swati J.'       -> ('s', 'j')
        """
        tokens = cls.get_tokens(name)
        if not tokens:
            return ("", "")
        if len(tokens) == 1:
            return (tokens[0][0], tokens[0])
        return (tokens[0][0], tokens[-1])

    @classmethod
    def compare_names(
        cls,
        name1: Optional[str],
        variant1: Optional[str],
        name2: Optional[str],
        variant2: Optional[str]
    ) -> Tuple[float, str, Optional[str]]:
        """
        Compares two people's names across primary and variant strings.

        Returns:
            similarity (0.0 to 1.0)
            match_type (EXACT, INITIAL_SURNAME, FIRST_NAME_LAST_INITIAL, FUZZY, SURNAME_ONLY, NONE)
            conflict_note (None if no direct conflict, or string note e.g. distinct first names)
        """
        norm_n1 = cls.normalize(name1)
        norm_v1 = cls.normalize(variant1)
        norm_n2 = cls.normalize(name2)
        norm_v2 = cls.normalize(variant2)

        # Check for conflicts between primary names:
        # 1. First-name conflict: If both records have distinct full first names (e.g. 'Ashok' vs 'Amit'),
        # they must NOT be resolved as the same person even if both have variant 'A. Pandey'.
        # 2. Surname conflict: If both records have distinct full surnames (e.g. 'Reddy' vs 'Rathore'),
        # they must NOT be resolved as the same person even if both have variant 'Divya R.'.
        tok_n1 = norm_n1.split()
        tok_n2 = norm_n2.split()
        if len(tok_n1) >= 2 and len(tok_n2) >= 2:
            fn1, ln1 = tok_n1[0], tok_n1[-1]
            fn2, ln2 = tok_n2[0], tok_n2[-1]
            
            # Distinct full first names check
            if len(fn1) > 1 and len(fn2) > 1 and fn1 != fn2:
                fn_sim = difflib.SequenceMatcher(None, fn1, fn2).ratio()
                if fn_sim < 0.80:
                    conflict = f"distinct first names ('{tok_n1[0]}' vs '{tok_n2[0]}')"
                    if ln1 == ln2:
                        return (0.20, "SURNAME_ONLY", conflict)
                    return (0.0, "NONE", conflict)

            # Distinct full surnames check
            if len(ln1) > 1 and len(ln2) > 1 and ln1 != ln2:
                ln_sim = difflib.SequenceMatcher(None, ln1, ln2).ratio()
                if ln_sim < 0.80:
                    conflict = f"distinct surnames ('{tok_n1[-1]}' vs '{tok_n2[-1]}')"
                    if fn1 == fn2:
                        return (0.20, "FIRST_NAME_ONLY", conflict)
                    return (0.0, "NONE", conflict)

        candidates_1 = [n for n in (norm_n1, norm_v1) if n]
        candidates_2 = [n for n in (norm_n2, norm_v2) if n]

        if not candidates_1 or not candidates_2:
            return (0.0, "NONE", None)

        best_score = 0.0
        best_type = "NONE"

        for s1 in candidates_1:
            for s2 in candidates_2:
                score, match_type = cls._compare_single_pair(s1, s2)
                if score > best_score:
                    best_score = score
                    best_type = match_type

        return (best_score, best_type, None)

    @classmethod
    def _compare_single_pair(cls, s1: str, s2: str) -> Tuple[float, str]:
        """Evaluates similarity between two normalized strings."""
        if s1 == s2:
            return (1.0, "EXACT")

        t1 = s1.split()
        t2 = s2.split()

        if len(t1) >= 2 and len(t2) >= 2:
            # Check surname match
            if t1[-1] == t2[-1]:
                # Check first initial match: e.g. 'p chauhan' vs 'priya chauhan'
                if (len(t1[0]) == 1 and t2[0].startswith(t1[0])) or (len(t2[0]) == 1 and t1[0].startswith(t2[0])):
                    return (0.88, "INITIAL_SURNAME")

                # Check fuzzy first name match: e.g. 'suresh' vs 'sureshh'
                fn_ratio = difflib.SequenceMatcher(None, t1[0], t2[0]).ratio()
                if fn_ratio >= 0.82:
                    return (0.85, "FUZZY")

                return (0.25, "SURNAME_ONLY")

            # Check first name match and last initial: e.g. 'swati j' vs 'swati joshi'
            if t1[0] == t2[0]:
                if (len(t1[-1]) == 1 and t2[-1].startswith(t1[-1])) or (len(t2[-1]) == 1 and t1[-1].startswith(t2[-1])):
                    return (0.88, "FIRST_NAME_LAST_INITIAL")

        # Full string fuzzy ratio
        full_ratio = difflib.SequenceMatcher(None, s1, s2).ratio()
        if full_ratio >= 0.85:
            return (full_ratio, "FUZZY")

        return (0.0, "NONE")


class CandidateGenerator:
    """
    Generates candidate person pairs using inverted index blocking.
    Avoids O(N^2) pairwise comparisons by partitioning records into candidate blocks.
    """

    @classmethod
    def generate_candidate_pairs(
        cls,
        persons_df: pd.DataFrame,
        include_address_blocks: bool = True,
        include_phone_blocks: bool = True
    ) -> List[Tuple[str, str]]:
        """
        Generates unique, sorted candidate pairs (p1_id, p2_id) where p1_id < p2_id.
        Blocking keys:
        - `init_sur` from primary name (e.g. 'p_chauhan')
        - `init_sur` from name variant (e.g. 'p_chauhan', 'a_choudhary')
        - `clean_name` from primary name (exact name match)
        - `addr_{address_id}`: co-located individuals
        - `phone_{primary_phone_id}`: shared primary phones
        """
        blocks: Dict[str, Set[str]] = {}

        def add_to_block(key: str, pid: str) -> None:
            if not key:
                return
            if key not in blocks:
                blocks[key] = set()
            blocks[key].add(pid)

        for _, row in persons_df.iterrows():
            pid = str(row["person_id"])
            name = str(row.get("name", ""))
            variant = str(row.get("name_variant", ""))

            # Key 1 & 2: First initial + surname
            init_1, sur_1 = NameNormalizer.extract_initial_and_surname(name)
            if init_1 and sur_1:
                add_to_block(f"init_{init_1}_{sur_1}", pid)

            init_2, sur_2 = NameNormalizer.extract_initial_and_surname(variant)
            if init_2 and sur_2:
                add_to_block(f"init_{init_2}_{sur_2}", pid)

            # Key 3: Clean exact name
            clean_n = NameNormalizer.normalize(name)
            if clean_n:
                add_to_block(f"name_{clean_n}", pid)

            # Key 4: Shared address
            if include_address_blocks:
                addr = str(row.get("address_id", "")).strip()
                if addr and addr.lower() not in {"nan", "none", ""}:
                    add_to_block(f"addr_{addr}", pid)

            # Key 5: Shared primary phone
            if include_phone_blocks:
                phone = str(row.get("primary_phone_id", "")).strip()
                if phone and phone.lower() not in {"nan", "none", ""}:
                    add_to_block(f"phone_{phone}", pid)

        # Assemble unique pairs
        candidate_pairs: Set[Tuple[str, str]] = set()
        for key, pids in blocks.items():
            if len(pids) > 1:
                sorted_pids = sorted(pids)
                for i in range(len(sorted_pids)):
                    for j in range(i + 1, len(sorted_pids)):
                        candidate_pairs.add((sorted_pids[i], sorted_pids[j]))

        logger.info(
            f"Candidate generation completed: {len(candidate_pairs)} candidate pairs "
            f"generated across {len(blocks)} blocks (out of {len(persons_df)*(len(persons_df)-1)//2} possible pairs)."
        )
        return sorted(list(candidate_pairs))


class EntityResolver:
    """
    Multi-attribute explainable entity resolver for PERSON records.
    Calculates similarity scores, identifies matched/conflicting attributes,
    and assigns conservative decisions (HIGH, MEDIUM, LOW).
    """

    def __init__(
        self,
        high_threshold: float = 0.75,
        medium_threshold: float = 0.45,
        weight_name: float = 0.40,
        weight_gender: float = 0.10,
        penalty_gender_conflict: float = 0.35,
        weight_age_exact: float = 0.15,
        weight_age_close: float = 0.12,
        weight_age_approx: float = 0.05,
        penalty_age_divergent: float = 0.05,
        penalty_age_severe: float = 0.25,
        weight_city: float = 0.15,
        penalty_city_conflict: float = 0.15,
        weight_address: float = 0.20,
        weight_phone: float = 0.30
    ):
        self.high_threshold = high_threshold
        self.medium_threshold = medium_threshold
        self.weight_name = weight_name
        self.weight_gender = weight_gender
        self.penalty_gender_conflict = penalty_gender_conflict
        self.weight_age_exact = weight_age_exact
        self.weight_age_close = weight_age_close
        self.weight_age_approx = weight_age_approx
        self.penalty_age_divergent = penalty_age_divergent
        self.penalty_age_severe = penalty_age_severe
        self.weight_city = weight_city
        self.penalty_city_conflict = penalty_city_conflict
        self.weight_address = weight_address
        self.weight_phone = weight_phone

    def evaluate_pair(
        self,
        person_1: Union[pd.Series, Dict[str, Any]],
        person_2: Union[pd.Series, Dict[str, Any]],
        person_id_1: Optional[str] = None,
        person_id_2: Optional[str] = None
    ) -> ResolutionResult:
        """
        Compares two PERSON records across all available attributes.
        Returns a ResolutionResult with score, decision, matches, conflicts, and explanation.
        """
        p1 = dict(person_1)
        p2 = dict(person_2)

        pid1 = str(person_id_1 or p1.get("person_id") or "P1")
        pid2 = str(person_id_2 or p2.get("person_id") or "P2")

        matched_fields: List[str] = []
        conflicting_fields: List[str] = []
        explanation_clauses: List[str] = []

        score: float = 0.0

        # 1. Name & Name Variant Evaluation
        n1 = p1.get("name")
        v1 = p1.get("name_variant")
        n2 = p2.get("name")
        v2 = p2.get("name_variant")

        name_sim, match_type, name_conflict = NameNormalizer.compare_names(n1, v1, n2, v2)
        score += name_sim * self.weight_name

        if name_conflict:
            conflicting_fields.append(f"name ({name_conflict})")
            explanation_clauses.append(f"conflicting {name_conflict}")
        elif match_type in ("EXACT", "INITIAL_SURNAME", "FIRST_NAME_LAST_INITIAL", "FUZZY"):
            matched_fields.append(f"name ({match_type.lower()}: '{n1}' vs '{n2}')")
            explanation_clauses.append(f"matching name ({match_type.lower()})")
        elif match_type == "SURNAME_ONLY":
            matched_fields.append(f"surname (partial: '{str(n1).split()[-1]}')")
            explanation_clauses.append("partial surname match only")
        else:
            conflicting_fields.append("name (dissimilar)")
            explanation_clauses.append("dissimilar names")

        # 2. Gender Evaluation
        g1 = str(p1.get("gender", "")).strip().upper()
        g2 = str(p2.get("gender", "")).strip().upper()
        has_gender_conflict = False

        if g1 and g2 and g1 not in ("NAN", "NONE", "") and g2 not in ("NAN", "NONE", ""):
            if g1 == g2:
                score += self.weight_gender
                matched_fields.append(f"gender ({g1})")
                explanation_clauses.append(f"same gender ({g1})")
            else:
                score -= self.penalty_gender_conflict
                has_gender_conflict = True
                conflicting_fields.append(f"gender ({g1} vs {g2})")
                explanation_clauses.append(f"gender conflict ({g1} vs {g2})")

        # 3. Age Evaluation
        a1_raw = p1.get("age")
        a2_raw = p2.get("age")
        has_severe_age_conflict = False

        if pd.notna(a1_raw) and pd.notna(a2_raw):
            try:
                a1 = float(a1_raw)
                a2 = float(a2_raw)
                diff = abs(a1 - a2)

                if diff == 0:
                    score += self.weight_age_exact
                    matched_fields.append(f"age (exact: {int(a1)})")
                    explanation_clauses.append(f"exact age ({int(a1)})")
                elif diff <= 2:
                    score += self.weight_age_close
                    matched_fields.append(f"age (diff {int(diff)}: {int(a1)} vs {int(a2)})")
                    explanation_clauses.append(f"close age ({int(a1)} vs {int(a2)})")
                elif diff <= 5:
                    score += self.weight_age_approx
                    matched_fields.append(f"age (diff {int(diff)}: {int(a1)} vs {int(a2)})")
                    explanation_clauses.append(f"compatible age ({int(a1)} vs {int(a2)})")
                elif diff <= 10:
                    score -= self.penalty_age_divergent
                    conflicting_fields.append(f"age (diff {int(diff)}: {int(a1)} vs {int(a2)})")
                    explanation_clauses.append(f"divergent age gap of {int(diff)} years")
                else:
                    score -= self.penalty_age_severe
                    has_severe_age_conflict = True
                    conflicting_fields.append(f"age (diff {int(diff)}: {int(a1)} vs {int(a2)})")
                    explanation_clauses.append(f"severe age discrepancy of {int(diff)} years")
            except (ValueError, TypeError):
                pass

        # 4. City Evaluation
        c1 = str(p1.get("city", "")).strip().title()
        c2 = str(p2.get("city", "")).strip().title()

        if c1 and c2 and c1.lower() not in ("nan", "none", "") and c2.lower() not in ("nan", "none", ""):
            if c1.lower() == c2.lower():
                score += self.weight_city
                matched_fields.append(f"city ({c1})")
                explanation_clauses.append(f"co-located in {c1}")
            else:
                score -= self.penalty_city_conflict
                conflicting_fields.append(f"city ({c1} vs {c2})")
                explanation_clauses.append(f"different cities ({c1} vs {c2})")

        # 5. Address Evaluation
        addr1 = str(p1.get("address_id", "")).strip()
        addr2 = str(p2.get("address_id", "")).strip()

        if addr1 and addr2 and addr1.lower() not in ("nan", "none", "") and addr2.lower() not in ("nan", "none", ""):
            if addr1 == addr2:
                score += self.weight_address
                matched_fields.append(f"address_id ({addr1})")
                explanation_clauses.append(f"shared residence ({addr1})")

        # 6. Primary Phone Evaluation
        ph1 = str(p1.get("primary_phone_id", "")).strip()
        ph2 = str(p2.get("primary_phone_id", "")).strip()

        if ph1 and ph2 and ph1.lower() not in ("nan", "none", "") and ph2.lower() not in ("nan", "none", ""):
            if ph1 == ph2:
                score += self.weight_phone
                matched_fields.append(f"primary_phone_id ({ph1})")
                explanation_clauses.append(f"identical primary phone ({ph1})")

        # Bounded normalized score in [0.0, 1.0]
        final_score = max(0.0, min(1.0, round(score, 4)))

        # 7. Conservative Decision Logic
        # Cannot be HIGH if there is a gender conflict, severe age gap (>10 yrs), or distinct first names
        has_name_conflict = bool(name_conflict)

        if (
            final_score >= self.high_threshold
            and not has_gender_conflict
            and not has_severe_age_conflict
            and not has_name_conflict
        ):
            decision = ResolutionDecision.HIGH.value
            verdict_text = "Likely same entity (high confidence)."
        elif (
            final_score >= self.medium_threshold
            and not has_gender_conflict
            and not has_severe_age_conflict
            and not has_name_conflict
        ):
            decision = ResolutionDecision.MEDIUM.value
            verdict_text = "Potential match; requires investigator review (medium confidence)."
        else:
            decision = ResolutionDecision.LOW.value
            verdict_text = "Likely different entities (low confidence / conflicting attributes)."

        # Construct full explainable narrative
        if explanation_clauses:
            reasons = "; ".join(explanation_clauses)
            full_explanation = f"{verdict_text} Key factors: {reasons}."
        else:
            full_explanation = verdict_text

        return ResolutionResult(
            person_id_1=pid1,
            person_id_2=pid2,
            similarity_score=final_score,
            decision=decision,
            matched_fields=matched_fields,
            conflicting_fields=conflicting_fields,
            explanation=full_explanation
        )

    def resolve_candidates(
        self,
        persons_df: pd.DataFrame,
        candidate_pairs: Optional[List[Tuple[str, str]]] = None
    ) -> List[ResolutionResult]:
        """
        Resolves candidate person pairs from persons DataFrame.
        If candidate_pairs is not provided, runs candidate generation automatically.
        """
        if candidate_pairs is None:
            candidate_pairs = CandidateGenerator.generate_candidate_pairs(persons_df)

        person_map = persons_df.set_index("person_id").to_dict("index")
        results: List[ResolutionResult] = []

        logger.info(f"Evaluating {len(candidate_pairs)} candidate pairs...")
        for p1_id, p2_id in candidate_pairs:
            p1 = person_map.get(p1_id)
            p2 = person_map.get(p2_id)
            if not p1 or not p2:
                continue
            res = self.evaluate_pair(p1, p2, person_id_1=p1_id, person_id_2=p2_id)
            results.append(res)

        logger.info(f"Resolved {len(results)} pairs.")
        return results

    @classmethod
    def get_summary(cls, results: List[ResolutionResult]) -> Dict[str, Any]:
        """Calculates breakdown summary of resolution results."""
        total = len(results)
        counts = {
            ResolutionDecision.HIGH.value: 0,
            ResolutionDecision.MEDIUM.value: 0,
            ResolutionDecision.LOW.value: 0
        }
        for r in results:
            if r.decision in counts:
                counts[r.decision] += 1

        avg_score = sum(r.similarity_score for r in results) / total if total > 0 else 0.0

        return {
            "total_candidate_pairs": total,
            "high_confidence_count": counts[ResolutionDecision.HIGH.value],
            "medium_confidence_count": counts[ResolutionDecision.MEDIUM.value],
            "low_confidence_count": counts[ResolutionDecision.LOW.value],
            "average_similarity_score": round(avg_score, 4)
        }
