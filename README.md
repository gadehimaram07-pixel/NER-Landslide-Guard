# NER Landslide Sentinel: AI-Based Early Warning & Risk Monitoring System

An AI-powered Landslide Early Warning and Risk Monitoring research and prototype platform specifically designed for the rugged terrain, extreme rainfall regimes, and intermittent-connectivity conditions of the **North Eastern Region (NER) of India** (covering Sikkim, Meghalaya, Assam, Nagaland, Mizoram, Arunachal Pradesh, Manipur, and Tripura).

---

## 1. Implementation Status

| Component | Status | Description |
|---|---|---|
| **React GIS Dashboard** | **Implemented** | Interactive Leaflet GIS dashboard with hazard mapping, telemetry cards, and what-if controls. |
| **FastAPI Backend** | **Implemented** | REST API service with 30+ endpoints for telemetry, predictions, and alerting. |
| **Random Forest Model** | **Implemented** | Scikit-learn Balanced Random Forest (16 features, 78.57% test accuracy on held-out test set). |
| **XGBoost Model** | **Implemented** | Gradient-boosted decision tree classifier (80.00% test accuracy on held-out test set). |
| **Hybrid ML + Physics Risk** | **Implemented** | Dual-pipeline reliability-weighted fusion ($R_{\text{hybrid}} = \alpha_{\text{eff}} \cdot P_{\text{ML}} + (1 - \alpha_{\text{eff}}) \cdot R_{\text{physics}}$). |
| **Factor of Safety Engine** | **Implemented** | Limit-equilibrium slope stability calculations based on engineering principles referenced from BIS IS 14458. |
| **3D Digital Twin Simulator** | **Implemented** | Interactive 3D Three.js geotechnical slope simulator with slip circle and saturation dynamics. |
| **Alert Generation & CAP Export** | **Implemented** | The prototype generates CAP-style / SACHET-oriented alert payload templates for demonstration. No live government alert-gateway integration is claimed. |
| **Audit Ledger** | **Implemented** | Centralized tamper-evident SHA-256 hash-chain audit ledger stored in SQLite. |
| **Image Triage Module** | **Heuristic Prototype** | Lightweight pixel-forensic triage and keyword heuristic verification (no trained CNN in pipeline). |
| **Model Explanation** | **Feature-Importance Prototype** | Empirical factor attribution and tree Gini importance profiles (full SHAP library planned for Phase 2). |
| **Satellite / InSAR Integration** | **Prototype / Simulated** | Architecture supports deformation products; current prototype demonstrates workflow via simulated/seeded feeds. |
| **IoT / LoRa Telemetry** | **Prototype / Simulated** | Ingestion simulator demonstrating multi-sensor data flow (moisture, tilt, vibration, pore pressure). |
| **External Telecom Gateways** | **Integration-Ready / Simulated** | Standardized payload generation for SMS, WhatsApp, and IVR; simulated dispatch in current prototype. |
| **Physical Sensor Deployment** | **Not Deployed** | Hardware field deployment is future operational work. |
| **End-to-End Sentinel-1 InSAR** | **Future Deployment** | Automated SAR interferometric processing pipeline planned for deployment phase. |

---

## 2. System Architecture (5 Core Layers)

```
                                  +---------------------------------------+
                                  |     Layer 5: Unified Frontend         |
                                  | React + Leaflet GIS + Field PWA App   |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
         +---------------+---------------+                         +---------------+---------------+
         | Layer 3: Core Backend & GIS   |                         | Layer 4: Alerting & NDMA      |
         | FastAPI, GeoJSON, SQLite,     |<=======================>| CAP v1.2 XML, Multilingual    |
         | Digital Twin, Hash-Chain Log  |                         | Templates, Gateway Simulation |
         +---------------+---------------+                         +---------------+---------------+
                         ^                                                         |
                         |                                                         |
         +---------------+---------------+                                         |
         | Layer 2: AI/ML Risk Engine    |                                         |
         | Trained RF & XGBoost Models,  |                                         |
         | Hybrid FoS Physics, Triage CV,|                                         |
         | Feature Explanation Engine    |                                         |
         +---------------+---------------+                                         |
                         ^                                                         |
                         |                                                         |
         +---------------+---------------+                                         |
         | Layer 1: Data Ingestion Layer |                                         |
         | Rain Fallback Engine, LoRa/IoT|                                         |
         | Sim, InSAR Feed Sim, Field PWA|                                         |
         +-------------------------------+                                         |
```

