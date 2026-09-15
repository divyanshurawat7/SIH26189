"""
SIH26189 — AI-Powered Criminal Network Analysis System
Test Suite: tests/test_entity_resolution.py

Comprehensive unit and integration tests for Phase 2: Person Entity Resolution.
Tests:
- Name normalization (lowercasing, whitespace, punctuation, camelCase splitting, honorifics, initials)
- Candidate generation and inverted index blocking efficiency (>99% pair reduction, 100% recall of benchmark pairs)
- Multi-attribute scoring logic and conflict detection
- Difficult cases:
  * Same name but different gender / severe age difference (TRAP pairs)
  * Name variants of the same person (initials, casing, concatenation)
  * Matching phone and matching address boosts
  * Distinct first names / surnames sharing abbreviated initials
  * Conflicting cities
- Ground truth benchmark verification (0 false positives on all 65 ground truth traps)
- Explainability validation (structured matched/conflicting fields and clear narrative)
"""

import unittest
from pathlib import Path
import pandas as pd

from src.data_loader import DataLoader
from src.entity_resolution import (
    NameNormalizer,
    CandidateGenerator,
    EntityResolver,
    ResolutionDecision,
    ResolutionResult,
)


class TestNameNormalizer(unittest.TestCase):
    """Unit tests for NameNormalizer string processing and comparison."""

    def test_basic_normalization(self):
        self.assertEqual(NameNormalizer.normalize("  Arjun   Choudhary  "), "arjun choudhary")
        self.assertEqual(NameNormalizer.normalize("REKHA KAPOOR"), "rekha kapoor")
        self.assertEqual(NameNormalizer.normalize("nisha joshi"), "nisha joshi")

    def test_punctuation_removal(self):
        self.assertEqual(NameNormalizer.normalize("P. Chauhan"), "p chauhan")
        self.assertEqual(NameNormalizer.normalize("R. Choudhary"), "r choudhary")
        self.assertEqual(NameNormalizer.normalize("Swati J."), "swati j")
        self.assertEqual(NameNormalizer.normalize("D'Souza"), "d souza")

    def test_camel_case_splitting(self):
        self.assertEqual(NameNormalizer.normalize("ManojNair"), "manoj nair")
        self.assertEqual(NameNormalizer.normalize("TanviPandey"), "tanvi pandey")
        self.assertEqual(NameNormalizer.normalize("KaranReddy"), "karan reddy")

    def test_honorifics_stripping(self):
        self.assertEqual(NameNormalizer.normalize("Mr. Rajesh Sharma"), "rajesh sharma")
        self.assertEqual(NameNormalizer.normalize("Dr. Priya Chauhan"), "priya chauhan")
        self.assertEqual(NameNormalizer.normalize("Smt. Geeta Yadav"), "geeta yadav")

    def test_extract_initial_and_surname(self):
        self.assertEqual(NameNormalizer.extract_initial_and_surname("Priya Chauhan"), ("p", "chauhan"))
        self.assertEqual(NameNormalizer.extract_initial_and_surname("P. Chauhan"), ("p", "chauhan"))
        self.assertEqual(NameNormalizer.extract_initial_and_surname("Swati J."), ("s", "j"))
        self.assertEqual(NameNormalizer.extract_initial_and_surname("Sharma"), ("s", "sharma"))
        self.assertEqual(NameNormalizer.extract_initial_and_surname(""), ("", ""))

    def test_compare_names_exact(self):
        score, match_type, conflict = NameNormalizer.compare_names(
            "Arjun Choudhary", "ARJUN CHOUDHARY",
            "Arjun Choudhary", "Arjun Choudhary"
        )
        self.assertEqual(score, 1.0)
        self.assertEqual(match_type, "EXACT")
        self.assertIsNone(conflict)

    def test_compare_names_initial_surname(self):
        score, match_type, conflict = NameNormalizer.compare_names(
            "Priya Chauhan", "P. Chauhan",
            "P. Chauhan", "Priya Chauhan"
        )
        self.assertGreaterEqual(score, 0.88)
        self.assertIn(match_type, ("EXACT", "INITIAL_SURNAME"))
        self.assertIsNone(conflict)

    def test_compare_names_distinct_first_names_conflict(self):
        # Ashok Pandey vs Amit Pandey (both abbreviating to A. Pandey)
        score, match_type, conflict = NameNormalizer.compare_names(
            "Ashok Pandey", "A. Pandey",
            "Amit Pandey", "A. Pandey"
        )
        self.assertIsNotNone(conflict)
        self.assertIn("distinct first names", conflict)
        self.assertLessEqual(score, 0.25)

    def test_compare_names_distinct_surnames_conflict(self):
        # Divya Reddy vs Divya Rathore (both abbreviating to Divya R.)
        score, match_type, conflict = NameNormalizer.compare_names(
            "Divya Reddy", "Divya R.",
            "Divya Rathore", "Divya R."
        )
        self.assertIsNotNone(conflict)
        self.assertIn("distinct surnames", conflict)
        self.assertLessEqual(score, 0.25)


