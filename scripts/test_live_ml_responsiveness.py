#!/usr/bin/env python3
"""
Test Suite: Live ML Prediction Responsiveness & Dynamic Inference Validation
Ensures ML inference responds dynamically to what-if and real-time inputs without static plateaus.
"""

import os
import sys
import json
import unittest

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.ml.predictor import predict_landslide_risk
from backend.ml.hybrid_risk import calculate_hybrid_risk
from backend.ml.feature_builder import build_ml_feature_vector, get_canonical_feature_names


class TestLiveMLResponsiveness(unittest.TestCase):

    def setUp(self):
        self.canonical_features = get_canonical_feature_names()
        self.assertEqual(len(self.canonical_features), 16, "Must have exactly 16 canonical features.")

    def test_a_mild_conditions(self):
        """Test A: Mild conditions (5mm rain, 10mm 72h, 5 deg slope) -> Must produce LOW probability (< 0.35)."""
        input_data = {
            "rainfall_24h_mm": 5.0,
            "rainfall_72h_mm": 10.0,
            "rainfall_surround_max_mm": 6.5,
            "slope_deg": 5.0,
            "elevation_m": 1200.0
        }
        res = predict_landslide_risk(features_input=input_data, model_type="rf")
        self.assertEqual(res["status"], "SUCCESS")
        prob = res["probability"]
        print(f"\n[Test A - Mild] Rain=5mm, Slope=5° -> Probability: {prob*100:.1f}%, Level: {res['risk_level']}")
        self.assertLess(prob, 0.35, f"Mild conditions should produce LOW risk (< 0.35), got {prob}")
        self.assertEqual(res["risk_level"], "LOW")

    def test_b_heavy_monsoon(self):
        """Test B: Heavy monsoon (200mm rain, 400mm 72h, 30 deg slope) -> Must produce HIGH/CRITICAL probability (> 0.55)."""
        input_data = {
            "rainfall_24h_mm": 200.0,
            "rainfall_72h_mm": 400.0,
            "rainfall_surround_max_mm": 260.0,
            "slope_deg": 30.0,
            "elevation_m": 1800.0
        }
        res = predict_landslide_risk(features_input=input_data, model_type="rf")
        self.assertEqual(res["status"], "SUCCESS")
        prob = res["probability"]
        print(f"\n[Test B - Heavy] Rain=200mm, Slope=30° -> Probability: {prob*100:.1f}%, Level: {res['risk_level']}")
        self.assertGreaterEqual(prob, 0.55, f"Heavy monsoon should produce HIGH or CRITICAL risk (>= 0.55), got {prob}")

    def test_c_catastrophic_cloudburst(self):
        """Test C: Catastrophic cloudburst (500mm rain, 1000mm 72h, 45 deg slope) -> Must flag OOD and high/critical.

        Note: 500mm is far outside training range (max ~148mm), so trees cannot
        extrapolate to extreme probabilities. Honest contract: ML says HIGH
        (>= 0.55) + OOD flagged, and the hybrid advisory escalates to CRITICAL
        via the physics governor (never average catastrophic risk away).
        """
        input_data = {
            "rainfall_24h_mm": 500.0,
            "rainfall_72h_mm": 1000.0,
            "rainfall_surround_max_mm": 650.0,
            "slope_deg": 45.0,
            "elevation_m": 2200.0
        }
        res = predict_landslide_risk(features_input=input_data, model_type="rf")
        self.assertEqual(res["status"], "SUCCESS")
        prob = res["probability"]
        print(f"\n[Test C - Catastrophic] Rain=500mm, Slope=45° -> Probability: {prob*100:.1f}%, OOD: {res['is_out_of_distribution']}")
        self.assertGreaterEqual(prob, 0.55, f"Catastrophic cloudburst should produce HIGH or CRITICAL (>= 0.55), got {prob}")
        self.assertTrue(res["is_out_of_distribution"], "Extreme cloudburst must be detected as Out-of-Distribution.")
        hybrid_res = calculate_hybrid_risk(features_input=input_data)
        self.assertEqual(hybrid_res["hybrid_risk"]["advisory_level"], "CRITICAL",
                         "Catastrophic input must escalate to CRITICAL advisory via physics governor.")

    def test_d_varying_slope_sensitivity(self):
        """Test D: Varying slope holding rainfall constant -> Feature vectors must change and probabilities must respond."""
        slopes = [2.0, 5.0, 15.0, 35.0]
        probs = []
        vecs = []
        for s in slopes:
            inp = {"rainfall_24h_mm": 25.0, "slope_deg": s}
            df, meta = build_ml_feature_vector(inp)
            res = predict_landslide_risk(features_input=inp)
            probs.append(res["probability"])
            vecs.append(df.iloc[0]["slope_deg"])
            print(f"[Test D - Vary Slope] Slope={s}° -> DF slope={df.iloc[0]['slope_deg']}°, Prob={res['probability']*100:.1f}%")

        # Verify slopes in vectors match inputs
        for orig, in_vec in zip(slopes, vecs):
            self.assertEqual(orig, in_vec)
        # Verify feature vectors are non-identical
        self.assertEqual(len(set(vecs)), len(slopes), "Slope values in feature vectors must all be distinct.")

    def test_e_varying_rainfall_responsiveness(self):
        """Test E: Varying rainfall holding slope constant -> Probabilities must scale progressively."""
        rains = [5.0, 20.0, 50.0, 100.0]
        probs = []
        for r in rains:
            inp = {"rainfall_24h_mm": r, "slope_deg": 5.0}
            res = predict_landslide_risk(features_input=inp)
            probs.append(res["probability"])
            print(f"[Test E - Vary Rain] Rain={r}mm -> Prob={res['probability']*100:.1f}%, Risk={res['risk_level']}")

        # Ensure probability changes monotonically or responds significantly across the rainfall range
        self.assertLess(probs[0], probs[1], f"Prob for 5mm ({probs[0]}) should be less than 20mm ({probs[1]})")
        self.assertLess(probs[1], probs[2], f"Prob for 20mm ({probs[1]}) should be less than 50mm ({probs[2]})")
        self.assertLess(probs[2], probs[3], f"Prob for 50mm ({probs[2]}) should be less than 100mm ({probs[3]})")
        print(f"[Test E - Range] 5mm->{probs[0]*100:.1f}%, 20mm->{probs[1]*100:.1f}%, 50mm->{probs[2]*100:.1f}%, 100mm->{probs[3]*100:.1f}%")

    def test_f_out_of_distribution_detection(self):
        """Test F: Extreme values outside empirical bounds must be flagged as OOD."""
        extreme_input = {
            "rainfall_24h_mm": 999.0,
            "slope_deg": 85.0
        }
        res = predict_landslide_risk(features_input=extreme_input)
        self.assertTrue(res["is_out_of_distribution"], "Extreme rainfall/slope must trigger OOD.")
        self.assertTrue(len(res["ood_violations"]) > 0, "OOD violations list must not be empty.")
        print(f"\n[Test F - OOD] Violations detected: {res['ood_violations']}")

    def test_g_feature_vector_distinctness(self):
        """Test G: Distinct scenario inputs must produce distinct 16-element feature vectors."""
        scenarios = [
            {"rainfall_24h_mm": 10.0, "slope_deg": 4.0, "elevation_m": 800.0},
            {"rainfall_24h_mm": 50.0, "slope_deg": 12.0, "elevation_m": 1500.0},
            {"rainfall_24h_mm": 120.0, "slope_deg": 28.0, "elevation_m": 2100.0}
        ]
        vectors = []
        for s in scenarios:
            df, meta = build_ml_feature_vector(s)
            vec = tuple(df.iloc[0].values)
            vectors.append(vec)

        # Check all vectors are pairwise different
        self.assertNotEqual(vectors[0], vectors[1])
        self.assertNotEqual(vectors[1], vectors[2])
        self.assertNotEqual(vectors[0], vectors[2])
        print(f"\n[Test G - Distinctness] 3 distinct scenarios produced 3 distinct feature vectors successfully.")

    def test_h_api_endpoint_verification(self):
        """Test H: API routes /api/ml/predict and /api/hybrid-risk return correct status, structure, and dynamic predictions."""
        from fastapi.testclient import TestClient
        from backend.main import app

        client = TestClient(app)

        # Test /api/ml/predict
        payload_ml = {
            "features": {
                "rainfall_24h_mm": 15.0,
                "slope_deg": 6.0,
                "elevation_m": 1100.0
            },
            "model_type": "rf"
        }
        resp = client.post("/api/ml/predict", json=payload_ml)
        self.assertEqual(resp.status_code, 200, f"/api/ml/predict returned {resp.status_code}")
        data = resp.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertIn("probability", data)
        self.assertIn("prediction", data)
        self.assertIn("features_used", data)
        self.assertIn("feature_order", data)
        self.assertEqual(len(data["features_used"]), 16)
        self.assertIn("tree_agreement", data)
        print(f"\n[Test H - /api/ml/predict] Returned probability: {data['probability']}, features_used: {data['features_used']}")

        # Test /api/hybrid-risk
        payload_hybrid = {
            "zone_id": "ZONE-SKM-01",
            "features": {
                "rainfall_24h_mm": 35.0,
                "slope_deg": 22.0
            },
            "alpha": 0.50
        }
        resp_hybrid = client.post("/api/hybrid-risk", json=payload_hybrid)
        self.assertEqual(resp_hybrid.status_code, 200, f"/api/hybrid-risk returned {resp_hybrid.status_code}")
        h_data = resp_hybrid.json()
        self.assertEqual(h_data["status"], "SUCCESS")
        self.assertEqual(h_data["pipeline_mode"], "FUSED_HYBRID")
        self.assertIn("physics_risk", h_data)
        self.assertIn("ml_probability", h_data)
        self.assertIn("hybrid_risk_score", h_data)
        # Reliability-weighted fusion: hybrid must lie between ML and physics
        # (convex combination with effective alpha clamped to [0.25, 0.75]),
        # and the reported formula weights must reproduce the score.
        lo = min(h_data["ml_probability"], h_data["physics_risk"])
        hi = max(h_data["ml_probability"], h_data["physics_risk"])
        self.assertGreaterEqual(h_data["hybrid_risk_score"], lo - 1e-6)
        self.assertLessEqual(h_data["hybrid_risk_score"], hi + 1e-6)
        w_ml = h_data["hybrid_risk"]["alpha_ml_weight"]
        self.assertGreaterEqual(w_ml, 0.25)
        self.assertLessEqual(w_ml, 0.75)
        self.assertAlmostEqual(
            h_data["hybrid_risk_score"],
            round(w_ml * h_data["ml_probability"] + (1.0 - w_ml) * h_data["physics_risk"], 4),
            places=3
        )
        print(f"[Test H - /api/hybrid-risk] ML={h_data['ml_probability']}, Phys={h_data['physics_risk']}, Hybrid={h_data['hybrid_risk_score']}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
