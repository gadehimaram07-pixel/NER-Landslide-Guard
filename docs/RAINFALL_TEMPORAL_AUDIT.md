# NER-LandslideGuard: Rainfall Temporal Validity & Satellite Archive Audit

> **Audit Standard**: Strict Zero Fabrication & Temporal Causality.  
> **Audit Target**: NASA GPM IMERG Daily Precipitation Features (`rainfall_24h_mm`, `rainfall_72h_mm`, `rainfall_surround_max_mm`).  
> **Audit Date**: 2026-09-13  

---

## 1. Executive Scientific Verdict

> [!CAUTION]
> **AUDIT RESULT: FAIL on Rainfall Temporal Validity.**  
> The local repository contains NASA GPM IMERG NetCDF4 rasters for **only 4 days: July 1 to July 4, 2025**.  
> All 24 historical positive landslide events occurred between **2020 and 2024**, meaning **100% of positive landslide events predate the locally available IMERG NetCDF files**.  
> In `prepare_dataset.py`, historical dates outside July 2025 were assigned a heuristic seasonal fallback (`48.5 mm` for monsoon months, `12.0 mm` for dry months).  
> This created an artificial, deterministic separator (`48.5 mm` for all positives vs. `≤ 24.3 mm` for negatives), directly explaining the 100% Random Forest test accuracy.

---

## 2. IMERG Satellite Archive Inventory in Repository

The repository contains the following NetCDF4 files in `data/raw/imerg/` and `data/rainfall/imerg_final/`:

| NetCDF4 File | Target Date | Coverage | Status in Repo |
| :--- | :---: | :---: | :--- |
| `IMERG_20250701.nc4` | 2025-07-01 | Sikkim Bounding Box (0.1° resolution) | Present (32.7 KB) |
| `IMERG_20250702.nc4` | 2025-07-02 | Sikkim Bounding Box (0.1° resolution) | Present (32.7 KB) |
| `IMERG_20250703.nc4` | 2025-07-03 | Sikkim Bounding Box (0.1° resolution) | Present (32.7 KB) |
| `IMERG_20250704.nc4` | 2025-07-04 | Sikkim Bounding Box (0.1° resolution) | Present (32.7 KB) |

**Archive Date Range**: `2025-07-01` to `2025-07-04` (4 calendar days).

---

## 3. Positive Landslide Event Dates vs. IMERG Archive

Every recorded landslide event was audited against the available IMERG archive:

| Sample / Event ID | Event Date | Location | Predates Local IMERG? | Local NetCDF Available? | Assigned Rainfall (24h / 72h) | Data Pedigree |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `ISRO-SKM-001` | `2020-07-10` | Ranipool NH-10 | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-002` | `2021-08-14` | Mangan-Dikchu Axis | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-003` | `2022-06-18` | Singtam Cut Slope | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-004` | `2023-10-04` | Burtuk Highway Scarp | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-005` | `2024-07-02` | Mile 9 Ranipool Choke | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-006` | `2020-09-22` | Tadong Valley Slope | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-007` | `2021-07-28` | Namchi-Jorethang Road | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-008` | `2022-08-05` | Pelling Hillside Escarpment | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-009` | `2023-06-29` | Chungthang Road Cutting | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-010` | `2024-06-12` | Rangpo Border Choke Point | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-011` | `2020-08-11` | Deorali Ridge Slip | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-012` | `2021-09-02` | Phodong Monastery Axis | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-013` | `2022-07-19` | Ravangla Ridge Road | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-014` | `2023-07-14` | Ranka Valley Toe Scour | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-015` | `2024-07-20` | Kabi Lungchok Cutting | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-016` | `2021-06-25` | Ranipool Bridge East | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-017` | `2022-09-15` | Singhik Viewpoint Slope | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-018` | `2023-08-22` | Majhitar Industrial Cut | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-019` | `2020-07-04` | Temi Tea Slope | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `ISRO-SKM-020` | `2024-07-01` | Ranipool Borehole-1 Axis | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `GLC_IND_002` | `2021-08-14` | Mangan district flash mudslide on hill road | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `GLC_IND_003` | `2022-06-18` | Singtam debris flow scouring highway culvert | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `GLC_IND_004` | `2023-10-04` | Teesta river valley catastrophic slope collapse | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |
| `GLC_IND_005` | `2024-07-02` | Dikchu road rock detachment | **YES** (by 1-5 yrs) | **NO** | `48.50 mm / 106.70 mm` | Heuristic Seasonal Monsoon Proxy |

