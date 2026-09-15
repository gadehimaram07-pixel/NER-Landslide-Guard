# Phase 2B Real-Data Ingestion & Feature Extraction Quality Report

**System:** NER-LandslideGuard  
**Investigation Phase:** Phase 2B (Isolated Real-Data Acquisition, Feature Extraction, and Data Quality Audit)  
**Date:** September 14, 2026  
**Status:** Pipeline Complete. Prototype Intact. No Models Retrained.

---

## Executive Summary

Phase 2B established an isolated, reproducible real-data acquisition and feature extraction pipeline for Northeast India. Operating under strict forensic rules, the pipeline ingests authentic observational records from the **NASA Global Landslide Catalog (GLC)**, constructs a balanced stratified background reference dataset, and queries live physical and meteorological data from genuine 30m Digital Elevation Models (DEM) and NASA POWER satellite precipitation.

**Key Provenance Findings:**
1. **Real Observational Events:** Downloaded 11,033 global events from NASA. Extracted **315 verified authentic landslide occurrences** located strictly within the 7 North Eastern Region (NER) states of India with genuine event dates (2007–2016) and georeferenced coordinates.
2. **Zero Fabrication:** Zero coordinates were synthesized, perturbed, or duplicated.
3. **Background Sampling:** Generated **315 stratified background reference points** (1:1 ratio) constrained by state boundaries, a strict $\ge 3.0$ km exclusion buffer from all known landslide points, and empirical monsoon seasonal distributions.
4. **Terrain Derivation (100% Authentic):** Extracted genuine 30m SRTM elevations and computed physical central-difference slope and aspect across all 630 points (100.0% success).
5. **Precipitation (100% Authentic):** Successfully queried daily precipitation ($P_{24}$ and $P_{72}$) from the NASA POWER satellite climatology API for all 630 coordinates on their exact historical dates (100.0% success).
6. **Honest Missing Data Preservation:**
   - **ISRIC SoilGrids 2.0:** The public REST endpoint returned `HTTP 503 Service Temporarily Unavailable`. In strict compliance with scientific honesty rules, all 6 soil parameters were preserved as `NaN` (0.0% synthetic fallback; `SOILGRIDS_MAP` was bypassed).
   - **ESA WorldCover 10m:** The single available tile (`N27E087`) covers Sikkim/Darjeeling ($87^\circ-90^\circ\text{E}$), while all 315 verified events are located in eastern NER states ($> 90^\circ\text{E}$). Rather than using coordinate hashing, all land cover values were preserved as `NaN`.
   - **Derived Geotechnical / Neighborhood Heuristics:** `saturation_pct`, `cohesion_kpa`, and `rainfall_surround_max_mm` were recorded as `NaN` rather than evaluating synthetic formulas.

---

## A. Sources Used

| Dataset / Layer | Official Provider | Endpoint / Asset URL | Data Format | Auth Required |
| :--- | :--- | :--- | :--- | :---: |
| **Global Landslide Catalog (GLC)** | NASA Goddard Space Flight Center | `https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/` | CSV | Open (AWS S3) |
| **SRTM 1 Arc-Second DEM (30m)** | NASA / USGS | `https://api.opentopodata.org/v1/srtm30m` | REST API (JSON) | Open |
| **Daily Precipitation ($P_{24}, P_{72}$)** | NASA POWER Project | `https://power.larc.nasa.gov/api/temporal/daily/point` | REST API (JSON) | Open |
| **SoilGrids 2.0 Properties** | ISRIC - World Soil Information | `https://rest.isric.org/soilgrids/v2.0/properties/query` | REST API (JSON) | Open |
| **WorldCover 10m Land Cover** | European Space Agency (ESA) | Local GeoTIFF: `data/raw/worldcover/ESA_WorldCover_10m_...` | Cloud-Optimized GeoTIFF | Open / Local |

---

## B. Number of Downloaded Events

- **Total Global Records Ingested:** **11,033 events**
- **Catalog File:** `data/raw/glc_real/Global_Landslide_Catalog_Export_rows.csv` (8,479,717 bytes)
- **Global Temporal Span:** 2007-01-01 to 2017-05-22

