# The Machine Learning & Geotechnical Journey of NER-LandslideGuard
## Smart India Hackathon (SIH) Technical Presentation & Scientific Provenance

> [!WARNING]
> **ARCHIVED PROTOTYPE REPORT (Historical Prototype Milestone: N=40/48 Progression)**  
> This narrative describes earlier prototype phases. For the current 620-sample master catalog and authoritative evaluation metrics, refer to [EXPANDED_DATASET_REPORT.md](EXPANDED_DATASET_REPORT.md) and `data/models/model_metrics.json`.

**Document**: `docs/SIH_ML_STORY.md`  
**Edition**: Historical Prototype Architecture Guide  

---

## The Core Narrative

> [!IMPORTANT]
> *"Our initial 40-sample model was used to validate the end-to-end ML pipeline. We subsequently expanded the dataset using real landslide and environmental data and evaluate the resulting model using spatially/temporally defensible validation rather than relying only on random accuracy."*

In high-stakes disaster warning across the North Eastern Region (NER), **data quality and honest evaluation matter far more than inflated metrics on synthetic data**. Many academic projects claim 99% accuracy by training on artificially generated points with random train/test splits that leak spatial autocorrelation. 

`NER-LandslideGuard` takes the rigorous path: every landslide coordinate is an authentic disaster recorded by national agencies (ISRO & NASA), every non-landslide background reference is verified on a 30m digital elevation model with a $>3.5\text{ km}$ buffer, and evaluation is conducted on completely separate geographical blocks.

---

## The 8-Phase Progression

```
+-------------------------------------------------------------------------+
| PHASE 1: Deterministic Physics Baseline (BIS IS 14458 Limit-Equilibrium) |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 2: 40-Sample ML Proof-of-Concept (Pipeline Infrastructure Sync)    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 3: Expanded Real-Data Feature Dataset (ISRO + NASA GLC, N=48)     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 4: Dual Supervised Learning (Balanced Random Forest & XGBoost)     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 5: Zero-Leakage Spatial & Temporal Validation (North Sikkim Holdout|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 6: Physics vs. ML Disagreement & Factor Breakdown (/api/ml/expl)   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 7: Hybrid AI + Physics Risk Fusion (R_hybrid = a*P_ML + (1-a)*R_Ph)|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 8: Field Resilience: 3D GIS + Edge AI/LoRa + NDMA SACHET + Offline |
+-------------------------------------------------------------------------+
```

---

### Phase 1: Physics-Informed Baseline (Deterministic Heuristics)
- **Scientific Foundation**: The Indian Standard code for hillside slope stability (**BIS IS 14458**) and the Mohr-Coulomb failure criterion.
- **The Equation**:
  $$\text{Factor of Safety (FoS)} = \frac{c' + (\gamma z \cos^2 \beta - u) \tan \phi'}{\gamma z \sin \beta \cos \beta}$$
- **The Strength**: Grounded in the laws of mechanics. When pore-water pressure ($u$) spikes during a cloudburst, resisting shear strength collapses, driving $\text{FoS} < 1.0$.
- **The Limitation**: A purely physical 1D model does not learn regional geological clustering, soil texture variations, or land-cover interactions.

### Phase 2: 40-Sample Proof-of-Concept
- Initial integration proof connecting ISRO historical events with SRTM 30m DEM and NASA IMERG.
- Validated that the backend could ingest rasters, build 18 features, and expose `/api/ml/status` and `/api/ml/predict`.
- Evaluated on a preliminary 6-sample test set ($83.3\%$ accuracy), recognizing that small test sets have high variance and require expansion.

### Phase 3: Expanded Real-Data Feature Dataset
- Ingested **24 verified positive landslide events** combining the ISRO Landslide Atlas with deduplicated NASA Global Landslide Catalog records across East, North, South, and West Sikkim.
- Sampled **24 background/non-landslide reference samples** across all 4 districts on gentle slopes ($< 6.11^\circ$) with a strict $> 3.5\text{ km}$ buffer from any known scar.
- Built a 48-sample, 18-feature dataset joining SRTM 30m DEM, Riley Terrain Ruggedness Index, ISRIC SoilGrids 2.0 (clay/sand/silt/bulk density/pH/SOC), and ESA WorldCover 2021.

