# NER-LandslideGuard: Comprehensive 48-Sample Scientific Audit

> [!WARNING]
> **ARCHIVED PROTOTYPE REPORT (Historical Milestone: N=48)**  
> This audit records an earlier prototype iteration of 48 samples. For the current 620-sample master catalog and authoritative evaluation metrics, refer to [EXPANDED_DATASET_REPORT.md](EXPANDED_DATASET_REPORT.md) and `data/models/model_metrics.json`.

> **Audit Date**: 2026-09-13  
> **Audit Objective**: Complete line-by-line inspection of the historical 48-sample prototype dataset.  
> **Standard**: Geospatial Traceability & Historical Audit Record.  

---

## Executive Summary of Dataset Audit

| Metric | Count | Verified Scientific Status |
| :--- | :---: | :--- |
| **Total Samples** | 48 | 24 Positive Landslide Events, 24 Background Reference Points |
| **Training Set** | 19 | 13 Positive (54.2%), 6 Negative (25.0%) |
| **Validation Set** | 17 | 5 Positive (20.8%), 12 Negative (50.0%) |
| **Held-Out Test Set** | 12 | 6 Positive (25.0%), 6 Negative (25.0%) |
| **Elevation & Slope Source** | 48 / 48 | USGS/NASA SRTM 1 Arc-Second (30m DEM) |
| **Soil Properties Source** | 48 / 48 | ISRIC SoilGrids 2.0 (District Pedological Profile) |
| **Land Cover Source** | 48 / 48 | Heuristic classification based on terrain slope & geomorphic position |
| **Rainfall NetCDF4 Overlap** | 4 / 48 (8.3%) | Only 4 background points overlap with local July 2025 IMERG NetCDF archive |
| **Rainfall Heuristic Fill** | 44 / 48 (91.7%) | Historical events assigned seasonal monsoon baseline (48.5 mm) due to lack of historical NetCDFs |

---

## Detailed Sample Inventory (All 48 Samples)

### Sample #01: `ISRO-SKM-001` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.33890°N`, Longitude `88.60650°E`
- **District**: `East Sikkim`
- **Event Date**: `2020-07-10`
- **Topography (SRTM 30m)**:
  - Elevation: `1981.6 m`
  - Slope Angle: `4.0°`
  - Aspect Azimuth: `293.5°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #02: `ISRO-SKM-004` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.36200°N`, Longitude `88.62500°E`
- **District**: `East Sikkim`
- **Event Date**: `2023-10-04`
- **Topography (SRTM 30m)**:
  - Elevation: `2124.5 m`
  - Slope Angle: `2.34°`
  - Aspect Azimuth: `258.5°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `1`

### Sample #03: `ISRO-SKM-005` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.31500°N`, Longitude `88.60200°E`
- **District**: `East Sikkim`
- **Event Date**: `2024-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `1788.5 m`
  - Slope Angle: `5.78°`
  - Aspect Azimuth: `313.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #04: `ISRO-SKM-006` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.34500°N`, Longitude `88.61800°E`
- **District**: `East Sikkim`
- **Event Date**: `2020-09-22`
- **Topography (SRTM 30m)**:
  - Elevation: `2045.2 m`
  - Slope Angle: `2.77°`
  - Aspect Azimuth: `283.3°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #05: `ISRO-SKM-007` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.27500°N`, Longitude `88.35400°E`
- **District**: `South Sikkim`
- **Event Date**: `2021-07-28`
- **Topography (SRTM 30m)**:
  - Elevation: `344.1 m`
  - Slope Angle: `4.73°`
  - Aspect Azimuth: `291.7°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #06: `ISRO-SKM-011` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.32800°N`, Longitude `88.59500°E`
- **District**: `East Sikkim`
- **Event Date**: `2020-08-11`
- **Topography (SRTM 30m)**:
  - Elevation: `1866.5 m`
  - Slope Angle: `5.45°`
  - Aspect Azimuth: `302.6°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #07: `ISRO-SKM-014` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.35200°N`, Longitude `88.57100°E`