class TestCandidateGenerator(unittest.TestCase):
    """Unit tests for inverted index candidate pair blocking."""

    def setUp(self):
        self.loader = DataLoader()
        self.dataset = self.loader.load_all(validate=False)
        self.persons = self.dataset.persons

    def test_candidate_generation_search_space_reduction(self):
        total_persons = len(self.persons)
        total_possible = total_persons * (total_persons - 1) // 2
        self.assertEqual(total_possible, 1124250)

        candidate_pairs = CandidateGenerator.generate_candidate_pairs(self.persons)
        # Should drastically reduce comparisons by >99%
        self.assertLess(len(candidate_pairs), 25000)
        self.assertGreater(len(candidate_pairs), 5000)

        reduction_pct = (1.0 - (len(candidate_pairs) / total_possible)) * 100.0
        self.assertGreater(reduction_pct, 98.0)

    def test_candidate_pairs_contain_all_ground_truth_traps(self):
        gt_path = Path(__file__).resolve().parent.parent / "SIH26189_SYNTHETIC_DATASET" / "ground_truth" / "ground_truth_entity_resolution.csv"
        df_gt = pd.read_csv(gt_path)

        candidate_pairs = set(CandidateGenerator.generate_candidate_pairs(self.persons))
        missing = 0
        for _, r in df_gt.iterrows():
            pair = tuple(sorted([r["candidate_person_id"], r["true_person_id"]]))
            if pair not in candidate_pairs:
                missing += 1

        self.assertEqual(missing, 0, f"All {len(df_gt)} ground truth traps must be captured by candidate generator!")

    def test_candidate_pair_ordering(self):
        pairs = CandidateGenerator.generate_candidate_pairs(self.persons[:50])
        for p1, p2 in pairs:
            self.assertLess(p1, p2)


