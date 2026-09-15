# Baseline State Documentation Before ML Pipeline Expansion
## NER-LandslideGuard: Forensic Audit of the 40-Sample Prototype

> [!WARNING]
> **ARCHIVED PROTOTYPE REPORT (Historical Baseline Audit: N=40)**  
> This document is preserved as a historical engineering audit of the initial 40-sample baseline prototype. For current 620-sample master catalog architecture and evaluation, see [EXPANDED_DATASET_REPORT.md](EXPANDED_DATASET_REPORT.md).

**Audit Timestamp**: September 2026  
**Document**: `docs/BEFORE_ML_EXPANSION.md`  
**Standard**: Comprehensive Codebase Inspection Prior to Dataset Expansion & Retraining  

---

## 1. Executive Summary

This document records the exact state of the machine learning and geotechnical pipelines in `NER-LandslideGuard` prior to dataset expansion and retraining. All 14 inspection criteria mandated in Phase 1 have been audited directly against the running code and data artifacts.

---

## 2. Detailed Audit of the 14 Subsystems

### 1. Current ML Training Code
- **Primary Script**: [`scripts/train_models.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/train_models.py)
- **Pipeline Orchestrator**: [`scripts/train_ml.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/train_ml.py)
- **Evaluation Script**: [`scripts/evaluate_models.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/evaluate_models.py)
- **Execution Mechanism**: Reads `data/features/training_dataset.csv` and `data/features/validation_dataset.csv`. Fits Scikit-Learn `RandomForestClassifier` and `xgboost.XGBClassifier`. Saves trained artifacts to `data/models/random_forest.pkl`, `data/models/xgboost_model.json`, and `data/models/model_metadata.json`.

### 2. Current Dataset-Generation Code
- **Feature Builder Script**: [`scripts/prepare_dataset.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/prepare_dataset.py) and [`scripts/build_feature_dataset.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/build_feature_dataset.py)
- **Methodology**: Ingests raw ISRO records from `data/raw/isro/isro_landslide_atlas_sikkim.csv`, generates matching non-landslide background points, performs nearest-neighbor spatial joins on SRTM 30m arrays (`srtm_sikkim_30m.npz`), looks up SoilGrids pedological table by district, encodes ESA WorldCover classes, and samples NASA IMERG NetCDF4 daily files.

### 3. Current Feature Extraction
- **Inference Feature Engine**: [`backend/ml/feature_builder.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/feature_builder.py)
- **Functions**: `build_features_from_dict(raw_data)` and `build_features_for_zone(zone_id, overrides)`.
- **Contract**: Produces a standardized 18-feature row matching the model input schema, filling missing sensor values with regional geographic defaults for the Eastern Himalayas.

### 4. Current 40-Sample Dataset
- **Master Feature Table**: [`data/features/landslide_features.csv`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/data/features/landslide_features.csv) (40 rows, 29 columns)
- **Partitions**:
  - `data/features/training_dataset.csv`: 28 rows
  - `data/features/validation_dataset.csv`: 6 rows
  - `data/features/test_dataset.csv`: 6 rows
- **Class Balance**: 20 positive events (ISRO Landslide Atlas) and 20 negative background references (1:1 balanced ratio).

### 5. Current 18 Features
The active model consumes exactly 18 features:
1. `elevation_m` (USGS/NASA SRTM 30m DEM)
2. `slope_deg` (Topographic slope gradient)
3. `aspect_deg` (Downslope compass azimuth)
4. `rainfall_24h_mm` (NASA GPM IMERG 24h precipitation)
5. `rainfall_72h_mm` (NASA GPM IMERG 72h accumulated precipitation)
6. `rainfall_surround_max_mm` (Surrounding 3x3 pixel peak rainfall)
7. `soil_clay_pct` (ISRIC SoilGrids clay percentage)
8. `soil_sand_pct` (ISRIC SoilGrids sand percentage)
9. `soil_silt_pct` (ISRIC SoilGrids silt percentage)
10. `soil_bulk_density` (ISRIC SoilGrids bulk density in g/cm³)
11. `soil_ph` (ISRIC SoilGrids soil acidity)
12. `soil_organic_carbon` (ISRIC SoilGrids SOC in g/kg)
13. `lc_tree_cover` (ESA WorldCover Tree Cover indicator: 0 or 1)
14. `lc_shrubland` (ESA WorldCover Shrubland indicator: 0 or 1)
15. `lc_grassland` (ESA WorldCover Grassland indicator: 0 or 1)
16. `lc_cropland` (ESA WorldCover Cropland indicator: 0 or 1)
17. `lc_builtup` (ESA WorldCover Built-up indicator: 0 or 1)
18. `lc_sparse_vegetation` (ESA WorldCover Bare/Sparse indicator: 0 or 1)

### 6. Current Label-Generation Method
- **Binary Classification**:
  - `label = 1`: Verified historical landslide event documented in the ISRO Landslide Atlas of India (NRSC 2023 release).
  - `label = 0`: Verified geomorphically stable non-landslide background reference location.
- **Zero Fabrication**: No synthetic coordinates or artificial failure labels were invented.

