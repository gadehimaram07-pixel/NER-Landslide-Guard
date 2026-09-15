# Phase 2C Report: Isolated Real-Data Shadow Model Benchmark for Northeast India

**System:** NER-LandslideGuard  
**Investigation Phase:** Phase 2C (Isolated Observational Modeling Benchmark)  
**Date:** September 14, 2026  
**Status:** Completed. Shadow models trained and evaluated. Prototype intact and untouched.

---

## Executive Summary

Phase 2C successfully established an isolated observational machine learning benchmark for landslide occurrence across Northeast India. Operating strictly on genuine observational data from the **NASA Global Landslide Catalog (GLC)**, genuine 30m topographic data from the **NASA/USGS SRTM DEM**, and genuine satellite precipitation from the **NASA POWER** climate archive, four modest classifiers were trained and evaluated under rigorous spatial hold-out conditions.

**Key Experimental Findings:**
1. **Zero Data Fabrication:** The dataset contains **315 verified historical landslide occurrences** from NASA GLC and **315 stratified background references** across 7 Northeast Indian states (Assam, Nagaland, Manipur, Arunachal Pradesh, Meghalaya, Mizoram, Tripura).
2. **Genuinely Measured Features Only:** Exactly **5 physical features** were used for modeling:
   `['elevation_m', 'slope_deg', 'aspect_deg', 'rainfall_24h_mm', 'rainfall_72h_mm']`.  
   The 11 unmeasured or server-failed environmental variables (SoilGrids, WorldCover, geotechnical heuristics) were **neither imputed nor synthesized**.
3. **Rigorous Spatial Isolation:** A buffer-sanitized state holdout strategy was enforced. Manipur (112 samples) was held out as the final test set, with a **guaranteed minimum distance of 10.35 km** separating all test coordinates from the training set (Assam, Nagaland, Arunachal, Meghalaya, Tripura).
4. **Benchmark Model Performance:**
   - **Random Forest:** Achieved the highest spatial generalization performance with **Spatial CV ROC-AUC = 0.617 (±0.061)** and Held-Out Test **Accuracy = 60.7%**, **ROC-AUC = 0.602**, **F1-Score = 0.614** (Precision: 60.3%, Recall: 62.5%).
   - **HistGradientBoosting:** Spatial CV ROC-AUC = **0.605 (±0.054)**, Test Accuracy = **54.5%**, Test ROC-AUC = **0.565**.
   - **XGBoost:** Spatial CV ROC-AUC = **0.601 (±0.055)**, Test Accuracy = **51.8%**, Test ROC-AUC = **0.581**.
   - **Logistic Regression:** Spatial CV ROC-AUC = **0.450 (±0.050)**, Test Accuracy = **46.4%**, Test ROC-AUC = **0.444**.
5. **Physical Feature Attribution:** Unlike the synthetic prototype (where hand-tuned slope contributed >40% of tree decisions), on real observational data feature importance is distributed across both antecedent moisture and topography:
   - Antecedent 72h Rainfall ($P_{72}$): **~24.0%**
   - 30m SRTM Elevation: **~22.8%**
   - Triggering 24h Rainfall ($P_{24}$): **~21.5%**
   - 30m Slope Gradient: **~17.4%**
   - 30m Aspect: **~14.3%**
6. **Strict Prototype Isolation:** The existing 620-row prototype (`data/features/landslide_features.csv`, model binaries in `data/models/`, API endpoints, and frontend) remains 100% untouched and functional.

---

## 1. Final Dataset Pre-Training Audit

The pre-training audit (`scripts/pipeline_real/08_audit_real_dataset.py`) verified complete compliance with Phase 2C requirements:

| Audit Parameter | Audit Finding | Verification Status |
| :--- | :--- | :---: |
| **Total Row Count** | 630 rows | PASS |
| **Observed Landslide Events ($y=1$)** | 315 events (NASA Global Landslide Catalog) | PASS |
| **Background Reference Points ($y=0$)** | 315 samples (Stratified buffer selection) | PASS |
| **Class Balance** | Exactly 50.0% / 50.0% (1:1 balanced ratio) | PASS |
| **Duplicate Records** | 0 duplicate (lat, lon, date) tuples; 0 duplicate IDs | PASS |
| **Coordinate Bounds** | Lat $[22.03^\circ, 28.50^\circ\text{N}]$, Lon $[89.81^\circ, 96.93^\circ\text{E}]$ (NER Bounding Box) | PASS |
| **Temporal Span** | 2007-07-19 to 2016-08-05 (100% valid ISO-8601 dates) | PASS |
| **Provenance Columns** | `sample_id`, `source`, `sample_type`, `data_pedigree`, `event_date`, `state` | PASS |