---

## C. Number of Usable Northeast India Events

- **Events within NER Regional Bounding Box ($[21.5^\circ-28.5^\circ\text{N},\, 89.5^\circ-97.5^\circ\text{E}]$):** **524 events**
  - India: 315
  - Bangladesh: 40
  - Myanmar [Burma]: 23
  - Bhutan: 17
  - Border corridors / unclassified: 129
- **Authentic Events Strictly in Northeast Indian States:** **315 events**

### State Breakdown (India NER):
| State | Verified Historical Events | Percentage of Real Inventory |
| :--- | :---: | :---: |
| **Assam** | 82 | 26.0% |
| **Nagaland** | 78 | 24.8% |
| **Manipur** | 56 | 17.8% |
| **Arunachal Pradesh** | 40 | 12.7% |
| **Meghalaya** | 29 | 9.2% |
| **Mizoram** | 27 | 8.6% |
| **Tripura** | 3 | 1.0% |
| **Total** | **315** | **100.0%** |

---

## D. Missing / Invalid Records Audit

- **Coordinate Validation:** 524 out of 524 regional events had valid numeric latitude and longitude coordinates ($100.0\%$).
- **Date Validation:** 524 out of 524 regional events had valid, parseable ISO-8601 dates ($100.0\%$).
- **Duplicate Records Removed:** 3 records were identified as exact duplicates on (lat, lon, date) and dropped.
- **Records Fabricated or Perturbed:** **0**

---

## E. DEM Extraction Success

- **Service Used:** NASA/USGS SRTM 30m Digital Elevation Model via OpenTopoData.
- **Methodology:** For each coordinate, a 5-point spatial stencil was evaluated (Center, North, South, East, West) at 30m horizontal spacing ($\Delta x = 30\text{m}, \Delta y = 30\text{m}$).
- **Gradient Formulation:**
  $$\frac{\partial z}{\partial x} = \frac{z_{\text{East}} - z_{\text{West}}}{2 \Delta x}, \quad \frac{\partial z}{\partial y} = \frac{z_{\text{North}} - z_{\text{South}}}{2 \Delta y}$$
  $$\text{slope\_deg} = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right) \times \frac{180^\circ}{\pi}$$
  $$\text{aspect\_deg} = \left(\operatorname{atan2}\left(-\frac{\partial z}{\partial y},\, \frac{\partial z}{\partial x}\right) \times \frac{180^\circ}{\pi} + 360^\circ\right) \bmod 360^\circ$$
- **Extraction Count:** **630 / 630 points (100.0% success rate)**
- **Elevation Range:** 6.0 m to 5,145.0 m
- **Observed Landslide Mean Slope:** $16.25^\circ$
- **Background Reference Mean Slope:** $17.28^\circ$
- **Local Cache:** `data/raw/dem/real_dem_cache.json`

---

## F. Soil Extraction Success

- **Service Targeted:** ISRIC SoilGrids 2.0 REST API (`https://rest.isric.org/soilgrids/v2.0/properties/query`).
- **Properties Requested:** Clay (%), Sand (%), Silt (%), Bulk Density ($\text{cg/cm}^3$), $\text{pH}_{\text{H}_2\text{O}}$, Soil Organic Carbon ($\text{dg/kg}$).
- **Server Response:** `HTTP 503 Service Temporarily Unavailable` (Upstream ISRIC web server failure).
- **Successful Extractions:** **0 / 630 (0.0%)**
- **Action Taken:** In strict compliance with Phase 2B rules, all 6 soil variables were preserved as `NaN` (missing values). No synthetic district lookup tables (`SOILGRIDS_MAP`) were substituted.
- **Audit File:** `data/raw/soilgrids/real_soilgrids_audit.json`

---

## G. Land-Cover Extraction Success