- **District**: `East Sikkim`
- **Event Date**: `2023-07-14`
- **Topography (SRTM 30m)**:
  - Elevation: `2014.8 m`
  - Slope Angle: `6.2°`
  - Aspect Azimuth: `287.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #08: `ISRO-SKM-016` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.33200°N`, Longitude `88.61100°E`
- **District**: `East Sikkim`
- **Event Date**: `2021-06-25`
- **Topography (SRTM 30m)**:
  - Elevation: `1955.4 m`
  - Slope Angle: `3.8°`
  - Aspect Azimuth: `300.9°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #09: `ISRO-SKM-019` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.30200°N`, Longitude `88.54100°E`
- **District**: `South Sikkim`
- **Event Date**: `2020-07-04`
- **Topography (SRTM 30m)**:
  - Elevation: `1081.5 m`
  - Slope Angle: `9.28°`
  - Aspect Azimuth: `304.2°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #10: `ISRO-SKM-020` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.33920°N`, Longitude `88.60700°E`
- **District**: `East Sikkim`
- **Event Date**: `2024-07-01`
- **Topography (SRTM 30m)**:
  - Elevation: `1989.6 m`
  - Slope Angle: `3.73°`
  - Aspect Azimuth: `293.4°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `1`

### Sample #11: `GLC_IND_002` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.35000°N`, Longitude `88.62000°E`
- **District**: `North Sikkim`
- **Event Date**: `2021-08-14`
- **Topography (SRTM 30m)**:
  - Elevation: `2064.4 m`
  - Slope Angle: `2.52°`
  - Aspect Azimuth: `277.6°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #12: `GLC_IND_003` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.28000°N`, Longitude `88.58000°E`
- **District**: `East Sikkim`
- **Event Date**: `2022-06-18`
- **Topography (SRTM 30m)**:
  - Elevation: `1228.3 m`
  - Slope Angle: `8.69°`
  - Aspect Azimuth: `325.3°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #13: `GLC_IND_005` (POSITIVE (Landslide Event))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.31000°N`, Longitude `88.61000°E`
- **District**: `East Sikkim`
- **Event Date**: `2024-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `1799.8 m`
  - Slope Angle: `5.37°`
  - Aspect Azimuth: `317.3°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #14: `NON-LANDSLIDE-BG-013` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.34970°N`, Longitude `88.45170°E`
- **District**: `West Sikkim`
- **Event Date**: `2020-11-15`
- **Topography (SRTM 30m)**:
  - Elevation: `1019.5 m`
  - Slope Angle: `5.91°`
  - Aspect Azimuth: `323.4°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #15: `NON-LANDSLIDE-BG-014` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.34820°N`, Longitude `88.45010°E`
- **District**: `West Sikkim`
- **Event Date**: `2021-01-20`
- **Topography (SRTM 30m)**:
  - Elevation: `995.3 m`
  - Slope Angle: `5.64°`
  - Aspect Azimuth: `324.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #16: `NON-LANDSLIDE-BG-015` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.35060°N`, Longitude `88.44730°E`
- **District**: `West Sikkim`
- **Event Date**: `2022-03-10`
- **Topography (SRTM 30m)**:
  - Elevation: `972.0 m`
  - Slope Angle: `5.36°`
  - Aspect Azimuth: `324.8°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #17: `NON-LANDSLIDE-BG-016` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.35060°N`, Longitude `88.44800°E`
- **District**: `West Sikkim`
- **Event Date**: `2023-04-05`
- **Topography (SRTM 30m)**:
  - Elevation: `995.3 m`
  - Slope Angle: `5.64°`
  - Aspect Azimuth: `324.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #18: `NON-LANDSLIDE-BG-017` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.34740°N`, Longitude `88.45270°E`
