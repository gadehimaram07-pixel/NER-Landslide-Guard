# NER-LandslideGuard: Geomechanical Physics Model Audit

> **Audit Target**: Infinite-Slope Limit-Equilibrium Engine (`backend/ml/hybrid_risk.py`, `backend/core_gis/digital_twin_simulator.py`).  
> **Reference Standards**: BIS IS 14458 (Guidelines for Slope Analysis), Mohr-Coulomb Effective Stress Theory.  
> **Audit Date**: 2026-09-13  

---

## 1. Executive Geomechanical Verdict

> [!NOTE]
> **AUDIT RESULT: PASS on Physics Implementation & Dimensional Consistency.**  
> The mathematical equations correctly reflect the 1D infinite slope limit equilibrium model with steady seepage parallel to the slope.  
> Angle conversions from degrees to radians, effective stress subtractions, and dimensional units (kPa / kPa) are consistent throughout.  
> No algorithmic or mathematical errors were found in the implementation.

---

## 2. Geotechnical Formulations & Dimensional Verification

### A. Coordinate & Angle Conversions
```python
beta_rad = math.radians(max(5.0, min(85.0, slope_deg)))
phi_rad = math.radians(friction_angle_deg)
```
- **Audit**: Angles in degrees are explicitly converted to radians using `math.radians()`. Slope $\beta$ is bounded within $[5.0^\circ, 85.0^\circ]$ to prevent division by zero or unrealistic overhang geometries.

### B. Dimensional Parameters & Unit Consistency

| Variable | Physical Quantity | Code Symbol | Value in Code | Units | Geotechnical Plausibility |
| :--- | :--- | :--- | :---: | :---: | :--- |
| $z$ | Failure Plane Depth | `z` | `2.5` | $\text{m}$ | Typical shallow translational slide depth in Himalayan colluvium |
| $\gamma$ | Soil Bulk Unit Weight | `gamma` | `19.5` | $\text{kN/m}^3$ | Realistic for wet gravelly silt/clay Himalayan colluvium |
| $\gamma_w$ | Unit Weight of Water | `gamma_w` | `9.81` | $\text{kN/m}^3$ | Standard gravitational constant for freshwater |
| $c'$ | Effective Cohesion | `cohesion_kpa` | Parameter (`12.0`) | $\text{kPa} = \text{kN/m}^2$ | Matches typical weathered phyllite/schist colluvium |
| $\phi'$ | Effective Internal Friction Angle | `friction_angle_deg` | Parameter (`28.0`) | degrees | Matches residual friction of Himalayan silty sand/schist |

### C. Pore-Water Pressure Formulation
For steady seepage parallel to a planar slope with phreatic surface height $h_w$ above the slip plane:
$$u = \gamma_w \cdot h_w \cdot \cos^2\beta$$
In the codebase (`backend/ml/hybrid_risk.py`, lines 58-59):
```python
hw = min(z, (saturation_pct / 100.0) * z + (total_rain / 1000.0) * 1.5)
u = gamma_w * hw * (math.cos(beta_rad) ** 2)
```
- **Verification**: $h_w$ is strictly capped at soil depth $z$ ($2.5\text{ m}$). Units: $[\text{kN/m}^3] \times [\text{m}] = \text{kN/m}^2 = \text{kPa}$.
- The $\cos^2\beta$ term correctly models the equipotential drop along seepage lines parallel to the slope (Skempton & Delory, 1957; Duncan & Wright, 2005).

### D. Normal & Effective Stress
$$\sigma = \gamma \cdot z \cdot \cos^2\beta \quad [\text{kPa}]$$
$$\sigma' = \max(0.01, \; \sigma - u) \quad [\text{kPa}]$$
```python
total_normal = gamma * z * (math.cos(beta_rad) ** 2)
eff_normal = max(0.01, total_normal - u)
```
- **Verification**: Both $\sigma$ and $u$ have units of $\text{kPa}$. Effective normal stress is protected against negative values using a minimum floor of $0.01\text{ kPa}$.

### E. Resisting & Driving Shear Stresses
$$\tau_{\text{resisting}} = c' + \sigma' \cdot \tan\phi' \quad [\text{kPa}]$$
$$\tau_{\text{driving}} = \gamma \cdot z \cdot \sin\beta \cdot \cos\beta \quad [\text{kPa}]$$
```python
resisting = cohesion_kpa + eff_normal * math.tan(phi_rad)
driving = gamma * z * math.sin(beta_rad) * math.cos(beta_rad)
fos = round(resisting / max(driving, 0.001), 2)
```
- **Verification**: Both numerator and denominator evaluate to shear stress in $\text{kPa}$. Their quotient $FoS$ is strictly dimensionless.

---

## 3. Factor of Safety to Risk Transformation

The codebase applies a standard geotechnical classification to translate $FoS$ into a normalized risk score:

| Factor of Safety ($FoS$) | Geotechnical Stability State | Risk Mapping Range | Risk Category |
| :---: | :---: | :---: | :---: |
| $FoS < 1.0$ | `COLLAPSE_IMMINENT` | $0.75 - 0.98$ | **CRITICAL** |
| $1.0 \le FoS < 1.25$ | `CRITICAL_CREEP` | $0.55 - 0.75$ | **HIGH** |
| $1.25 \le FoS < 1.50$ | `MARGINALLY_STABLE` | $0.35 - 0.55$ | **MODERATE** |
| $FoS \ge 1.50$ | `STABLE` | $0.05 - 0.35$ | **LOW** |

The deterministic Physics risk is then computed as:
$$R_{\text{Phys}} = 0.65 \cdot S_{\text{FoS}} + 0.35 \cdot S_{\text{Rain}}$$
Where $S_{\text{Rain}} = \min\left(1.0, \frac{R_{24h}}{120} \cdot 0.6 + \frac{R_{72h}}{250} \cdot 0.4\right)$.

---

## 4. Conclusion
The physics-informed deterministic pipeline is mathematically sound, dimensions are consistent, and formulas reflect validated geotechnical engineering principles.