### Phase 4: Dual Supervised Learning (Random Forest + XGBoost)
- **Random Forest**: 100 balanced decision trees with depth regularization to prevent memorization on complex terrain.
- **XGBoost**: Gradient-boosted decision trees with shrinkage learning rate ($0.08$) and sub-sampling ($0.85$).
- Saved model weights and metadata directly to `data/models/`.

### Phase 5: Zero-Leakage Spatial & Temporal Validation
- Rather than a misleading random split, implemented **Spatial Grouped Block Splitting**:
  - **Test Set ($N=12$)**: North Sikkim Ridge (Mangan–Dikchu–Chungthang).
  - **Validation Set ($N=17$)**: South & West Sikkim Valleys.
  - **Training Set ($N=19$)**: Central & East Sikkim Corridor (Ranipool, Gangtok, Tadong).
- **Proof of Zero Leakage**:
  - Test-to-Train separation: **$7.70\text{ km}$** (exceeds $> 3.0\text{ km}$ requirement).
  - Validation-to-Train separation: **$5.46\text{ km}$**.
- **Real Test Results**:
  - Random Forest: **$100\%$ Recall, $1.000$ ROC-AUC** on the unseen North Sikkim block.
  - XGBoost: **$100\%$ Recall, $91.7\%$ Accuracy**.

### Phase 6: Physics vs. ML Disagreement Explanation
- Models are allowed to disagree. When Physics reports $87\%$ and ML reports $43\%$, the system does not force them to match.
- Endpoint `GET /api/ml/explanation`:
  - **Why Physics is Higher**: Highlights $\text{FoS} = 0.81 < 1.0$ caused by $42.5^\circ$ slope and extreme hydrostatic pore pressure ($28.4\text{ kPa}$).
  - **Why ML is Lower**: Identifies dense tree canopy (`lc_tree_cover = 1.0`) and elevation buffering based on historical ISRO training distribution.
  - **Transparency**: Replaced arbitrary "Conf: 13%" with **Ensemble Tree Agreement ($97\%$)** and **Decision Boundary Margin ($0.946$)**.

### Phase 7: Hybrid Risk Fusion
- Blends mechanistic safety with empirical learning:
  $$R_{\text{hybrid}} = \alpha \cdot P_{\text{ML}} + (1 - \alpha) \cdot R_{\text{Physics}}$$
- Configurable $\alpha$ (default $0.50$). If ML misses an unprecedented flash cloudburst, the physics model sounds the alarm; if physics triggers a false alarm on an engineered dry bench, the ML model dampens the panic.

### Phase 8: Field Resilience & Emergency Response
- **3D GIS Command Map**: Real-time terrain layer visualization across all 8 NER states.
- **Digital Twin Simulator**: Interactive what-if scenario testing for engineers and district magistrates.
- **Edge AI / LoRa Mesh Simulation**: Offline inference on edge nodes with TinyML quantization when cellular towers collapse.
- **Disaster Dispatch**: Automated bilingual NDMA SACHET CAP XML alert broadcasting and NH-10 road rerouting graph.
- **Immutable Audit**: Blockchain ledger verifying every alert dispatch and incident report.

---

## 3. Honest Statement on Production Readiness

> [!WARNING]
> While `NER-LandslideGuard` has demonstrated state-of-the-art multi-pipeline fusion with zero synthetic fabrication, **a 48-sample dataset is an advanced proof-of-concept / validated pilot**. 
> Full operational deployment across all 8 Northeastern States requires ingesting the Geological Survey of India's **National Landslide Susceptibility Mapping (NLSM) ~12,000 polygon shapefiles** and multi-year IMERG daily NetCDF archives. Our automated pipeline scripts (`scripts/prepare_dataset.py` and `scripts/build_feature_dataset.py`) are pre-architected to ingest these bulk files without code restructuring.