- **District**: `West Sikkim`
- **Event Date**: `2024-02-18`
- **Topography (SRTM 30m)**:
  - Elevation: `996.6 m`
  - Slope Angle: `5.71°`
  - Aspect Azimuth: `321.3°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #19: `NON-LANDSLIDE-BG-018` (NEGATIVE (Background Reference))
- **Split**: `TRAIN`
- **Coordinates**: Latitude `27.35280°N`, Longitude `88.45190°E`
- **District**: `West Sikkim`
- **Event Date**: `2025-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `1042.2 m`
  - Slope Angle: `6.11°`
  - Aspect Azimuth: `325.2°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `23.06 mm`
  - 72-Hour Cumulative Rainfall: `50.73 mm`
  - Surrounding Peak Grid Rainfall: `27.43 mm`
  - Rainfall Extraction Status: **Direct NASA IMERG NetCDF4 Pixel Extraction**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #20: `ISRO-SKM-003` (POSITIVE (Landslide Event))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.23400°N`, Longitude `88.49800°E`
- **District**: `East Sikkim`
- **Event Date**: `2022-06-18`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #21: `ISRO-SKM-008` (POSITIVE (Landslide Event))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.29100°N`, Longitude `88.24200°E`
- **District**: `West Sikkim`
- **Event Date**: `2022-08-05`
- **Topography (SRTM 30m)**:
  - Elevation: `1005.1 m`
  - Slope Angle: `9.33°`
  - Aspect Azimuth: `222.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `24.0%` | Sand: `48.0%` | Silt: `28.0%`
  - Bulk Density: `1.39 cg/cm³` | pH: `5.2` | SOC: `22.0 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #22: `ISRO-SKM-010` (POSITIVE (Landslide Event))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.18500°N`, Longitude `88.51200°E`
- **District**: `East Sikkim`
- **Event Date**: `2024-06-12`
- **Topography (SRTM 30m)**:
  - Elevation: `403.4 m`
  - Slope Angle: `5.76°`
  - Aspect Azimuth: `25.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #23: `ISRO-SKM-013` (POSITIVE (Landslide Event))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.21500°N`, Longitude `88.42100°E`
- **District**: `South Sikkim`
- **Event Date**: `2022-07-19`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #24: `ISRO-SKM-018` (POSITIVE (Landslide Event))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.25500°N`, Longitude `88.52500°E`
- **District**: `East Sikkim`
- **Event Date**: `2023-08-22`
- **Topography (SRTM 30m)**:
  - Elevation: `423.5 m`
  - Slope Angle: `5.01°`
  - Aspect Azimuth: `324.5°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #25: `NON-LANDSLIDE-BG-001` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.11920°N`, Longitude `88.52270°E`
- **District**: `South Sikkim`
- **Event Date**: `2020-11-15`
- **Topography (SRTM 30m)**:
  - Elevation: `719.5 m`
  - Slope Angle: `4.9°`
  - Aspect Azimuth: `357.4°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #26: `NON-LANDSLIDE-BG-002` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.12140°N`, Longitude `88.52060°E`
- **District**: `South Sikkim`
- **Event Date**: `2021-01-20`
- **Topography (SRTM 30m)**:
  - Elevation: `694.0 m`
  - Slope Angle: `5.18°`
  - Aspect Azimuth: `0.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #27: `NON-LANDSLIDE-BG-003` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.11790°N`, Longitude `88.51790°E`
- **District**: `South Sikkim`
- **Event Date**: `2022-03-10`
- **Topography (SRTM 30m)**:
  - Elevation: `665.9 m`
  - Slope Angle: `5.39°`
  - Aspect Azimuth: `358.2°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #28: `NON-LANDSLIDE-BG-004` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.11730°N`, Longitude `88.52220°E`
- **District**: `South Sikkim`
- **Event Date**: `2023-04-05`
- **Topography (SRTM 30m)**:
  - Elevation: `693.4 m`
  - Slope Angle: `5.15°`
  - Aspect Azimuth: `357.7°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #29: `NON-LANDSLIDE-BG-005` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.12060°N`, Longitude `88.52120°E`
- **District**: `South Sikkim`
- **Event Date**: `2024-02-18`
- **Topography (SRTM 30m)**:
  - Elevation: `694.0 m`
  - Slope Angle: `5.18°`
  - Aspect Azimuth: `0.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #30: `NON-LANDSLIDE-BG-006` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.11710°N`, Longitude `88.52280°E`