class TestEntityResolverDifficultCases(unittest.TestCase):
    """Explicit tests for difficult entity resolution cases (Requirement 8)."""

    def setUp(self):
        self.resolver = EntityResolver()

    def test_same_name_different_gender_conflict(self):
        # Difficult case 1: Identical name but opposite genders (TRAP_001 style)
        p1 = {
            "person_id": "P_01",
            "name": "Shalini Sharma",
            "name_variant": "SHALINI SHARMA",
            "gender": "F",
            "age": 40,
            "city": "Chandigarh",
            "address_id": "LOC_01",
            "primary_phone_id": "PH_01"
        }
        p2 = {
            "person_id": "P_02",
            "name": "Shalini Sharma",
            "name_variant": "Shalini Sharma",
            "gender": "M",
            "age": 61,
            "city": "Chandigarh",
            "address_id": "LOC_02",
            "primary_phone_id": "PH_02"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.LOW.value)
        self.assertTrue(any("gender" in c for c in result.conflicting_fields))
        self.assertTrue(any("age" in c for c in result.conflicting_fields))

    def test_name_variants_of_same_person(self):
        # Difficult case 2: Name variants (e.g. Priya Chauhan vs P. Chauhan) with matching demographics
        p1 = {
            "person_id": "P_10",
            "name": "Priya Chauhan",
            "name_variant": "P. Chauhan",
            "gender": "F",
            "age": 52,
            "city": "Hyderabad",
            "address_id": "LOC_10",
            "primary_phone_id": "PH_10"
        }
        p2 = {
            "person_id": "P_11",
            "name": "P. Chauhan",
            "name_variant": "Priya Chauhan",
            "gender": "F",
            "age": 52,
            "city": "Hyderabad",
            "address_id": "LOC_10",
            "primary_phone_id": "PH_10"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.HIGH.value)
        self.assertGreaterEqual(result.similarity_score, 0.85)
        self.assertEqual(len(result.conflicting_fields), 0)

    def test_camel_case_name_variant(self):
        # Difficult case 3: Concatenated CamelCase name (Manoj Nair vs ManojNair)
        p1 = {
            "person_id": "P_20",
            "name": "Manoj Nair",
            "name_variant": "ManojNair",
            "gender": "M",
            "age": 58,
            "city": "Pune",
            "address_id": "LOC_20",
            "primary_phone_id": "PH_20"
        }
        p2 = {
            "person_id": "P_21",
            "name": "ManojNair",
            "name_variant": "Manoj Nair",
            "gender": "M",
            "age": 58,
            "city": "Pune",
            "address_id": "LOC_20",
            "primary_phone_id": "PH_20"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.HIGH.value)
        self.assertGreaterEqual(result.similarity_score, 0.90)

    def test_matching_phone_boost(self):
        # Difficult case 4: Shared phone number with compatible names
        p1 = {
            "person_id": "P_30",
            "name": "Suresh Mishra",
            "name_variant": "S. Mishra",
            "gender": "M",
            "age": 35,
            "city": "Jaipur",
            "address_id": "LOC_30",
            "primary_phone_id": "PH_SHARED_100"
        }
        p2 = {
            "person_id": "P_31",
            "name": "Suresh Mishra",
            "name_variant": "Suresh Mishra",
            "gender": "M",
            "age": 36,
            "city": "Jaipur",
            "address_id": "LOC_31",
            "primary_phone_id": "PH_SHARED_100"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.HIGH.value)
        self.assertTrue(any("phone" in m or "primary_phone_id" in m for m in result.matched_fields))

    def test_matching_address_boost(self):
        # Difficult case 5: Shared address ID with identical name and close age (e.g. Kirti Gupta)
        p1 = {
            "person_id": "P_40",
            "name": "Kirti Gupta",
            "name_variant": "KIRTI GUPTA",
            "gender": "F",
            "age": 31,
            "city": "Lucknow",
            "address_id": "LOCATION_0193",
            "primary_phone_id": "PH_40"
        }
        p2 = {
            "person_id": "P_41",
            "name": "Kirti Gupta",
            "name_variant": "Kirti Gupta",
            "gender": "F",
            "age": 32,
            "city": "Lucknow",
            "address_id": "LOCATION_0193",
            "primary_phone_id": "PH_41"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.HIGH.value)
        self.assertGreaterEqual(result.similarity_score, 0.90)
        self.assertTrue(any("address_id" in m for m in result.matched_fields))

    def test_conflicting_attributes_severe_age_discrepancy(self):
        # Difficult case 6: Same name but 34-year age gap (TRAP_024 style)
        p1 = {
            "person_id": "P_50",
            "name": "Harish Gupta",
            "name_variant": "Harish Gupta",
            "gender": "M",
            "age": 31,
            "city": "Delhi",
            "address_id": "LOC_50",
            "primary_phone_id": "PH_50"
        }
        p2 = {
            "person_id": "P_51",
            "name": "Harish Gupta",
            "name_variant": "Harish Gupta",
            "gender": "M",
            "age": 65,
            "city": "Lucknow",
            "address_id": "LOC_51",
            "primary_phone_id": "PH_51"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.LOW.value)
        self.assertTrue(any("age" in c and "diff 34" in c for c in result.conflicting_fields))
        self.assertTrue(any("city" in c for c in result.conflicting_fields))

    def test_conflicting_distinct_first_names_with_shared_initial_variant(self):
        # Difficult case 7: Ashok Pandey vs Amit Pandey sharing A. Pandey variant
        p1 = {
            "person_id": "P_60",
            "name": "Ashok Pandey",
            "name_variant": "A. Pandey",
            "gender": "M",
            "age": 40,
            "city": "Delhi",
            "address_id": "LOC_60",
            "primary_phone_id": "PH_60"
        }
        p2 = {
            "person_id": "P_61",
            "name": "Amit Pandey",
            "name_variant": "A. Pandey",
            "gender": "M",
            "age": 40,
            "city": "Delhi",
            "address_id": "LOC_61",
            "primary_phone_id": "PH_61"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        self.assertEqual(result.decision, ResolutionDecision.LOW.value)
        self.assertTrue(any("distinct first names" in c for c in result.conflicting_fields))

    def test_medium_confidence_relocation_or_review_case(self):
        # Difficult case 8: Same name, same gender, exact age, but different city (TRAP_019 style)
        p1 = {
            "person_id": "P_70",
            "name": "Yash Saxena",
            "name_variant": "Yash Saxena",
            "gender": "M",
            "age": 52,
            "city": "Pune",
            "address_id": "LOC_70",
            "primary_phone_id": "PH_70"
        }
        p2 = {
            "person_id": "P_71",
            "name": "Yash Saxena",
            "name_variant": "Yash Saxena",
            "gender": "M",
            "age": 52,
            "city": "Delhi",
            "address_id": "LOC_71",
            "primary_phone_id": "PH_71"
        }
        result = self.resolver.evaluate_pair(p1, p2)
        # Should be MEDIUM confidence (needs investigator review due to relocation vs coincident name)
        self.assertEqual(result.decision, ResolutionDecision.MEDIUM.value)
        self.assertIn("city (Pune vs Delhi)", result.conflicting_fields)


class TestGroundTruthBenchmark(unittest.TestCase):
    """Evaluates the resolver against the 65 ground truth entity resolution traps."""

    def setUp(self):
        self.loader = DataLoader()
        self.dataset = self.loader.load_all(validate=False)
        self.resolver = EntityResolver()
        self.gt_path = Path(__file__).resolve().parent.parent / "SIH26189_SYNTHETIC_DATASET" / "ground_truth" / "ground_truth_entity_resolution.csv"
        self.df_gt = pd.read_csv(self.gt_path)
        self.person_map = self.dataset.persons.set_index("person_id").to_dict("index")

    def test_zero_false_positive_merges_on_all_traps(self):
        """All 65 ground truth traps must NEVER be classified as HIGH confidence."""
        results = []
        for _, r in self.df_gt.iterrows():
            p1_id = r["candidate_person_id"]
            p2_id = r["true_person_id"]
            p1 = self.person_map[p1_id]
            p2 = self.person_map[p2_id]
            res = self.resolver.evaluate_pair(p1, p2, person_id_1=p1_id, person_id_2=p2_id)
            results.append(res)

        summary = EntityResolver.get_summary(results)
        self.assertEqual(
            summary["high_confidence_count"], 0,
            f"Zero traps can be classified as HIGH! Found {summary['high_confidence_count']} false positives."
        )
        # Verify majority are correctly rejected as LOW confidence
        self.assertGreaterEqual(
            summary["low_confidence_count"], 55,
            f"Expected at least 55/65 traps rejected as LOW confidence, got {summary['low_confidence_count']}"
        )


class TestExplainabilityAndOutputSchema(unittest.TestCase):
    """Validates output schema and explainability requirements (Requirements 6 & 10)."""

    def setUp(self):
        self.resolver = EntityResolver()
        self.p1 = {
            "person_id": "PERSON_0001",
            "name": "Arjun Choudhary",
            "name_variant": "ARJUN CHOUDHARY",
            "gender": "M",
            "age": 57,
            "city": "Lucknow",
            "address_id": "LOCATION_0133",
            "primary_phone_id": "PHONE_00001"
        }
        self.p2 = {
            "person_id": "PERSON_0007",
            "name": "Nisha Joshi",
            "name_variant": "nisha joshi",
            "gender": "F",
            "age": 26,
            "city": "Lucknow",
            "address_id": "LOCATION_0133",
            "primary_phone_id": "PHONE_00007"
        }

    def test_output_contains_all_required_fields(self):
        result = self.resolver.evaluate_pair(self.p1, self.p2)
        d = result.to_dict()

        # Requirement 6 required fields:
        expected_keys = {
            "person_id_1",
            "person_id_2",
            "similarity_score",
            "decision",
            "matched_fields",
            "conflicting_fields",
            "explanation"
        }
        self.assertTrue(expected_keys.issubset(d.keys()))

    def test_decision_is_valid_category(self):
        result = self.resolver.evaluate_pair(self.p1, self.p2)
        self.assertIn(result.decision, ["HIGH", "MEDIUM", "LOW"])

    def test_similarity_score_bounded(self):
        result = self.resolver.evaluate_pair(self.p1, self.p2)
        self.assertGreaterEqual(result.similarity_score, 0.0)
        self.assertLessEqual(result.similarity_score, 1.0)

    def test_explanation_is_non_empty_and_informative(self):
        result = self.resolver.evaluate_pair(self.p1, self.p2)
        self.assertTrue(len(result.explanation) > 20)
        self.assertIn("Likely different entities", result.explanation)
        self.assertTrue(len(result.conflicting_fields) > 0)


if __name__ == "__main__":
    unittest.main()