### Layer 1: Data Ingestion
- **Precipitation Threshold Modeling**: Computes the **Antecedent Precipitation Index ($API_t = P_t + 0.85 \cdot API_{t-1}$)** and Himalayan rainfall threshold curves ($I = 14.82 \cdot D^{-0.39}$) per IMD/GSI guidelines, with simulated live rainfall telemetry.
- **LoRa/IoT Telemetry Simulator**: Ingests volumetric soil moisture ($VWC\%$), pore water pressure ($kPa$), biaxial tilt angles ($X, Y^\circ$), and vibration ($RMS$) via simulated gateway packets.
- **Satellite InSAR Integration Prototype**: Ingests Line-of-Sight (LOS) displacement and velocity feeds using seeded/simulated deformation records to demonstrate uninstrumented remote detection.
- **Citizen & Field Offline Reports**: Offline-first synchronization queue with GPS coordinates and client-side photo queueing.

### Layer 2: AI/ML & Physics Risk Engine
- **Supervised ML Classifiers**: The trained Random Forest and XGBoost models perform dynamic inference in the prototype. Operational deployment would require larger, independently source-verified regional inventories and field validation.
- **Factor of Safety (FoS) Engine**: Limit-equilibrium slope stability calculations based on engineering principles referenced from BIS IS 14458 computing deterministic safety factors.
- **Hybrid AI + Physics Fusion**: Blends ML probability with physical FoS using reliability weighting and disagreement-aware advisory bounds.
- **Lightweight Image Triage Module**: Pixel-forensic triage and heuristic verification for field photos (tension cracks, mudslides, blocked roads) with confidence capped below 80% to reflect the absence of a trained CNN.
- **Feature Importance & Explanation Prototype**: Decomposes hazard scores into environmental contributions (rainfall, pore pressure, tilt, slope) and tree Gini feature importances.

### Layer 3: Core Backend & GIS
- **GIS Engine**: GeoJSON endpoints, spatial distance queries, nearest safe shelter locator, and road buffer queries implemented in Python with SQLite.
- **Road Network Twin**: Graph of critical arterial mountain highways (NH-10, NH-29, NH-6, NH-27, NH-54, NH-37) with blockage monitoring and Dijkstra-based emergency rerouting.
- **3D Digital Twin Slope Stability Simulator**: Geotechnical Infinite Slope limit-equilibrium physics engine computing Factor of Safety ($FoS$) for "What-If" rainfall simulations.
- **Tamper-Evident Audit Ledger**: Centralized SHA-256 chained audit trail stored in SQLite recording alerts, sign-offs, and relief claims.

### Layer 4: Alerting & Interoperability
- **Multi-Channel Dispatch Simulation**: Generates formatted alert payloads for SMS, WhatsApp, IVR voice scripts, and browser-synthesized emergency sirens.
- **Multilingual Localization**: Native translation templates for **8 regional languages**: Assamese, Khasi, Mizo, Bodo, Bengali, Nepali, Hindi, and English.
- **OASIS CAP / SACHET Export**: The prototype generates CAP-style / SACHET-oriented alert payload templates for demonstration. No live government alert-gateway integration is claimed.
- **Tiered Escalation**: Citizen Advisory $\rightarrow$ Village Disaster Management Committee (VDMC) $\rightarrow$ District Disaster Management Authority (DDMA / DC) $\rightarrow$ SDRF / NDRF Command.

### Layer 5: Frontend Dashboard & Mobile Field App
- **GIS Command Dashboard**: Interactive Leaflet map with hazard heatmaps, sensor nodes, InSAR deformation vectors, and highway closure statuses.
- **3D Digital Twin**: Interactive Three.js geotechnical slope simulator with slip circle and saturation dynamics.
- **Offline-First Field Officer PWA**: Local storage queue, camera integration, heuristic triage, and sync-on-reconnect.
- **Sensor Telemetry & Sliding Rate UI**: Real-time sliding rate estimation and interactive sensor controls with synthesized siren audio.

---

## 3. Data & Model Transparency

### Dataset Composition
The 620-sample master catalog is a prototype training dataset combining source-derived environmental information with generated/background reference samples. It is intended to demonstrate the end-to-end ML and risk-assessment pipeline and should not be interpreted as 620 independently observed landslide events:
- **Total Samples**: 620
- **Class Balance**: 310 Positive (Landslide hazard) / 310 Negative (Background stable terrain)
- **Data Partitions**:
  - **Training Set**: 490 samples (Sikkim, Meghalaya, Assam, Nagaland, Arunachal corridors; 2018–2022)
  - **Validation Set**: 60 samples (Mizoram Aizawl corridor; 2023)
  - **Independent Test Set**: 70 samples (Manipur Noney Tupul Valley corridor; 2024)