### State-Level Sample Distribution:
| State | Observed Landslides | Background References | Total Samples | Share of Dataset |
| :--- | :---: | :---: | :---: | :---: |
| **Assam** | 82 | 82 | 164 | 26.0% |
| **Nagaland** | 78 | 78 | 156 | 24.8% |
| **Manipur** (Held-out Test) | 56 | 56 | 112 | 17.8% |
| **Arunachal Pradesh** | 40 | 40 | 80 | 12.7% |
| **Meghalaya** | 29 | 29 | 58 | 9.2% |
| **Mizoram** (Validation) | 27 | 27 | 54 | 8.6% |
| **Tripura** | 3 | 3 | 6 | 1.0% |
| **Total** | **315** | **315** | **630** | **100.0%** |

---

## 2. Negative Class Semantics: Background Reference vs. Confirmed Stable

In statistical landslide susceptibility literature (e.g., Reichenbach et al., 2018), ground truth datasets rarely contain verified non-events because absolute slope stability is impossible to prove without continuous geotechnical monitoring.

In this shadow pipeline:
- The negative class is explicitly designated as **"background/reference samples"** (`sample_type = "background"`, `data_pedigree = "DISTRICT_STRATIFIED_BUFFERED_REFERENCE"`).
- They are **NOT** labeled as "confirmed stable ground truth".
- **Selection Methodology:** Generated within the same administrative boundaries, separated by a minimum buffer distance of $\ge 3.0\text{ km}$ from any verified landslide event, and sampled under the empirical monsoon date distribution of positive events in that state.

---

## 3. Physical Feature Extraction vs. Missing Layer Handling

### Genuinely Measured Physical Features (100% Populated):
1. `elevation_m`: Elevation in meters above sea level from the NASA/USGS SRTM 30m DEM.
2. `slope_deg`: Topographic slope gradient derived from a 5-point central-difference stencil at 30m grid spacing ($\Delta x, \Delta y = 30\text{m}$).
3. `aspect_deg`: Compass orientation of the slope face ($0^\circ-360^\circ$) derived from spatial gradients.
4. `rainfall_24h_mm`: Daily precipitation on the event date from NASA POWER satellite climatology.
5. `rainfall_72h_mm`: Cumulative 3-day precipitation over $[D-2, D-1, D]$ from NASA POWER.

### Missing Environmental Layers (Preserved as `NaN`, Excluded from $X$):
- **Soil Variables (6):** ISRIC SoilGrids 2.0 public REST endpoint returned `HTTP 503 Service Temporarily Unavailable`. Preserved as `NaN`.
- **Land Cover Variables (2):** ESA WorldCover 10m tile `N27E087` only covers Sikkim ($<90^\circ\text{E}$); all 315 verified events are located in eastern NER ($>90^\circ\text{E}$). Preserved as `NaN`.
- **Derived Heuristics (3):** Surrounding spatial rainfall buffer, soil saturation %, and cohesion kPa were formulaic heuristics in the prototype; they were intentionally bypassed and recorded as `NaN`.
- **Policy:** In accordance with user rules, **no imputation was performed**. The models were trained strictly on the 5 genuine physical measurements.

---

## 4. Spatial Validation Strategy & Leakage Audit

To prevent spatial autocorrelation leakage, naive random row splitting was rejected in favor of a **geographic block hold-out split** complemented by **5-Fold Spatial Group Cross-Validation**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPATIAL HOLD-OUT PARTITIONING                            │
├──────────────────────────────┬─────────────────────────────┬────────────────┤
│ Split                        │ Geographic Regions (States) │ Sample Count   │
├──────────────────────────────┼─────────────────────────────┼────────────────┤
│ **Training Set**             │ Assam, Nagaland, Arunachal, │ 417 samples    │
│                              │ Meghalaya, Tripura          │ (Sanitized)    │
│ **Validation Set**           │ Mizoram                     │ 54 samples     │
│ **Held-Out Test Set**        │ Manipur                     │ 112 samples    │
└──────────────────────────────┴─────────────────────────────┴────────────────┘
```

### Spatial Leakage Buffer Sanitization:
- An initial audit of the raw train states revealed 47 border points in southern Nagaland and eastern Assam located $< 10\text{ km}$ from the Manipur state boundary.
- **Sanitization Action:** These 47 border points were purged from the training set.
- **Result:** The final sanitized training set (417 rows) has a **guaranteed minimum pairwise distance of 10.35 km** from all test points in Manipur, ensuring complete spatial independence.

---

## 5. Shadow Model Benchmark Evaluation

Four modest classifiers were trained on the sanitized training set (417 samples) using only the 5 physical features:

| Model Architecture | Spatial CV ROC-AUC | Test Accuracy | Test Precision | Test Recall | Test F1-Score | Test ROC-AUC | Test PR-AUC | Brier Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Forest** | **0.617** $\pm$ 0.061 | **60.7%** | **60.3%** | **62.5%** | **0.614** | **0.602** | **0.602** | 0.239 |
| **HistGradientBoosting** | 0.605 $\pm$ 0.054 | 54.5% | 54.9% | 50.0% | 0.523 | 0.565 | 0.588 | 0.248 |
| **XGBoost Classifier** | 0.601 $\pm$ 0.055 | 51.8% | 52.0% | 46.4% | 0.491 | 0.581 | 0.621 | 0.252 |
| **Logistic Regression** | 0.450 $\pm$ 0.050 | 46.4% | 43.3% | 23.2% | 0.302 | 0.444 | 0.498 | 0.260 |

*(Note: Spatial CV is 5-Fold GroupKFold grouped by state across all 630 samples).*

### Confusion Matrices on Held-Out Test Set (Manipur, $N=112$):

```
Random Forest:                  HistGradientBoosting:
               Pred 0   Pred 1                 Pred 0   Pred 1
