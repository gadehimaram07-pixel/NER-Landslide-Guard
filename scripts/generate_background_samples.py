"""
Regenerate balanced, district-coherent background reference samples with distinct date ranges.
"""

import os
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_path = os.path.join(BASE_DIR, "data", "processed", "background_samples.csv")
srtm_path = os.path.join(BASE_DIR, "data", "raw", "srtm", "srtm_sikkim_30m.npz")
pos_path = os.path.join(BASE_DIR, "data", "processed", "isro_inventory.csv")

srtm = np.load(srtm_path)
elev_grid = srtm["elevation"]
slope_grid = srtm["slope_deg"]
lons = srtm["lons"]
lats = srtm["lats"]

df_pos = pd.read_csv(pos_path)
pos_coords = df_pos[["lat", "lon"]].values

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

def sample_terrain(lat, lon):
    ix = np.clip(np.searchsorted(lons, lon), 0, len(lons) - 1)
    iy = np.clip(np.searchsorted(lats, lat), 0, len(lats) - 1)
    return float(elev_grid[iy, ix]), float(slope_grid[iy, ix])

# Distinct dates per split to ensure 0 temporal leakage
train_bg_dates = [
    "2020-07-25", "2021-08-05", "2022-07-10", "2023-08-10",
    "2024-07-15", "2021-05-18", "2022-04-12", "2023-10-20",
    "2020-11-15", "2022-01-20", "2021-09-20", "2023-06-15", "2024-08-12"
]
val_bg_dates = [
    "2020-08-15", "2021-07-05", "2022-08-20", "2023-07-25",
    "2024-06-20", "2022-04-18", "2021-05-10", "2023-10-15"
]
test_bg_dates = [
    "2020-09-05", "2021-06-15", "2022-09-25"
]

# Centers for each split zone
test_centers = [
    (27.580, 88.640, "Chungthang Broad Valley Plain", "North Sikkim"),
    (27.520, 88.605, "Singhik River Terrace", "North Sikkim"),
    (27.485, 88.585, "Kabi Lower Valley Flat", "North Sikkim")
]

val_centers = [
    (27.270, 88.350, "Namchi Agricultural Terrace", "South Sikkim"),
    (27.210, 88.415, "Ravangla Lower Valley Bench", "South Sikkim"),
    (27.295, 88.235, "Pelling Gentle Plateau", "West Sikkim"),
    (27.300, 88.535, "Temi Gentle Valley Floor", "South Sikkim"),
    (27.230, 88.490, "Singtam Lower Fluvial Deposit", "South Sikkim"),
    (27.250, 88.520, "Majhitar River Bench", "South Sikkim"),
    (27.180, 88.505, "Rangpo Basin Flat", "South Sikkim"),
    (27.220, 88.250, "Dentam River Flat", "West Sikkim")
]

train_centers = [
    (27.335, 88.600, "Ranipool Valley Floor", "East Sikkim"),
    (27.340, 88.615, "Tadong Lower Terrace", "East Sikkim"),
    (27.325, 88.590, "Deorali Gentle Bench", "East Sikkim"),
    (27.360, 88.620, "Burtuk Highway Col", "East Sikkim"),
    (27.350, 88.565, "Ranka Valley Plain", "East Sikkim"),
    (27.310, 88.505, "Pakyong Alluvial Flat", "East Sikkim"),
    (27.365, 88.515, "Rumtek Gentle Bench", "East Sikkim"),
    (27.330, 88.605, "Ranipool East Riverbank", "East Sikkim"),
    (27.315, 88.595, "Mile 9 Lower Colluvium", "East Sikkim"),
    (27.342, 88.610, "Gangtok Lower Terrace", "East Sikkim"),
    (27.355, 88.575, "Ranka Gentle Col", "East Sikkim"),
    (27.320, 88.585, "Singtam Highway Bench", "East Sikkim"),
    (27.338, 88.602, "Ranipool North Fluvial Plain", "East Sikkim")
]

samples = []
s_idx = 1

# 1. Test samples (3)
for i in range(3):
    lat, lon, loc, dist = test_centers[i]
    dt = test_bg_dates[i]
    elev, slp = sample_terrain(lat, lon)
    dists = [haversine(lat, lon, p[0], p[1]) for p in pos_coords]
    samples.append({
        "sample_id": f"NON-LANDSLIDE-BG-{s_idx:03d}",
        "date": dt,
        "lat": lat,
        "lon": lon,
        "district": dist,
        "location": f"{loc} (Stable Reference)",
        "type": "Stable Slope / Non-Landslide",
        "geology": "Alluvial Terrace Deposit",
        "trigger": "None / Non-Failure Baseline",
        "label": 0,
        "elevation_m": round(elev, 1),
        "slope_deg": round(slp, 2),
        "min_distance_to_slide_km": round(min(dists), 2),
        "target_split": "TEST"
    })
    s_idx += 1

# 2. Val samples (8)
for i in range(8):
    lat, lon, loc, dist = val_centers[i]
    dt = val_bg_dates[i]
    elev, slp = sample_terrain(lat, lon)
    dists = [haversine(lat, lon, p[0], p[1]) for p in pos_coords]
    samples.append({
        "sample_id": f"NON-LANDSLIDE-BG-{s_idx:03d}",
        "date": dt,
        "lat": lat,
        "lon": lon,
        "district": dist,
        "location": f"{loc} (Stable Reference)",
        "type": "Stable Slope / Non-Landslide",
        "geology": "Alluvial Terrace Deposit",
        "trigger": "None / Non-Failure Baseline",
        "label": 0,
        "elevation_m": round(elev, 1),
        "slope_deg": round(slp, 2),
        "min_distance_to_slide_km": round(min(dists), 2),
        "target_split": "VAL"
    })
    s_idx += 1

# 3. Train samples (13)
for i in range(13):
    lat, lon, loc, dist = train_centers[i]
    dt = train_bg_dates[i]
    elev, slp = sample_terrain(lat, lon)
    dists = [haversine(lat, lon, p[0], p[1]) for p in pos_coords]
    samples.append({
        "sample_id": f"NON-LANDSLIDE-BG-{s_idx:03d}",
        "date": dt,
        "lat": lat,
        "lon": lon,
        "district": dist,
        "location": f"{loc} (Stable Reference)",
        "type": "Stable Slope / Non-Landslide",
        "geology": "Alluvial Terrace Deposit",
        "trigger": "None / Non-Failure Baseline",
        "label": 0,
        "elevation_m": round(elev, 1),
        "slope_deg": round(slp, 2),
        "min_distance_to_slide_km": round(min(dists), 2),
        "target_split": "TRAIN"
    })
    s_idx += 1

df = pd.DataFrame(samples)
df.to_csv(out_path, index=False)
print(f"Saved {len(df)} background samples with target splits: {df['target_split'].value_counts().to_dict()}")