---

## 4. Background Reference Samples vs. IMERG Archive

| Sample ID | Date | District | Local NetCDF Available? | Assigned Rainfall (24h / 72h) | Data Pedigree |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `NON-LANDSLIDE-BG-001` | `2020-11-15` | South Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-002` | `2021-01-20` | South Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-003` | `2022-03-10` | South Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-004` | `2023-04-05` | South Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-005` | `2024-02-18` | South Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-006` | `2025-07-02` | South Sikkim | **YES** (`IMERG_20250702.nc4`) | *Extracted pixel value* | **Authentic IMERG Observation** |
| `NON-LANDSLIDE-BG-007` | `2020-11-15` | East Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-008` | `2021-01-20` | East Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-009` | `2022-03-10` | East Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-010` | `2023-04-05` | East Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-011` | `2024-02-18` | East Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-012` | `2025-07-02` | East Sikkim | **YES** (`IMERG_20250702.nc4`) | *Extracted pixel value* | **Authentic IMERG Observation** |
| `NON-LANDSLIDE-BG-013` | `2020-11-15` | West Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-014` | `2021-01-20` | West Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-015` | `2022-03-10` | West Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-016` | `2023-04-05` | West Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-017` | `2024-02-18` | West Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-018` | `2025-07-02` | West Sikkim | **YES** (`IMERG_20250702.nc4`) | *Extracted pixel value* | **Authentic IMERG Observation** |
| `NON-LANDSLIDE-BG-019` | `2020-11-15` | North Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-020` | `2021-01-20` | North Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-021` | `2022-03-10` | North Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-022` | `2023-04-05` | North Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-023` | `2024-02-18` | North Sikkim | **NO** | `12.00 mm / 26.40 mm` | Heuristic Dry Season Proxy |
| `NON-LANDSLIDE-BG-024` | `2025-07-02` | North Sikkim | **YES** (`IMERG_20250702.nc4`) | *Extracted pixel value* | **Authentic IMERG Observation** |

---

## 5. Mechanism of the 100% Accuracy Artifact

An inspection of the dataset reveals that:
1. **All 24 positive landslide events** were assigned `rainfall_24h_mm = 48.50 mm` because all events occurred during monsoon months (June-October).
2. **20 out of 24 negative background samples** were assigned dates during dry/winter months (November, January, March, April, February) and received `rainfall_24h_mm = 12.00 mm`.
3. **4 out of 24 negative background samples** had dates in July 2025 and extracted true IMERG values ranging from `4.11 mm` to `24.26 mm`.

```
Class 1 (Landslides):   rainfall_24h_mm = 48.50 mm (min=48.50, max=48.50, std=0.00)
Class 0 (Background):   rainfall_24h_mm <= 24.26 mm (min=4.11, max=24.26, mean=12.39)
```

Because there is **zero overlap** between Class 1 and Class 0 along the `rainfall_24h_mm` axis, any decision tree can achieve perfect separation on a single split (`rainfall_24h_mm > 36.38 mm`). This explains why:
- `rainfall_24h_mm` received the highest Gini importance (**23.19%**).
- `rainfall_surround_max_mm` received the second highest Gini importance (**17.17%**).
- `rainfall_72h_mm` received the third highest Gini importance (**13.11%**).
- Random Forest achieved 100.0% test accuracy on the held-out test block.

---

## 6. Recommendations & Corrective Actions

1. **Do NOT Claim True Satellite Rainfall Ingestion for Historical Events**: The system must state clearly that the historical training dataset used a *seasonal hydrologic monsoon proxy* due to the 4-day limitation of the local IMERG sample archive.
2. **Future Retraining Requirement (NASA Earthdata GES DISC)**: Download the actual 2020-2024 daily IMERG V07B HDF5/NetCDF files for the 24 event dates from NASA Earthdata to replace the seasonal proxy with true antecedent satellite precipitation.
3. **Immediate Model Reporting**: Clearly document this in `docs/DATASET_REPORT.md` and `docs/DATA_LIMITATIONS.md` so that no SIH judge is misled.
