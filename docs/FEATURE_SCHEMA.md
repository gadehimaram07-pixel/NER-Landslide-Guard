# Feature Schema & Geotechnical Data Dictionary
## NER-LandslideGuard: Expanded Geospatial Feature Matrix

> [!NOTE]
> **CANONICAL 16-FEATURE MATRIX (Master Catalog V3.1 - 620 Samples)**  
> This schema documents the 16 geotechnical, topographic, meteorological, and land-cover features consumed by the Random Forest and XGBoost models in `NER-LandslideGuard`. Soil properties represent district-level pedological profiles (ISRIC SoilGrids 2.0), rainfall is derived from satellite precipitation records, and terrain derivatives are computed from 30m SRTM DEM.

**Document Version**: 3.1.0  
**Audit Standard**: Exhaustive Multi-Source Feature Specification  
**Geographic Target**: Northeast India (7 States, EPSG:4326)  
**Publication Date**: September 2026  

---

## 1. Overview

The machine learning pipeline of `NER-LandslideGuard` ingests multi-source environmental, topographic, pedological, hydrological, and land-use indicators to predict landslide initiation hazard. Every feature in the matrix has a defined physical unit, an authentic data source, an explicit mathematical calculation, a domain meaning, and a scientific justification.

Under our scientific transparency policy:
- Canonical features are derived from public remote sensing products and regional geotechnical standards.
- Land-cover categories are encoded as binary indicators (`lc_tree_cover`, `lc_builtup`).
- Sentinel-1 InSAR Line-of-Sight deformation remains marked `[SIMULATED / PROTOTYPE FEED]` in telemetry until production SAR interferometry ingestion is operational.

---

## 2. Complete Feature Dictionary

### A. Topographic Features (Source: USGS / NASA SRTM 1 Arc-Second DEM)

#### 1. `elevation_m`
- **Unit**: Meters above mean sea level ($	ext{m}$)
- **Source**: USGS/NASA SRTM 30m Digital Elevation Model
- **Calculation**: Bi-linear interpolation of nearest 30m DEM grid cells at point coordinates.
- **Meaning**: Ground surface height above WGS84 datum.
- **Why It Matters**: Controls mountain climatic zones, temperature lapse rates, freeze-thaw weathering in the periglacial zone ($>2,500	ext{ m}$), and orographic precipitation enhancement along Himalayan ridges.

#### 2. `slope_deg`
- **Unit**: Degrees ($^\circ$, range: $0^\circ - 90^\circ$)
- **Source**: SRTM 30m DEM
- **Calculation**: Horn finite-difference gradient:
  $$	ext{Slope} = rctan\left(\sqrt{\left(rac{\partial z}{\partial x}ight)^2 + \left(rac{\partial z}{\partial y}ight)^2}ight)$$