- **District**: `South Sikkim`
- **Event Date**: `2025-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `719.5 m`
  - Slope Angle: `4.9°`
  - Aspect Azimuth: `357.4°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `4.11 mm`
  - 72-Hour Cumulative Rainfall: `9.04 mm`
  - Surrounding Peak Grid Rainfall: `27.43 mm`
  - Rainfall Extraction Status: **Direct NASA IMERG NetCDF4 Pixel Extraction**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `34.1%` | Sand: `32.4%` | Silt: `33.5%`
  - Bulk Density: `1.28 cg/cm³` | pH: `5.8` | SOC: `29.1 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #31: `NON-LANDSLIDE-BG-007` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.20200°N`, Longitude `88.47830°E`
- **District**: `East Sikkim`
- **Event Date**: `2020-11-15`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #32: `NON-LANDSLIDE-BG-008` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.19810°N`, Longitude `88.47810°E`
- **District**: `East Sikkim`
- **Event Date**: `2021-01-20`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #33: `NON-LANDSLIDE-BG-009` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.19880°N`, Longitude `88.48010°E`
- **District**: `East Sikkim`
- **Event Date**: `2022-03-10`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #34: `NON-LANDSLIDE-BG-010` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.19960°N`, Longitude `88.47870°E`
- **District**: `East Sikkim`
- **Event Date**: `2023-04-05`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #35: `NON-LANDSLIDE-BG-011` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.20070°N`, Longitude `88.47780°E`
- **District**: `East Sikkim`
- **Event Date**: `2024-02-18`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #36: `NON-LANDSLIDE-BG-012` (NEGATIVE (Background Reference))
- **Split**: `VALIDATION`
- **Coordinates**: Latitude `27.19880°N`, Longitude `88.47920°E`
- **District**: `East Sikkim`
- **Event Date**: `2025-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `280.0 m`
  - Slope Angle: `0.0°`
  - Aspect Azimuth: `0.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `5.96 mm`
  - 72-Hour Cumulative Rainfall: `13.11 mm`
  - Surrounding Peak Grid Rainfall: `27.43 mm`
  - Rainfall Extraction Status: **Direct NASA IMERG NetCDF4 Pixel Extraction**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `0` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #37: `ISRO-SKM-002` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.50200°N`, Longitude `88.52800°E`
- **District**: `North Sikkim`
- **Event Date**: `2021-08-14`
- **Topography (SRTM 30m)**:
  - Elevation: `1711.1 m`
  - Slope Angle: `5.34°`
  - Aspect Azimuth: `35.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #38: `ISRO-SKM-009` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.58500°N`, Longitude `88.64800°E`
- **District**: `North Sikkim`
- **Event Date**: `2023-06-29`
- **Topography (SRTM 30m)**:
  - Elevation: `2314.6 m`
  - Slope Angle: `3.86°`
  - Aspect Azimuth: `86.9°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #39: `ISRO-SKM-012` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.41200°N`, Longitude `88.53200°E`
- **District**: `North Sikkim`
- **Event Date**: `2021-09-02`
- **Topography (SRTM 30m)**:
  - Elevation: `2295.9 m`
  - Slope Angle: `4.08°`
  - Aspect Azimuth: `357.4°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #40: `ISRO-SKM-015` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.47800°N`, Longitude `88.59200°E`
- **District**: `North Sikkim`
- **Event Date**: `2024-07-20`
- **Topography (SRTM 30m)**:
  - Elevation: `2494.7 m`
  - Slope Angle: `5.32°`
  - Aspect Azimuth: `11.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #41: `ISRO-SKM-017` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.52500°N`, Longitude `88.61000°E`
- **District**: `North Sikkim`
- **Event Date**: `2022-09-15`
- **Topography (SRTM 30m)**:
  - Elevation: `2551.6 m`
  - Slope Angle: `6.04°`
  - Aspect Azimuth: `20.9°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #42: `GLC_IND_004` (POSITIVE (Landslide Event))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.42000°N`, Longitude `88.55000°E`