- **Spatio-Temporal Isolation**: The test set is strictly blocked spatially ($>30\text{ km}$ buffer from training corridors) and temporally isolated to calendar year 2024 to verify out-of-corridor generalization.

### Environmental Feature Extraction
- **Meteorological Data**: Antecedent precipitation (24h, 72h) extracted via NASA POWER satellite daily calibrated precipitation queries; surrounding peak intensity represented via sub-basin intensity scaling.
- **Topographic Features**: Supported by a terrain-processing pipeline designed for SRTM 30m DEM elevation data; the current prototype contains a synthetic terrain fallback for offline development/demonstration.
- **Pedological Features**: Soil properties (clay, sand, silt, bulk density, pH, organic carbon) are represented using regional SoilGrids-informed parameter profiles across 21 districts.
- **Land Cover**: ESA WorldCover 10m GeoTIFF data is integrated where available (Sikkim tile), with a prototype regional prior for corridors outside current raster coverage.

### Authoritative Model Performance
Evaluated on the completely independent 70-sample test set (Manipur Corridor, Year 2024) stored in `data/models/model_metrics.json`:

| Metric | Balanced Random Forest | XGBoost Classifier | Standalone Physics Baseline |
|---|:---:|:---:|:---:|
| **Test Accuracy** | **78.57%** | **80.00%** | 65.71% |
| **Precision** | **71.74%** | **74.42%** | 60.34% |
| **Recall (Sensitivity)** | **94.29%** | **91.43%** | 100.00% |
| **F1-Score** | **81.48%** | **82.05%** | 75.27% |
| **ROC-AUC** | **81.14%** | **79.92%** | 68.57% |
| **Confusion Matrix** | `[[22, 13], [2, 33]]` | `[[24, 11], [3, 32]]` | `[[11, 24], [0, 35]]` |
| **False Positives (FP)** | **13** | **11** | 24 |
| **False Negatives (FN)** | **2** | **3** | 0 |

> **Operational Insight**: The ML models maintain high recall ($>91\%$) while reducing false positive alarms compared to standalone physics limit-equilibrium mechanics, which flagged 24 false alarms on steep but stable terrain. The Hybrid Risk engine dynamically reconciles divergences between both approaches.

---

## 4. Prototype Limitations & Research Scope

As a research and competition prototype, the platform operates under the following transparent limitations:
1. **Dataset Scope**: The 620-sample master catalog is a prototype training dataset combining source-derived environmental information with generated/background reference samples. It demonstrates the end-to-end ML and risk-assessment pipeline and should not be interpreted as 620 independently observed landslide events. Operational deployment requires comprehensive field-verified inventories.
2. **Regional Parameter Profiles**: Certain environmental features (soil physical properties, non-Sikkim land cover) utilize regional profile representations rather than continuous high-resolution raster extractions.
3. **Satellite InSAR Workflow**: The architecture provides full data-model integration for deformation feeds, but end-to-end Sentinel-1 interferometric processing (e.g. SNAP/MintPy) is planned for the deployment phase; current views demonstrate data flow via simulated deformation records.
4. **Physical IoT Sensor Hardware**: On-slope LoRaWAN telemetry and ESP32 Edge AI nodes are currently demonstrated through an interactive software simulation engine.
5. **Alerting Gateways**: The prototype generates CAP-style / SACHET-oriented alert payload templates for demonstration. No live government alert-gateway integration is claimed.
6. **ML Validation & Field Verification**: The trained Random Forest and XGBoost models perform dynamic inference in the prototype. Operational deployment would require larger, independently source-verified regional inventories and field validation. Factor of Safety calculations are limit-equilibrium slope stability calculations based on engineering principles referenced from BIS IS 14458.

---

## 5. Quick Start & Execution

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### Starting the Platform
Run in PowerShell:
```powershell
.\start_system.ps1
```
Or double-click `start_system.bat` (Windows).

### Manual Start:
**1. Launch Backend:**
```bash
cd backend
python -m pip install fastapi uvicorn pydantic scikit-learn numpy requests httpx
python database.py
python main.py
```
*Backend will run on `http://127.0.0.1:8000` (Swagger docs at `/docs`).*

**2. Launch Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*Frontend will run on `http://localhost:3000`.*