- **Service Targeted:** ESA WorldCover 10m Cloud-Optimized GeoTIFF.
- **Available Tile:** `ESA_WorldCover_10m_2021_v200_N27E087_Map.tif` ($27.0^\circ\text{N}-30.0^\circ\text{N},\, 87.0^\circ\text{E}-90.0^\circ\text{E}$, covering Sikkim and Darjeeling).
- **Spatial Overlap:** 0 of the 315 verified Indian NER events fall within this tile (the verified events are located in Assam, Nagaland, Manipur, Mizoram, Meghalaya, and Arunachal Pradesh east of $91^\circ\text{E}$).
- **Successful Extractions:** **0 / 630 (0.0%)**
- **Action Taken:** Missing tile status was reported explicitly. All land cover features were preserved as `NaN`. Zero coordinate hashing was applied.

---

## H. Rainfall Extraction Success

- **Service Used:** NASA POWER Daily Point Precipitation (`PRECTOTCORR`).
- **Methodology:** Verified coordinates and verified event dates were passed directly to NASA POWER for a 3-day temporal window $[D-2, D-1, D]$.
- **Metrics Extracted:**
  - `rainfall_24h_mm`: Precipitation on day $D$.
  - `rainfall_72h_mm`: Cumulative sum on $[D-2, D-1, D]$.
- **Extraction Count:** **630 / 630 points (100.0% success rate)**
- **Mean 24h Precipitation:**
  - Observed Landslides: **21.00 mm**
  - Background Samples: **15.09 mm**
- **Mean 72h Cumulative Precipitation:**
  - Observed Landslides: **58.39 mm**
  - Background Samples: **48.95 mm**
- **Local Cache:** `data/raw/imerg/real_rainfall_cache.json`

---

## I. Final Usable Sample Count

- **Authentic Observed Landslides ($y = 1$):** **315 samples**
- **Stratified Background References ($y = 0$):** **315 samples**
- **Total Master Real Dataset Rows:** **630 samples**
- **Artifact Location:** `data/features/real_landslide_features.csv`

---

## J. Percentage of Fields Successfully Sourced

Out of the 16 core feature columns required by the prototype ML pipeline:
- **Authentically Extracted Features (100% complete):** **5 / 16 features (31.25%)**
  - `elevation_m`
  - `slope_deg`
  - `aspect_deg`
  - `rainfall_24h_mm`
  - `rainfall_72h_mm`
- **Missing / Unavailable External Layers:** **11 / 16 features (68.75%)**
  - `rainfall_surround_max_mm` (Spatial raster buffer not available)
  - `soil_clay_pct` (ISRIC 503 outage)
  - `soil_sand_pct` (ISRIC 503 outage)
  - `soil_silt_pct` (ISRIC 503 outage)
  - `soil_bulk_density` (ISRIC 503 outage)
  - `soil_ph` (ISRIC 503 outage)
  - `soil_organic_carbon` (ISRIC 503 outage)
  - `lc_tree_cover` (Tile unavailable)
  - `lc_builtup` (Tile unavailable)
  - `saturation_pct` (Unmeasured physical parameter)
  - `cohesion_kpa` (Unmeasured physical parameter)

---

## K. Missing-Data Table