- **District**: `East Sikkim`
- **Event Date**: `2023-10-04`
- **Topography (SRTM 30m)**:
  - Elevation: `2396.3 m`
  - Slope Angle: `2.56°`
  - Aspect Azimuth: `7.6°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `48.5 mm`
  - 72-Hour Cumulative Rainfall: `106.7 mm`
  - Surrounding Peak Grid Rainfall: `65.48 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `28.5%` | Sand: `44.2%` | Silt: `27.3%`
  - Bulk Density: `1.34 cg/cm³` | pH: `5.4` | SOC: `24.2 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #43: `NON-LANDSLIDE-BG-019` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.44880°N`, Longitude `88.47760°E`
- **District**: `North Sikkim`
- **Event Date**: `2020-11-15`
- **Topography (SRTM 30m)**:
  - Elevation: `1724.4 m`
  - Slope Angle: `4.66°`
  - Aspect Azimuth: `14.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #44: `NON-LANDSLIDE-BG-020` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.45110°N`, Longitude `88.47960°E`
- **District**: `North Sikkim`
- **Event Date**: `2021-01-20`
- **Topography (SRTM 30m)**:
  - Elevation: `1724.4 m`
  - Slope Angle: `4.66°`
  - Aspect Azimuth: `14.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #45: `NON-LANDSLIDE-BG-021` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.44770°N`, Longitude `88.48000°E`
- **District**: `North Sikkim`
- **Event Date**: `2022-03-10`
- **Topography (SRTM 30m)**:
  - Elevation: `1731.1 m`
  - Slope Angle: `4.93°`
  - Aspect Azimuth: `11.1°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #46: `NON-LANDSLIDE-BG-022` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.44720°N`, Longitude `88.48250°E`
- **District**: `North Sikkim`
- **Event Date**: `2023-04-05`
- **Topography (SRTM 30m)**:
  - Elevation: `1756.4 m`
  - Slope Angle: `5.03°`
  - Aspect Azimuth: `13.8°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #47: `NON-LANDSLIDE-BG-023` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.44860°N`, Longitude `88.48100°E`
- **District**: `North Sikkim`
- **Event Date**: `2024-02-18`
- **Topography (SRTM 30m)**:
  - Elevation: `1748.1 m`
  - Slope Angle: `4.79°`
  - Aspect Azimuth: `16.7°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `12.0 mm`
  - 72-Hour Cumulative Rainfall: `26.4 mm`
  - Surrounding Peak Grid Rainfall: `16.2 mm`
  - Rainfall Extraction Status: **Heuristic Seasonal Monsoon Estimate (Historical NetCDF Missing in Local Repo)**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`

### Sample #48: `NON-LANDSLIDE-BG-024` (NEGATIVE (Background Reference))
- **Split**: `TEST`
- **Coordinates**: Latitude `27.44890°N`, Longitude `88.48010°E`
- **District**: `North Sikkim`
- **Event Date**: `2025-07-02`
- **Topography (SRTM 30m)**:
  - Elevation: `1724.4 m`
  - Slope Angle: `4.66°`
  - Aspect Azimuth: `14.0°`
- **Precipitation Regime**:
  - 24-Hour Rainfall: `24.26 mm`
  - 72-Hour Cumulative Rainfall: `53.37 mm`
  - Surrounding Peak Grid Rainfall: `27.43 mm`
  - Rainfall Extraction Status: **Direct NASA IMERG NetCDF4 Pixel Extraction**
- **Pedology (ISRIC SoilGrids 2.0)**:
  - Clay: `18.2%` | Sand: `58.6%` | Silt: `23.2%`
  - Bulk Density: `1.48 cg/cm³` | pH: `5.1` | SOC: `18.5 dg/kg`
- **Land Cover Regime**:
  - Tree Cover: `1` | Shrubland: `0` | Grassland: `0`
  - Cropland: `0` | Builtup: `0` | Sparse Vegetation: `0`
