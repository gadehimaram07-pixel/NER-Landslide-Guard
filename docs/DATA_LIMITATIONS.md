# Dataset Audit, Provenance & Scientific Scaling Limitations
## NER-LandslideGuard: Operational Real-Data Feasibility & Gap Analysis

**Document Version**: 1.0.0  
**Audit Standard**: Zero Synthetic Fabrication & Scientific Data Verification  
**Target Geographic Domain**: Sikkim State & North East Corridor (EPSG:4326, Lat: 27.05–28.15°N, Lon: 88.05–88.95°E)  
**Publication Date**: September 2026

---

## 1. Executive Summary

NER-LandslideGuard transitions the landslide early warning paradigm from purely empirical/heuristic rules to a rigorous **Physics-Informed + Real Data-Driven Machine Learning Hybrid Architecture**.

In adherence to strict scientific ethics:
- **Zero Synthetic Fabrication Rule**: No fake landslide scars, fictitious coordinates, imaginary rainfall numbers, or synthetic InSAR velocities were invented or injected.
- **Current Real Extracted Dataset**: Exactly **48 verified samples** (24 positive historical landslide occurrences from ISRO Landslide Atlas and NASA GLC, and 24 background/non-landslide reference samples).
- **Current Pipeline Model**: The 48-sample expanded pipeline (Random Forest & XGBoost, 18 features) evaluated on a held-out test block.
- **Negative Sample Scientific Terminology**: The 24 negative reference points are designated as **background/non-landslide reference samples** (selected via SRTM slope $\le 6.11^\circ$ and proximity buffer $\ge 3.51\text{ km}$ from known landslide scars). They must NOT be called permanently stable without multi-year InSAR or borehole confirmation.
- **Target Gap**: The long-term production target of **2,000–5,000 samples** cannot be achieved from the raw local repository files alone without external institutional bulk datasets (e.g., GSI NLSM shapefiles and multi-year IMERG HDF5 archives).

---

## 2. Exhaustive Audit of Source Datasets

Every data layer has been audited and classified according to its actual presence, spatial resolution, temporal frequency, and usability.

| Dataset Name | Source Institution | Local Repository Path / Format | Status | Usable Coverage & Resolution | Extraction & Handling Notes |
|:---|:---|:---|:---:|:---|:---|
| **ISRO Landslide Atlas of India** | NRSC / ISRO | `data/raw/isro_landslides_sikkim.json` (GeoJSON) | **AVAILABLE** | 20 unique historical polygon/point locations across East, South, West, North Sikkim (2020–2024). | Extracted coordinates, dates, and locations. Exactly 0 duplicates within ISRO. 1 cross-catalog duplicate with NASA GLC deduplicated. |
| **NASA Global Landslide Catalog (GLC)** | NASA GSFC | `data/raw/nasa_glc_sikkim.json` (GeoJSON) | **AVAILABLE** | 5 regional events in Eastern Himalayas (2020–2024). | 1 exact duplicate (`GLC_IND_001` matches `ISRO-SKM-001` at Ranipool) deduplicated. Remaining events audited. |
| **USGS / NASA SRTM 30m DEM** | USGS / NASA | `data/raw/srtm_sikkim_dem.tif` (GeoTIFF) | **AVAILABLE** | Continuous 1 arc-second (~30m) raster covering full Sikkim domain. | Extracted elevation, finite-difference gradient slope, downhill aspect, and Riley Terrain Ruggedness Index (TRI). |
| **ISRIC SoilGrids 2.0** | ISRIC World Soil Info | `data/raw/soilgrids/sikkim_soil_*.tif` & regional profiles | **AVAILABLE** | Multi-depth pedological properties (clay, sand, silt, bulk density, pH, SOC). | Successfully sampled at 0–30 cm depth slices. Textural sum (clay+sand+silt = 100%) verified. |
| **ESA WorldCover 2021** | European Space Agency | `data/raw/worldcover_sikkim_2021.tif` (GeoTIFF) | **AVAILABLE** | 10m global land cover classification (v200). | One-hot encoded into 6 geomorphically relevant land-cover categories (tree cover, shrubland, grassland, cropland, built-up, sparse vegetation). |
| **NASA GPM IMERG Rainfall** | NASA / JAXA | `data/raw/imerg/3B-DAY.MS.MRG.3IMERG.*.V07B.nc4` (NetCDF4) | **PARTIAL** | 4 daily files (2025-07-01 to 2025-07-04) at 0.1° (~10 km) resolution. | Extracted real precipitation for dates matching the NetCDF archive (2 samples). For the 38 historical events from 2020–2024, IMERG values are strictly marked `NaN` (`rainfall_source = HISTORICAL_ARCHIVE_UNAVAILABLE`). No fake rain was fabricated. |
| **Sentinel-1 InSAR Deformation** | ESA Copernicus | No local interferograms or velocity tables present. | **NOT YET AVAILABLE** | Requires external interferometric processing (e.g., GMTSAR/InSAR SNAP pipeline). | **Strict Zero Fabrication**: Marked as `[SKIPPED]` in feature matrix. Not fabricated. |

---

## 3. Real Sample Extraction Breakdown

### A. Positive Inventory ($N=24$)
- **Source**: National Remote Sensing Centre (NRSC), ISRO Landslide Atlas of India (2023 release) for Sikkim State (20 records) + NASA Global Landslide Catalog (4 unique records).
- **Event Distribution**:
  - East Sikkim (NH-10 corridor, Gangtok, Ranipool, Singtam): 13 events
  - South Sikkim (Namchi, Ravangla, Jorethang): 3 events
  - West Sikkim (Gyalshing, Pelling, Yuksom): 1 event
  - North Sikkim (Mangan, Chungthang, Lachen axis): 7 events
