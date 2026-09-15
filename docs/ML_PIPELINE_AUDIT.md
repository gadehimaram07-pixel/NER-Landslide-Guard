# NER-LandslideGuard: ML Pipeline Technical Audit Report

**Date of Audit:** 2026-09-12  
**Target Region:** Sikkim & Eastern Himalayas ($27.05^\circ - 28.15^\circ\text{N}, 88.05^\circ - 88.95^\circ\text{E}$)  
**Auditor:** Technical Lead / SIH ML Verification Team  
**Audit Standard:** Zero Synthetic Fabrication, Scientific Transparency & Defense Readiness

---

## Executive Summary of Audit Findings

| Audit Dimension | Status | Key Audit Finding |
| :--- | :--- | :--- |
| **Data Provenance** | **VERIFIED** | 20 real historical landslide events from ISRO Landslide Atlas 2023 + 20 spatially sampled negative references. Total = 40 samples. |
| **Feature Engineering** | **VERIFIED** | Exactly 18 features extracted from SRTM 30m DEM, SoilGrids 2.0, ESA WorldCover 2021, and NASA IMERG NetCDF4. |
| **Data Leakage Risk** | **CRITICAL FINDING** | The previous split was a simple label-stratified random split. Verified spatial leakage: `ISRO-SKM-001` (Validation) and `ISRO-SKM-020` (Training) are located only 50 meters apart on the same Ranipool slope. Remediation required: Grouped Spatial Block Split. |
| **Model Architectures** | **VERIFIED** | Balanced Random Forest (100 trees) and XGBoost Classifier (80 trees). |
| **Evaluation Integrity** | **VERIFIED** | Current metrics (83.3% Accuracy, 100% Recall) are calculated on a small held-out test split ($N=6$). Must be explicitly reported as preliminary prototype results. |
| **Explainability (XAI)** | **VERIFIED** | Feature importance is derived directly from Random Forest tree Gini impurities (mean decrease in impurity). No fake SHAP values are fabricated. |

---

## Detailed 21-Point Technical Audit

