# NER-LandslideGuard: Landslide Inventory Deduplication & Provenance Audit

> **Audit Target**: Raw Inventory Cross-Verification (20 ISRO records + 5 NASA GLC records = 25 raw records).  
> **Audit Date**: 2026-09-13  
> **Standard**: Strict Spatiotemporal Collision & Duplicate Identification.  

---

## 1. Inventory Summary

| Category | Count | Source File / Description |
| :--- | :---: | :--- |
| **Raw ISRO Records** | 20 | `data/raw/isro/isro_landslide_atlas_sikkim.csv` |
| **Raw NASA GLC Records** | 5 | `data/raw/nasa_glc/nasa_global_landslide_catalog.csv` |
| **Total Raw Records Ingested** | **25** | Combined ISRO NRSC Atlas + NASA Global Landslide Catalog |
| **Identified Duplicates** | **1** | Spatiotemporal collision (`GLC_IND_001` vs `ISRO-SKM-001`) |
| **Unique Verified Events** | **24** | Standardized into `data/processed/isro_inventory.csv` |

---

## 2. All 25 Raw Inventory Records

### A. ISRO Landslide Atlas of India (20 Records)

| Record ID | Date | Latitude (°N) | Longitude (°E) | District | Location | Type | Trigger |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| `ISRO-SKM-001` | `2020-07-10` | `27.3389` | `88.6065` | East Sikkim | Ranipool NH-10 | Debris Flow | Monsoon Cloudburst |
| `ISRO-SKM-002` | `2021-08-14` | `27.5020` | `88.5280` | North Sikkim | Mangan-Dikchu Axis | Translational Slide | Heavy Rain |
| `ISRO-SKM-003` | `2022-06-18` | `27.2340` | `88.4980` | East Sikkim | Singtam Cut Slope | Rotational Slump | Prolonged Downpour |
| `ISRO-SKM-004` | `2023-10-04` | `27.3620` | `88.6250` | East Sikkim | Burtuk Highway Scarp | Rockfall / Debris | LHOF Flash Flood |
| `ISRO-SKM-005` | `2024-07-02` | `27.3150` | `88.6020` | East Sikkim | Mile 9 Ranipool Choke | Mudslide | High Intensity Rain |
| `ISRO-SKM-006` | `2020-09-22` | `27.3450` | `88.6180` | East Sikkim | Tadong Valley Slope | Tension Crack Failure | Monsoon Infiltration |
| `ISRO-SKM-007` | `2021-07-28` | `27.2750` | `88.3540` | South Sikkim | Namchi-Jorethang Road | Roadbed Scour Slide | Torrential Runoff |
| `ISRO-SKM-008` | `2022-08-05` | `27.2910` | `88.2420` | West Sikkim | Pelling Hillside Escarpment | Debris Avalanche | Saturated Creep |
| `ISRO-SKM-009` | `2023-06-29` | `27.5850` | `88.6480` | North Sikkim | Chungthang Road Cutting | Massive Rockslide | Cloudburst |
| `ISRO-SKM-010` | `2024-06-12` | `27.1850` | `88.5120` | East Sikkim | Rangpo Border Choke Point | Colluvial Mudflow | Pre-monsoon Storm |
| `ISRO-SKM-011` | `2020-08-11` | `27.3280` | `88.5950` | East Sikkim | Deorali Ridge Slip | Rotational Slump | Drainage Overflow |
| `ISRO-SKM-012` | `2021-09-02` | `27.4120` | `88.5320` | North Sikkim | Phodong Monastery Axis | Debris Slide | Multi-Day Monsoon |
| `ISRO-SKM-013` | `2022-07-19` | `27.2150` | `88.4210` | South Sikkim | Ravangla Ridge Road | Retaining Wall Failure | Hydrostatic Surcharge |
| `ISRO-SKM-014` | `2023-07-14` | `27.3520` | `88.5710` | East Sikkim | Ranka Valley Toe Scour | Toe Erosion Slide | River Swelling |
| `ISRO-SKM-015` | `2024-07-20` | `27.4780` | `88.5920` | North Sikkim | Kabi Lungchok Cutting | Rockfall & Mudflow | Heavy Monsoon |
| `ISRO-SKM-016` | `2021-06-25` | `27.3320` | `88.6110` | East Sikkim | Ranipool Bridge East | Slope Failure | Culvert Choke |
| `ISRO-SKM-017` | `2022-09-15` | `27.5250` | `88.6100` | North Sikkim | Singhik Viewpoint Slope | Debris Flow | Continuous Rain |
| `ISRO-SKM-018` | `2023-08-22` | `27.2550` | `88.5250` | East Sikkim | Majhitar Industrial Cut | Wedge Failure | Pore Pressure Spike |
| `ISRO-SKM-019` | `2020-07-04` | `27.3020` | `88.5410` | South Sikkim | Temi Tea Slope | Surface Creep | Rainfall Infiltration |
| `ISRO-SKM-020` | `2024-07-01` | `27.3392` | `88.6070` | East Sikkim | Ranipool Borehole-1 Axis | Active Mudslide | Cloudburst |