- **Temporal Range**: July 4, 2020 to July 20, 2024.
- **De-duplication**:
  - Cross-catalog duplicates: 1 removed (`NASA GLC_IND_001` was identical in GPS coordinates and date to `ISRO-SKM-001`).

### B. Negative Background Reference Samples ($N=24$)
- **Terminology**: Designated strictly as **background/non-landslide reference samples**.
- **Sampling Strategy**: Scientifically stratified random sampling across all 4 Sikkim districts (6 per district) constrained by topography:
  1. **Slope Angle**: Restricted to valley bottoms and terraces with slope $\le 15^\circ$ (actual sampled max: $6.11^\circ$).
  2. **Proximity Exclusion Buffer**: Minimum Euclidean distance of $> 1.7\text{ km}$ from any verified historical landslide scar (actual sampled min buffer: $3.51\text{ km}$).
  3. **Elevation Constraints**: Restrict to inhabitable/vegetated altitudes ($< 2,800\text{ m}$) avoiding periglacial scree.
- **Class Balance**: 24 Positives / 24 Negatives = **1.00 (Perfect 1:1 Balance)**.

---

## 4. Gap Analysis: Moving to 2,000–5,000 Real Samples

### Why the Current Raw Repo Cannot Support 2,000 Samples Without External Ingestion
1. **Local Raw Catalog Bounds**: The repository contains specific sample demonstration GeoJSON exports from ISRO (20 records) and NASA GLC (5 records). While these cover major disaster epicenters in Sikkim, they do not include the multi-decade all-India inventory.
2. **Rainfall NetCDF Bounds**: NASA GPM IMERG daily files require ~150 MB per global day. The repository ships with a 4-day sample NetCDF archive. Generating daily antecedent rainfall for thousands of historical dates across a 10-year window requires ~3,650 daily NetCDF files (~500 GB) or accessing the NASA GES DISC OPeNDAP API.
3. **No Synthetic Shortcuts**: In high-stakes disaster warning, fabricating 4,000 synthetic GPS coordinates would create a dangerously misleading model that fails under field conditions.

---

## 5. Institutional Datasets Required for Production Scaling

To legitimately scale `NER-LandslideGuard` to 2,000–5,000+ real samples across the Northeast Region:

1. **Geological Survey of India (GSI) - National Landslide Susceptibility Mapping (NLSM)**:
   - GSI maintains polygon shapefiles of over 60,000 documented landslides across India, with ~12,000 in the Eastern Himalayas and NER.
   - Format needed: ESRI Shapefile (`.shp`) or GeoPackage (`.gpkg`).
   - Acquisition: Via Bhukosh Geological Portal (`https://bhukosh.gsi.gov.in`) or institutional MoA.
2. **State Disaster Management Authority (SSDMA / ASDMA) Incident Logs**:
   - Field incident reports from Border Roads Organisation (Project Swastik, Sikkim) documenting road blockade dates and kilometer posts along NH-10.
3. **NASA GES DISC IMERG V07B Historical Archive (2015–Present)**:
   - Complete daily calibrated rainfall rasters via Earthdata tokenized curl/OPeNDAP script for bounding box `[27.0-28.5 N, 88.0-90.0 E]`.
4. **Copernicus Sentinel-1 InSAR Displacement Velocity Maps**:
   - Pre-computed Line-of-Sight (LOS) deformation velocity rasters (mm/year) processed via LiCSAR or COMET portal for the Sikkim ascending/descending tracks.

---

## 6. Step-by-Step Instructions: Re-running & Scaling the Pipeline

When bulk institutional data is downloaded, the pipeline will scale automatically:

```bash
# Step 1: Place new raw inventory shapefiles or CSVs in data/raw/
# Example: data/raw/gsi_nlsm_sikkim.shp or data/raw/isro_bulk_inventory.csv

# Step 2: Download corresponding IMERG NetCDF files into data/raw/imerg/
# Example: data/raw/imerg/3B-DAY.MS.MRG.3IMERG.2023*.nc4

# Step 3: Verify all datasets and update the inventory audit
python scripts/check_all_datasets.py

# Step 4: Run negative background generation (automatically matches positive count)
python scripts/generate_background_samples.py

# Step 5: Extract raster features across all new points (SRTM, SoilGrids, WorldCover, IMERG)
python scripts/build_feature_dataset.py

# Step 6: Validate quality, physical boundaries, and zero-leakage constraints
python scripts/validate_feature_dataset.py
python scripts/split_and_verify_leakage.py

# Step 7: Print full summary statistics
python scripts/print_dataset_summary.py
```

---

## 7. Model Retraining Governance Protocol

The system enforces strict safeguards before allowing model retraining:

> [!IMPORTANT]
> **Production Retraining Checklist**:
> 1. Total verified real samples must exceed $N \ge 200$.
> 2. Antecedent rainfall completeness must exceed $80\%$ of historical events (from real IMERG / AWS records).
> 3. Spatial cross-validation must verify zero spatial leakage (minimum distance $> 3.0	ext{ km}$).
> 4. Test set ROC-AUC must exceed the existing 40-sample baseline ($ROC	ext{-}AUC \ge 0.85$).
>
> If these conditions are not met, the system retains the validated baseline model and alerts the operator.