Actual 0 (BG)    33       23    Actual 0 (BG)    33       23
Actual 1 (LS)    21       35    Actual 1 (LS)    28       28
(Accuracy: 60.7%, F1: 0.614)    (Accuracy: 54.5%, F1: 0.523)

XGBoost:                        Logistic Regression:
               Pred 0   Pred 1                 Pred 0   Pred 1
Actual 0 (BG)    32       24    Actual 0 (BG)    39       17
Actual 1 (LS)    30       26    Actual 1 (LS)    43       13
(Accuracy: 51.8%, F1: 0.491)    (Accuracy: 46.4%, F1: 0.302)
```

---

## 6. Feature Importance & Physical Interpretation

Feature importance was extracted for each model across the 5 genuinely populated features:

| Feature Name | Random Forest (Gini Importance) | XGBoost (Weight/Gain) | Logistic Regression ($|\beta|$ Coef) | Physical Role in Slope Stability |
| :--- | :---: | :---: | :---: | :--- |
| **`rainfall_72h_mm`** | **23.99%** | **24.22%** | 10.92% | Antecedent moisture; pore water pressure accumulation |
| **`elevation_m`** | **22.82%** | **20.40%** | 9.46% | Orographic precipitation altitude & hypsometric regime |
| **`rainfall_24h_mm`** | **21.47%** | **18.22%** | **42.21%** | Immediate cloudburst / storm triggering intensity |
| **`slope_deg`** | **17.42%** | **18.84%** | 8.19% | Gravitational driving shear stress |
| **`aspect_deg`** | **14.30%** | **18.32%** | **29.21%** | Monsoon windward vs. leeward moisture exposure |

### Comparison with the Synthetic Prototype:
- **Synthetic Prototype:** Slope alone accounted for **41.05%** of decision splits, because slopes were synthetically assigned from disjoint ranges (28°–55° for landslides vs. valley floors for background).
- **Observational Benchmark:** Importance is **distributed naturally across hydrologic triggering and topography**. Antecedent 72h rainfall ($24.0\%$) and 24h rainfall ($21.5\%$) collectively account for over $45\%$ of tree decisions, matching established geotechnical literature on rainfall-induced shallow landslides in the Himalayas and Indo-Burma ranges.

---

## 7. Model Limitations & Scientific Context

1. **Observational vs. Operational Reality:**
   An out-of-region spatial test accuracy of **60.7% (ROC-AUC 0.602)** reflects the true empirical difficulty of predicting real landslide occurrences across unseen mountain ranges using only 5 satellite-derived physical features at 30m/0.5° resolution.
2. **Coarse Satellite Meteorology:**
   NASA POWER precipitation has a spatial resolution of $\approx 0.5^\circ \times 0.5^\circ$ ($\approx 50\text{ km}$). Highly localized convective cloudbursts that trigger Himalayan landslides may not be captured at this scale.
3. **Absence of Local Geology & Soil Depth:**
   Real slope failures depend heavily on soil shear strength parameters ($c', \phi'$) and bedrock-soil interface depth, which cannot be measured via remote sensing alone without in-situ borehole surveys.
4. **Pseudo-Absence Background Sampling:**
   Background points represent uncataloged locations with a 3 km buffer, not permanently instrumented stable slopes. Some background points may have experienced unrecorded historical failures.

---

## 8. Artifacts & Integrity Verification

### Saved Shadow Model Artifacts (`data/models/real_shadow/`):
- `logisticregression.joblib`
- `randomforest.joblib`
- `histgradientboosting.joblib`
- `xgboost.joblib`
- `shadow_model_metrics.json`
- `test_predictions.csv`

### Operational Integrity Confirmation:
A full backend endpoint and model inference verification test was executed:
```
[PASS] Root Endpoint (/)
[PASS] ML Status (/api/ml/status)
[PASS] ML Metrics (/api/ml/metrics)
[PASS] ML Feature Importance (/api/ml/feature-importance)
[PASS] ML Predict (/api/ml/predict)
[PASS] Hybrid Risk (/api/hybrid-risk)
[PASS] Zones GeoJSON (/api/zones)
[PASS] Sensors List (/api/sensors)
[PASS] InSAR Displacement Feed (/api/insar)
[PASS] Digital Twin Sim (/api/digital-twin/simulate)
[PASS] Alerts List (/api/alerts)
[PASS] Edge AI Simulate (/api/edge-ai/simulate)
[PASS] Vision Classifier (/api/vision/classify)
All 13/13 endpoints passed.
```
**Conclusion:** The active 620-row SIH demonstration platform remains **100% operational and completely unchanged**. The new real-data shadow pipeline exists in complete isolation.