### B. NASA Global Landslide Catalog (5 Records)

| Event ID | Date | Latitude (°N) | Longitude (°E) | Hazard Type | Trigger | Fatalities | Description |
| :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| `GLC_IND_001` | `2020-07-10` | `27.3389` | `88.6065` | Landslide | Rain | 0 | Gangtok Ranipool slope failure blocking NH-10 |
| `GLC_IND_002` | `2021-08-14` | `27.3500` | `88.6200` | Mudslide | Downpour | 2 | Mangan district flash mudslide on hill road |
| `GLC_IND_003` | `2022-06-18` | `27.2800` | `88.5800` | Complex | Continuous Rain | 0 | Singtam debris flow scouring highway culvert |
| `GLC_IND_004` | `2023-10-04` | `27.4200` | `88.5500` | Debris Flow | LHOF Flood | 14 | Teesta river valley catastrophic slope collapse |
| `GLC_IND_005` | `2024-07-02` | `27.3100` | `88.6100` | Rockfall | Heavy Monsoon | 0 | Dikchu road rock detachment |

---

## 3. Duplicate Detection & Cross-Catalog Analysis

Every NASA GLC event was matched against all 20 ISRO events using spatial distance and event dates:

| NASA GLC ID | Date | Coordinates | Closest ISRO Event | ISRO Date | Spatial Distance | Temporal Match? | Status / Action |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| `GLC_IND_001` | `2020-07-10` | `(27.3389, 88.6065)` | `ISRO-SKM-001` (Ranipool NH-10) | `2020-07-10` | **0.000 km** | `True` | **REMOVED AS DUPLICATE** |
| `GLC_IND_002` | `2021-08-14` | `(27.3500, 88.6200)` | `ISRO-SKM-006` (Tadong Valley Slope) | `2020-09-22` | **0.590 km** | `False` | **RETAINED AS UNIQUE** |
| `GLC_IND_003` | `2022-06-18` | `(27.2800, 88.5800)` | `ISRO-SKM-005` (Mile 9 Ranipool Chok) | `2024-07-02` | **4.458 km** | `False` | **RETAINED AS UNIQUE** |
| `GLC_IND_004` | `2023-10-04` | `(27.4200, 88.5500)` | `ISRO-SKM-012` (Phodong Monastery Ax) | `2021-09-02` | **1.987 km** | `False` | **RETAINED AS UNIQUE** |
| `GLC_IND_005` | `2024-07-02` | `(27.3100, 88.6100)` | `ISRO-SKM-005` (Mile 9 Ranipool Chok) | `2024-07-02` | **0.966 km** | `True` | **RETAINED (Cluster Candidate)** |

---

## 4. Removed Duplicate Details

### Duplicate #1: `GLC_IND_001` (Removed)
- **Primary Record**: `ISRO-SKM-001` (ISRO Landslide Atlas)
  - Date: `2020-07-10`
  - Coordinates: `(27.3389°N, 88.6065°E)`
  - Location: `Ranipool NH-10`
- **Duplicate Record**: `GLC_IND_001` (NASA Global Landslide Catalog)
  - Date: `2020-07-10`
  - Coordinates: `(27.3389°N, 88.6065°E)`
  - Description: `Gangtok Ranipool slope failure blocking NH-10`
- **Inter-Record Distance**: **`0.000 km` (Identical GPS coordinates to 4 decimal places)**
- **Resolution**: `GLC_IND_001` was purged from the master inventory to prevent duplicate weighting and artificial model inflation.

---

## 5. Notable Spatiotemporal Clusters (Retained as Distinct Events)

1. **Ranipool Recurrence (`ISRO-SKM-001` vs `ISRO-SKM-020`)**:
   - `ISRO-SKM-001`: `(27.3389°N, 88.6065°E)` on `2020-07-10`
   - `ISRO-SKM-020`: `(27.3392°N, 88.6070°E)` on `2024-07-01`
   - Distance: **`60 meters`**. These represent distinct temporal reactivation events occurring 4 years apart at the same persistent tectonic slope toe.

2. **Ranipool / Dikchu Axis on 2024-07-02 (`ISRO-SKM-005` vs `GLC_IND_005`)**:
   - `ISRO-SKM-005`: `(27.3150°N, 88.6020°E)` on `2024-07-02` (`Mile 9 Ranipool Choke`)
   - `GLC_IND_005`: `(27.3100°N, 88.6100°E)` on `2024-07-02` (`Dikchu road rock detachment`)
   - Distance: **`0.966 km`**. Occurred on the same date within 1 km, representing a regional monsoon storm trigger causing multi-point failures along the highway corridor.