- **Meaning**: Maximum rate of change in elevation between adjacent cells.
- **Why It Matters**: The fundamental driving force in geotechnical stability. Gravitational shear stress along the slip plane is directly proportional to $\sin eta \cos eta$. Slopes exceeding the internal friction angle ($\phi' pprox 30^\circ - 35^\circ$) are intrinsically prone to failure.

#### 3. `aspect_deg`
- **Unit**: Degrees azimuth ($0^\circ - 360^\circ$, clockwise from North)
- **Source**: SRTM 30m DEM
- **Calculation**: Downslope azimuth normal:
  $$	ext{Aspect} = 	ext{mod}\left(180 + rctan2\left(rac{\partial z}{\partial y}, -rac{\partial z}{\partial x}ight), 360ight)$$
- **Meaning**: Compass direction that the mountain slope faces.
- **Why It Matters**: South- and southwest-facing slopes in Sikkim receive direct exposure to moisture-laden Indian Summer Monsoon winds from the Bay of Bengal, resulting in exponentially higher cumulative rainfall and chemical weathering.

#### 4. `terrain_ruggedness_index` (TRI)
- **Unit**: Meters ($	ext{m}$)
- **Source**: SRTM 30m DEM
- **Calculation**: Riley et al. (1999) 3x3 moving window formula:
  $$	ext{TRI} = \sqrt{\sum_{i=1}^8 (z_i - z_0)^2}$$
- **Meaning**: Local topographic heterogeneity and elevation variance among 8 neighboring cells.
- **Why It Matters**: High TRI indicates sharp structural breaks-of-slope, rocky escarpments, ravines, and historical headscarps where tension crack initiation is concentrated.

---

### B. Hydrological & Precipitation Features (Source: NASA GPM IMERG V07B)

#### 5. `rainfall_24h_mm`
- **Unit**: Millimeters ($	ext{mm}$)
- **Source**: NASA Global Precipitation Measurement (GPM) IMERG Final Calibrated Daily (NetCDF4)
- **Calculation**: Accumulated calibrated precipitation over the 24 hours preceding the event date.
- **Meaning**: Immediate storm intensity.
- **Why It Matters**: High-intensity rainfall triggers rapid transient saturation, filling macropores and generating severe positive pore-water pressure ($u$), which abruptly eliminates effective friction along shallow planar surfaces.

#### 6. `rainfall_72h_mm`
- **Unit**: Millimeters ($	ext{mm}$)
- **Source**: NASA GPM IMERG V07B (NetCDF4)
- **Calculation**: 3-day cumulative precipitation accumulation.
- **Meaning**: Multi-day antecedent storm duration.
- **Why It Matters**: Prolonged rainfall saturates deep clay-rich colluvial matrices, elevates the regional groundwater table ($h_w$), and induces rotational slumps and deep-seated debris flows.

#### 7. `rainfall_surround_max_mm`
- **Unit**: Millimeters ($	ext{mm}$)
- **Source**: NASA GPM IMERG 0.1° grid
- **Calculation**: Maximum precipitation observed across the 3x3 pixel kernel ($~30	ext{ km} 	imes 30	ext{ km}$) surrounding the sample.
- **Meaning**: Peak convective cloudburst intensity in the local catchment.
- **Why It Matters**: Mountain cloudbursts in the Eastern Himalayas often drop extreme precipitation on upstream ridge catchments, causing debris torrents down tributary gullies even when the valley station measures moderate rain.

---

### C. Soil Pedological Features (Source: ISRIC SoilGrids 2.0 at 0–30 cm Depth)

#### 8. `soil_clay_pct`
- **Unit**: Mass percentage ($\%$)
- **Source**: ISRIC SoilGrids 2.0 depth slice
- **Calculation**: Mass fraction of soil mineral particles $< 0.002	ext{ mm}$.
- **Meaning**: Fine-fraction clay mineral content.
- **Why It Matters**: Clay governs soil cohesion ($c'$), plasticity index, and shrink-swell capacity. Saturated clay layers act as slickensided slip surfaces during sustained rain.

#### 9. `soil_sand_pct`
- **Unit**: Mass percentage ($\%$)
- **Source**: ISRIC SoilGrids 2.0 depth slice
- **Calculation**: Mass fraction of soil mineral particles $0.05 - 2.0	ext{ mm}$.
- **Meaning**: Coarse granular mineral fraction.
- **Why It Matters**: High sand content increases internal friction angle ($\phi'$) and hydraulic conductivity ($k$), allowing rapid drainage but making loose debris prone to liquefaction under high-velocity water surge.

#### 10. `soil_silt_pct`
- **Unit**: Mass percentage ($\%$)
- **Source**: ISRIC SoilGrids 2.0 depth slice
- **Calculation**: Mass fraction of soil particles $0.002 - 0.05	ext{ mm}$.
- **Meaning**: Intermediate silt fraction.
- **Why It Matters**: Silt provides capillary cohesion when dry but rapidly loses shear strength and exhibits catastrophic liquefaction upon saturation, driving Himalayan mudflows.

#### 11. `soil_bulk_density`
- **Unit**: Grams per cubic centimeter ($	ext{g}/	ext{cm}^3$)
- **Source**: ISRIC SoilGrids 2.0
- **Calculation**: Dry mass of fine earth divided by in-situ volume ($	ext{bdod} / 100$).
- **Meaning**: Soil packing density and in-situ compaction.
- **Why It Matters**: Determines the total soil unit weight ($\gamma = ho_b \cdot g$), which directly dictates the gravitational driving surcharge acting on the slope scarp.

#### 12. `soil_ph`
- **Unit**: pH units ($-\log [H^+]$ in water)
- **Source**: ISRIC SoilGrids 2.0
- **Calculation**: Negative logarithm of hydrogen ion activity ($	ext{phh2o} / 10$).
- **Meaning**: Pedological acidity.
- **Why It Matters**: Strongly acidic soils ($	ext{pH} < 5.5$) in high-rainfall Himalayan zones correlate with intense leaching, loss of stabilizing cations, and accelerated weathering of mica-schist bedrock into saprolite.

#### 13. `soil_organic_carbon`
- **Unit**: Grams per kilogram ($	ext{g}/	ext{kg}$)
- **Source**: ISRIC SoilGrids 2.0
- **Calculation**: Organic carbon mass in fine earth fraction ($	ext{soc} / 10$).
- **Meaning**: Topsoil humic content and organic binding matter.
- **Why It Matters**: Organic carbon binds mineral aggregates together, increasing shear strength and water retention capacity in undisturbed forest soils.

---

### D. Land Cover Classification (Source: ESA WorldCover 2021 v200, 10m Resolution)

To avoid injecting subjective ordinal bias, land cover is represented using **mutually exclusive one-hot binary flags**:

#### 14. `lc_tree_cover`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 10)
- **Meaning**: Continuous forest or woodland canopy.
- **Why It Matters**: Tree roots provide mechanical anchoring (apparent root cohesion $\Delta c pprox 2 - 15	ext{ kPa}$) and canopy rainfall interception, providing a stabilizing buffer.

#### 15. `lc_shrubland`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 20)
- **Meaning**: Scrub and degraded woody vegetation.
- **Why It Matters**: Typical of disturbed slopes; shallow root depth provides limited shear reinforcement compared to mature forest.

#### 16. `lc_grassland`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 30)
- **Meaning**: Herbaceous pasture and alpine meadows.
- **Why It Matters**: Low shear resistance along the soil-bedrock interface; highly vulnerable to shallow planar slips during heavy downpours.

#### 17. `lc_cropland`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 40)
- **Meaning**: Agricultural terraces and cultivated fields.
- **Why It Matters**: Stepped terraces alter natural drainage, cause localized water ponding, and increase pore-water pressure along bench edges.

#### 18. `lc_builtup`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 50)
- **Meaning**: Roads, settlements, and engineered structures.
- **Why It Matters**: Man-made slope modifications (steep road-cut slopes along NH-10, inadequate culverts, and building surcharge loads) are the primary anthropogenic trigger of slope failure in Sikkim.

#### 19. `lc_sparse_vegetation`
- **Unit**: Binary indicator ($0	ext{ or }1$)
- **Source**: ESA WorldCover 2021 (Class 60)
- **Meaning**: Bare rock, scarp faces, and sparse scree.
- **Why It Matters**: High runoff coefficients and zero vegetative reinforcement; directly exposed to rainsplash erosion and rock detachment.