### 7. Current Negative / Background Sampling
- **Script**: [`scripts/generate_background_samples.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/generate_background_samples.py)
- **Exclusion Constraints**:
  - Slope angle $\le 15^\circ$ (actual sampled maximum: $7.24^\circ$).
  - Minimum Euclidean distance to any known landslide scar $\ge 1.7	ext{ km}$ (actual closest distance: $3.21	ext{ km}$).
  - Restricted to inhabited valley terraces and alluvial floodplains ($< 2,800	ext{ m}$ MSL).
  - Fixed reproducible seed: `42`.

### 8. Current Train / Validation / Test Split
- **Split Scheme**: Grouped Spatial Blocking along latitudinal bands:
  - **Train**: 28 samples (South Sikkim & Lower Valley corridor, $	ext{Lat} \le 27.32^\circ	ext{N}$)
  - **Validation**: 6 samples (Central Corridor buffer, $27.32^\circ	ext{N} < 	ext{Lat} < 27.37^\circ	ext{N}$)
  - **Test**: 6 samples (North Sikkim ridge, $	ext{Lat} \ge 27.37^\circ	ext{N}$)
- **Leakage Check**: Minimum spatial separation between Train and Test is **$12.26	ext{ km}$** (exceeds the $> 3.0	ext{ km}$ requirement).

### 9. Current Random Forest Implementation
- **Architecture**: `sklearn.ensemble.RandomForestClassifier`
- **Hyperparameters**:
  - `n_estimators`: 100
  - `max_depth`: 6
  - `min_samples_split`: 3
  - `min_samples_leaf`: 2
  - `class_weight`: "balanced"
  - `random_state`: 42
- **Preliminary Test Metrics ($N=6$)**:
  - Accuracy: `66.7%`
  - Precision: `1.000`
  - Recall: `0.333`
  - F1-Score: `0.500`
  - ROC-AUC: `1.000`
  - PR-AUC: `1.000`

### 10. Current XGBoost Implementation
- **Architecture**: `xgboost.XGBClassifier`
- **Hyperparameters**:
  - `n_estimators`: 80
  - `max_depth`: 4
  - `learning_rate`: 0.08
  - `eval_metric`: "logloss"
  - `scale_pos_weight`: 1.0
  - `random_state`: 42
- **Preliminary Test Metrics ($N=6$)**:
  - Accuracy: `50.0%`
  - Precision: `0.000`
  - Recall: `0.000`
  - F1-Score: `0.000`
  - ROC-AUC: `0.333`

### 11. Current Physics Model
- **Module**: [`backend/ml/hybrid_risk.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/hybrid_risk.py) (`compute_physics_baseline`) & [`backend/core_gis/physics_engine.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/core_gis/physics_engine.py)
- **Methodology**: Deterministic Infinite Slope Limit Equilibrium complying with **BIS IS 14458** / Mohr-Coulomb failure criteria:
  $$	ext{FoS} = rac{c' + (\gamma z \cos^2 eta - u) 	an \phi'}{\gamma z \sin eta \cos eta}$$
  where $u = \gamma_w h_w \cos^2 eta$ is pore-water pressure.
- **Scoring**: Maps FoS and antecedent rainfall into a continuous susceptibility score $[0.0, 1.0]$:
  $$	ext{Score}_{	ext{physics}} = 0.65 \cdot 	ext{Score}_{	ext{FoS}} + 0.35 \cdot 	ext{Score}_{	ext{rain}}$$

### 12. Current Hybrid Model
- **Formula**:
  $$R_{	ext{hybrid}} = lpha \cdot P_{	ext{ML}} + (1 - lpha) \cdot R_{	ext{Physics}}$$
- **Configuration**: Stored in `backend/ml/hybrid_config.json` with default $lpha = 0.50$ (dynamically overrideable per request).
- **Consensus Logic**: Flags whether models are `CONCURRING`, `PHYSICS_ELEVATED`, or `ML_ELEVATED`.

### 13. Current ML APIs
- `GET /api/ml/status` — Returns model status (`TRAINED`), sample counts, and feature list.
- `POST /api/ml/train` — Triggers training subprocess.
- `POST /api/ml/predict` — Runs inference on feature dictionary or zone ID.
- `GET /api/ml/metrics` — Returns test metrics and sample-by-sample pipeline comparison.
- `GET /api/ml/feature-importance` — Returns Gini feature importances.
- `GET /api/hybrid-risk` & `POST /api/hybrid-risk` — Executes dual-pipeline and hybrid fusion.

### 14. Current Dashboard Integration
- **Frontend Components**:
  - [`frontend/src/components/GisMapDashboard.jsx`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/frontend/src/components/GisMapDashboard.jsx) — Displays 3-card comparison: Physics Baseline, Real ML Pipeline, and Hybrid AI+Phys.
  - [`frontend/src/components/DigitalTwinSimulator.jsx`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/frontend/src/components/DigitalTwinSimulator.jsx) — What-if scenario simulator evaluating risk under user-defined rainfall, slope, and soil saturation.
  - [`frontend/src/components/ShapExplainabilityModal.jsx`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/frontend/src/components/ShapExplainabilityModal.jsx) — Feature contribution breakdown.