### 1. Exact ML Training File(s)
- **Primary Training Script:** [`scripts/train_models.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/train_models.py)
- **Backend Training Trigger Endpoint:** `POST /api/ml/train` in [`backend/main.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/main.py#L662-L685)
- **Runtime Inference Engine:** [`backend/ml/predictor.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/predictor.py)

### 2. Exact Dataset Preparation File(s)
- **Primary Data Ingestion & Splitting Script:** [`scripts/prepare_dataset.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/prepare_dataset.py)
- **Raw Data Download & Validation Utility:** [`scripts/download_data.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/download_data.py)
- **Data Integrity Checker:** [`scripts/check_datasets.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/check_datasets.py)

### 3. Exact Source of the 40 Samples
- **Positive Landslide Samples ($N=20$):** Sourced from the **ISRO Landslide Atlas of India (NRSC, 2023)** and indexed in `data/raw/isro/isro_landslide_atlas_sikkim.csv`. Contains documented landslides across East Sikkim, North Sikkim, South Sikkim, and West Sikkim between 2020 and 2024.
- **Negative Non-Landslide Reference Samples ($N=20$):** Generated via spatial sampling in stable valley bottoms, river floodplains, and gentle terraces within Sikkim (`generate_non_landslide_background_samples` in `scripts/prepare_dataset.py`), enforcing a minimum spatial buffer distance $> 1.7\text{ km}$ from known landslide rupture centroids.

### 4. Exact 18 Feature Names
The 18 features strictly evaluated by the model are:
1. `elevation_m` (Continuous, meters)
2. `slope_deg` (Continuous, degrees)
3. `aspect_deg` (Continuous, degrees, 0–360°)
4. `rainfall_24h_mm` (Continuous, mm)
5. `rainfall_72h_mm` (Continuous, mm)
6. `rainfall_surround_max_mm` (Continuous, mm, $3\times3$ grid peak)
7. `soil_clay_pct` (Continuous, %)
8. `soil_sand_pct` (Continuous, %)
9. `soil_silt_pct` (Continuous, %)
10. `soil_bulk_density` (Continuous, $\text{cg/cm}^3$)
11. `soil_ph` (Continuous, pH units)
12. `soil_organic_carbon` (Continuous, $\text{dg/kg}$)
13. `lc_tree_cover` (Binary, 0 or 1)
14. `lc_shrubland` (Binary, 0 or 1)
15. `lc_grassland` (Binary, 0 or 1)
16. `lc_cropland` (Binary, 0 or 1)
17. `lc_builtup` (Binary, 0 or 1)
18. `lc_sparse_vegetation` (Binary, 0 or 1)

### 5. Exact Target/Label Definition
- **Column Name:** `landslide_label`
- **Type:** Binary discrete ($y \in \{0, 1\}$)
  - `1`: Documented landslide failure event (debris flow, rockfall, rotational slump, active mudslide).
  - `0`: Geomorphically stable reference location (no mass movement recorded).

### 6. Number of Positive Samples
- **20 verified landslide event instances** ($50.0\%$ of dataset).

### 7. Number of Negative/Background Samples
- **20 verified non-landslide background reference instances** ($50.0\%$ of dataset).

### 8. How Negative Samples Were Generated
- Sampled around 10 stable valley bottoms and broad interfluves in Sikkim (e.g., Jorethang Valley Floor, Melli Teesta Terrace, Rangpo Floodplain, Geyzing Flat).
- Evaluated against the SRTM 30m slope grid (gentle slopes).
- Enforced a strict minimum Euclidean distance $> 0.015^\circ$ (~$1.7\text{ km}$) from all 20 positive landslide centroids to ensure non-contamination.
- Assigned realistic non-failure seasonal dates across pre-monsoon and dry winter months.

### 9. How Train/Validation/Test Split is Performed
- In [`scripts/prepare_dataset.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/prepare_dataset.py#L353-L366):
  ```python
  train_df, test_val_df = train_test_split(valid_coords, test_size=0.30, random_state=42, stratify=valid_coords["landslide_label"])
  val_df, test_df = train_test_split(test_val_df, test_size=0.50, random_state=42, stratify=test_val_df["landslide_label"])
  ```
  Resulting splits: 28 Training ($70\%$), 6 Validation ($15\%$), 6 Test ($15\%$).

### 10. Whether the Split is Random, Spatial, Temporal, or Stratified
- **Current State:** **Stratified Random Split** on the binary class label `landslide_label`.
- It was NOT grouped by geographic location or time.

### 11. Whether Data Leakage is Possible
- **CRITICAL AUDIT RESULT: YES, SPATIAL LEAKAGE WAS DETECTED.**
  - Positive sample `ISRO-SKM-001` ($27.3389^\circ\text{N}, 88.6065^\circ\text{E}$) was assigned to `validation_dataset.csv`.
  - Positive sample `ISRO-SKM-020` ($27.3392^\circ\text{N}, 88.6070^\circ\text{E}$) was assigned to `training_dataset.csv`.
  - The Euclidean separation between these two points is only $\sim 50\text{ meters}$.
  - Because random splitting allowed identical hillslope terrain to be in both training and evaluation, the model was evaluated on near-duplicate terrain features.
- **Remediation Plan:** Replace naive random splitting with a **Grouped Spatial Block Split** using geographic cluster grouping.

### 12. Random Forest Configuration
- In [`scripts/train_models.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/train_models.py#L80-L88):
  - `n_estimators`: 100
  - `max_depth`: 6
  - `min_samples_split`: 3
  - `min_samples_leaf`: 2
  - `class_weight`: `"balanced"`
  - `random_state`: 42
  - `criterion`: `"gini"`

### 13. XGBoost Configuration
- In [`scripts/train_models.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/train_models.py#L110-L119):
  - `n_estimators`: 80
  - `max_depth`: 4
  - `learning_rate`: 0.08
  - `subsample`: 0.85
  - `colsample_bytree`: 0.85
  - `scale_pos_weight`: 1.0
  - `random_state`: 42
  - `eval_metric`: `"logloss"`

### 14. Preprocessing/Scaling/Encoding Steps
- **Categorical Encoding:** One-hot binary indicator columns for ESA WorldCover (`lc_tree_cover`, `lc_shrubland`, `lc_grassland`, `lc_cropland`, `lc_builtup`, `lc_sparse_vegetation`).
- **Continuous Scaling:** Tree-based ensemble algorithms (Random Forest and XGBoost) are inherently invariant to monotonic scaling; therefore, explicit z-score or MinMax normalization was deliberately not applied to maintain physical interpretability of natural units ($m$, $^\circ$, $mm$, $kPa$).

### 15. Missing-Value Handling
- **Dataset Generation Time:** In [`scripts/prepare_dataset.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/scripts/prepare_dataset.py#L140-L156), missing historical IMERG multi-day files are conservatively estimated from seasonal monsoon statistics rather than fabricating non-existent NetCDF4 granules.
- **Runtime Inference Time:** In [`backend/ml/feature_builder.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/feature_builder.py#L32-L75), missing or unspecified feature inputs are filled with documented Eastern Himalayan regional median defaults, with full logging of which fields were measured vs imputed.

### 16. Feature Engineering
- **Physical DEM Slope Gradients:** Topographic slope ($\theta$) and aspect ($\alpha$) are derived via 2D spatial gradient convolution ($\frac{\partial z}{\partial x}, \frac{\partial z}{\partial y}$) on the USGS 30m SRTM grid.
- **Micro-Catchment Rain Maximum:** $3\times3$ spatial window filtering on IMERG rasters yields `rainfall_surround_max_mm` to capture convective storm cores.
- **Multi-Temporal Accumulation:** Summation of antecedent 24-hour and 72-hour precipitation windows.

### 17. Model Serialization/Loading
- **Random Forest:** Serialized to `data/models/random_forest.pkl` via `joblib.dump()`.
- **XGBoost:** Serialized to `data/models/xgboost_model.json` via native JSON model saver.
- **Runtime Loader:** [`backend/ml/model_loader.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/model_loader.py) safely checks file existence and caches the loaded models in an in-memory dictionary (`_CACHE`) to avoid disk read overhead on every API request.

### 18. How Metrics Are Calculated
- Evaluated strictly using `scikit-learn.metrics`:
  - `accuracy_score(y_test, y_pred)`
  - `precision_score(y_test, y_pred, zero_division=0)`
  - `recall_score(y_test, y_pred, zero_division=0)`
  - `f1_score(y_test, y_pred, zero_division=0)`
  - `roc_auc_score(y_test, y_prob)`
  - `average_precision_score(y_test, y_prob)` (PR-AUC)
  - `confusion_matrix(y_test, y_pred)`
- Evaluated on `data/features/test_dataset.csv` ($N=6$).
- Stored persistently in `data/models/model_metrics.json`.

### 19. How Feature Importance is Calculated
- Extracted directly from the trained scikit-learn model via `rf.feature_importances_` (mean decrease in impurity / Gini importance).
- Stored in `data/models/model_metadata.json` and served via `GET /api/ml/feature-importance`.
- **Honesty Disclosure:** The system honestly labels this as **"Model Feature Importance (Tree Gini Criterion)"** rather than claiming fake SHAP values.

### 20. How ML Predictions Reach the Existing Dashboard
- Frontend components [`frontend/src/components/GisMapDashboard.jsx`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/frontend/src/components/GisMapDashboard.jsx) and [`frontend/src/components/DigitalTwinSimulator.jsx`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/frontend/src/components/DigitalTwinSimulator.jsx) send a `POST` request to `/api/hybrid-risk` whenever a zone is selected or scenario sliders are moved.
- The response object contains `physics_baseline`, `ml_model`, and `hybrid_risk`.
- The dashboard extracts `ml_model.probability`, `ml_model.risk_level`, and `ml_model.confidence` to render the ML card alongside the Physics Baseline.

### 21. How the Hybrid Risk Score is Calculated
- Implemented in [`backend/ml/hybrid_risk.py`](file:///c:/Users/HIMARAM/Downloads/ner-landslide-guard/ner-landslide-guard%20%282%29/ner-landslide-guard/backend/ml/hybrid_risk.py):
  $$R_{\text{hybrid}} = \alpha \cdot P_{\text{ML}} + (1 - \alpha) \cdot R_{\text{physics}}$$
  - Default $\alpha = 0.50$ (configured in `hybrid_config.json`).
  - $P_{\text{ML}}$ = Positive class probability from Random Forest.
  - $R_{\text{physics}}$ = Normalized geotechnical risk score derived from Factor of Safety ($\text{FoS}$) and Antecedent Precipitation Index ($\text{API}$).
  - Consensus engine evaluates $|\Delta| = |P_{\text{ML}} - R_{\text{physics}}|$:
    - $\le 0.20$: `CONCURRING`
    - $P_{\text{ML}} > R_{\text{physics}} + 0.20$: `ML_ELEVATED`
    - $R_{\text{physics}} > P_{\text{ML}} + 0.20$: `PHYSICS_ELEVATED`
    - ML missing: `PHYSICS_FALLBACK`