| Column Name | Data Type | Non-Null Count | Null Count | Completeness | Extraction Source / Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `sample_id` | object | 630 | 0 | 100.0% | Provenance ID (`GLC-REAL-xxx` / `BG-NER-xxx`) |
| `label` | int64 | 630 | 0 | 100.0% | Ground-truth binary label (1 / 0) |
| `sample_type` | object | 630 | 0 | 100.0% | `observed_landslide` vs `background` |
| `data_pedigree` | object | 630 | 0 | 100.0% | `NASA_GLC_OBSERVATIONAL_GROUND_TRUTH` |
| `latitude` | float64 | 630 | 0 | 100.0% | Official catalog / stratified coordinate |
| `longitude` | float64 | 630 | 0 | 100.0% | Official catalog / stratified coordinate |
| `event_date` | object | 630 | 0 | 100.0% | Verified ISO-8601 observation date |
| `state` | object | 630 | 0 | 100.0% | Standardized administrative state name |
| `elevation_m` | float64 | 630 | 0 | **100.0%** | NASA/USGS SRTM 30m DEM |
| `slope_deg` | float64 | 630 | 0 | **100.0%** | SRTM 30m central-difference spatial gradient |
| `aspect_deg` | float64 | 630 | 0 | **100.0%** | SRTM 30m central-difference spatial gradient |
| `rainfall_24h_mm` | float64 | 630 | 0 | **100.0%** | NASA POWER daily satellite precipitation |
| `rainfall_72h_mm` | float64 | 630 | 0 | **100.0%** | NASA POWER 3-day cumulative precipitation |
| `rainfall_surround_max_mm`| float64 | 0 | 630 | 0.0% | Missing (spatial raster neighborhood required) |
| `soil_clay_pct` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `soil_sand_pct` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `soil_silt_pct` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `soil_bulk_density` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `soil_ph` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `soil_organic_carbon` | float64 | 0 | 630 | 0.0% | Missing (ISRIC REST API 503 outage) |
| `lc_tree_cover` | float64 | 0 | 630 | 0.0% | Missing (ESA WorldCover tile missing east of 90°E)|
| `lc_builtup` | float64 | 0 | 630 | 0.0% | Missing (ESA WorldCover tile missing east of 90°E)|
| `saturation_pct` | float64 | 0 | 630 | 0.0% | Missing (unmeasured geotechnical variable) |
| `cohesion_kpa` | float64 | 0 | 630 | 0.0% | Missing (unmeasured geotechnical variable) |

---

## L. Complete Provenance Methodology

1. **Step 1: Download & Filter NASA GLC**
   - Downloaded official global export (11,033 records) directly from NASA.
   - Bounded to Northeast India $[21.5^\circ-28.5^\circ\text{N}, 89.5^\circ-97.5^\circ\text{E}]$.
   - Filtered for `country_name == 'India'` and validated standardized states.
   - Deduped identical coordinate-date tuples, resulting in 315 verified events.
2. **Step 2: Stratified Background Sampling**
   - Sampled 315 reference locations across the exact same 7 states in identical proportion.
   - Enforced a minimum buffer distance of $\ge 3.0$ km from all 315 known landslide events.
   - Temporally anchored background samples to the empirical monsoon date distribution of positive events in each state.
3. **Step 3: Genuine 30m Topographic Extraction**
   - Queried SRTM 30m DEM for 5-point cross stencils $(\Delta x, \Delta y = 30\text{m})$.
   - Calculated physical slope and aspect using central difference derivatives.
4. **Step 4: Genuine Satellite Meteorological Extraction**
   - Queried NASA POWER daily point precipitation API for $[D-2, D-1, D]$.
   - Extracted verified 24-hour and 72-hour cumulative precipitation.
5. **Step 5: Strict Scientific Honesty for Missing Layers**
   - ISRIC SoilGrids REST API probe returned HTTP 503. Preserved missing values as `NaN`.
   - Local ESA WorldCover tile covers Sikkim/Darjeeling only. Recorded missing values as `NaN`.
   - Preserved geotechnical and spatial buffer heuristics as `NaN`.

---

## M. Step 10: Training Decision Audit

### Evaluation of Training Feasibility on Real Data
1. **Sample Size:** 630 total rows (315 positive, 315 background) is **sufficient** for training tree-based classifiers (Random Forest, XGBoost, LightGBM).
2. **Feature Dimensionality & Missingness:**
   - Out of 16 features, **5 core physical features are 100% complete**:
     `elevation_m`, `slope_deg`, `aspect_deg`, `rainfall_24h_mm`, `rainfall_72h_mm`.
   - 11 features are currently `NaN`.
3. **Impact on Standard Estimators:**
   - **XGBoost, CatBoost, and LightGBM** natively handle missing values (`NaN`) during tree splitting.
   - **RandomForestClassifier** in standard `scikit-learn` requires imputation (`SimpleImputer` or `HistGradientBoostingClassifier`) or sub-selecting the 5 fully observed real features.
4. **Conclusion:**
   - Training a **5-feature observational shadow model** (or training an XGBoost shadow model with native NaN handling) is **technically feasible and scientifically defensible**.
   - **CRITICAL ACTION:** In accordance with Step 10 rules, **NO MODEL RETRAINING WAS PERFORMED**. The pipeline has stopped here to report the exact data state and await explicit user review and approval.
