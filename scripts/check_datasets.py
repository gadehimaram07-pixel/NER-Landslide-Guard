"""
Dataset Integrity & Verification Utility for NER-LandslideGuard.
Checks all 7 target earth-observation and landslide inventory sources.
Reports honest status: [OK], [MISSING], [OPTIONAL], [SKIPPED].
"""

import os
import sys
import glob

# Ensure base path resolution
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")

DATASET_CONFIG = {
    "isro": {
        "name": "1. ISRO Landslide Atlas of India (NRSC)",
        "priority": "ESSENTIAL",
        "path": os.path.join(RAW_DIR, "isro"),
        "extensions": [".csv", ".shp", ".geojson", ".gpkg", ".xlsx", ".json"],
        "required_for_training": True
    },
    "imerg": {
        "name": "2. NASA GPM IMERG Final Precipitation",
        "priority": "ESSENTIAL",
        "path": os.path.join(RAW_DIR, "imerg"),
        "extensions": [".nc4", ".nc", ".hdf5"],
        "required_for_training": True
    },
    "srtm": {
        "name": "3. USGS/NASA SRTM 1 Arc-Second DEM (30m)",
        "priority": "ESSENTIAL",
        "path": os.path.join(RAW_DIR, "srtm"),
        "extensions": [".tif", ".tiff", ".hgt", ".dem", ".asc", ".npz", ".json"],
        "required_for_training": True
    },
    "soilgrids": {
        "name": "4. ISRIC SoilGrids 2.0 (Clay, Sand, Silt, pH, BDOD)",
        "priority": "NEXT",
        "path": os.path.join(RAW_DIR, "soilgrids"),
        "extensions": [".tif", ".tiff", ".csv", ".json", ".parquet"],
        "required_for_training": False
    },
    "worldcover": {
        "name": "5. ESA WorldCover 2021 (10m Land Cover)",
        "priority": "NEXT",
        "path": os.path.join(RAW_DIR, "worldcover"),
        "extensions": [".tif", ".tiff", ".csv", ".json"],
        "required_for_training": False
    },
    "sentinel1": {
        "name": "6. Sentinel-1 SAR / InSAR Ground Deformation",
        "priority": "ADVANCED",
        "path": os.path.join(RAW_DIR, "sentinel1"),
        "extensions": [".tif", ".tiff", ".csv", ".h5", ".nc"],
        "required_for_training": False
    },
    "nasa_glc": {
        "name": "7. NASA Global Landslide Catalog (GLC)",
        "priority": "SUPPLEMENTARY",
        "path": os.path.join(RAW_DIR, "nasa_glc"),
        "extensions": [".csv", ".geojson", ".json"],
        "required_for_training": False
    }
}

def scan_files(directory, extensions):
    if not os.path.exists(directory):
        return []
    found = []
    for ext in extensions:
        found.extend(glob.glob(os.path.join(directory, f"*{ext}")))
        found.extend(glob.glob(os.path.join(directory, f"**/*{ext}"), recursive=True))
    return sorted(list(set(found)))

def inspect_imerg_files(files):
    details = []
    try:
        import xarray as xr
        for f in files:
            fname = os.path.basename(f)
            try:
                ds = xr.open_dataset(f)
                precip = ds['precipitation'] if 'precipitation' in ds else None
                p_max = float(precip.max()) if precip is not None else 0.0
                p_mean = float(precip.mean()) if precip is not None else 0.0
                lon_range = f"{float(ds.lon.min()):.2f} to {float(ds.lon.max()):.2f}" if 'lon' in ds.coords else "N/A"
                lat_range = f"{float(ds.lat.min()):.2f} to {float(ds.lat.max()):.2f}" if 'lat' in ds.coords else "N/A"
                details.append(f"    - {fname}: {ds.dims.mapping if hasattr(ds.dims, 'mapping') else ds.dims}, Lon [{lon_range}], Lat [{lat_range}], Max: {p_max:.1f}mm, Mean: {p_mean:.1f}mm")
                ds.close()
            except Exception as e:
                details.append(f"    - {fname}: NetCDF readable check error: {e}")
    except ImportError:
        for f in files:
            details.append(f"    - {os.path.basename(f)} ({os.path.getsize(f) // 1024} KB)")
    return details

def main():
    print("=" * 80)
    print("NER-LandslideGuard - Data Source Integrity & Readiness Check")
    print("=" * 80)
    print(f"Data Directory: {DATA_DIR}\n")

    summary = {
        "OK": [],
        "MISSING": [],
        "OPTIONAL": [],
        "SKIPPED": []
    }

    for key, cfg in DATASET_CONFIG.items():
        files = scan_files(cfg["path"], cfg["extensions"])
        total_size_kb = sum(os.path.getsize(f) for f in files) // 1024 if files else 0
        
        if files:
            status = "[OK]"
            summary["OK"].append(cfg["name"])
            print(f"{status} {cfg['name']}")
            print(f"     Priority: {cfg['priority']} | Files Found: {len(files)} | Size: {total_size_kb} KB")
            print(f"     Location: {cfg['path']}")
            if key == "imerg":
                for line in inspect_imerg_files(files):
                    print(line)
            else:
                for f in files[:3]:
                    print(f"     - {os.path.basename(f)} ({os.path.getsize(f) // 1024} KB)")
                if len(files) > 3:
                    print(f"     - ... and {len(files) - 3} more files")
        else:
            if cfg["priority"] == "ESSENTIAL":
                status = "[MISSING]"
                summary["MISSING"].append(cfg["name"])
                print(f"{status} {cfg['name']}")
                print(f"     Priority: {cfg['priority']} | Status: NOT FOUND")
                print(f"     Location: {cfg['path']}")
                print(f"     Action Required: Run 'python scripts/download_data.py --source {key}' or provide dataset files.")
            elif cfg["priority"] in ["NEXT", "SUPPLEMENTARY"]:
                status = "[OPTIONAL]"
                summary["OPTIONAL"].append(cfg["name"])
                print(f"{status} {cfg['name']}")
                print(f"     Priority: {cfg['priority']} | Status: NOT AVAILABLE (Optional)")
                print(f"     Location: {cfg['path']}")
                print(f"     Note: System will use available features; run download_data.py to ingest.")
            else: # ADVANCED (Sentinel-1)
                status = "[SKIPPED]"
                summary["SKIPPED"].append(cfg["name"])
                print(f"{status} {cfg['name']}")
                print(f"     Priority: {cfg['priority']} | Status: SKIPPED (Advanced InSAR pipeline not mandatory)")
                print(f"     Location: {cfg['path']}")
                print(f"     Note: Zero fabrication policy active. Model runs without synthetic SAR deformation.")
        print("-" * 80)

    print("\nSUMMARY REPORT:")
    print(f"  Total Sources Ready   [OK]:       {len(summary['OK'])}")
    print(f"  Essential Missing     [MISSING]:  {len(summary['MISSING'])}")
    print(f"  Optional / Next Phase [OPTIONAL]: {len(summary['OPTIONAL'])}")
    print(f"  Advanced (Skipped)    [SKIPPED]:  {len(summary['SKIPPED'])}")
    
    if summary["MISSING"]:
        print("\n[!] CRITICAL HONESTY NOTICE:")
        print("    One or more essential training sources are missing locally.")
        print("    Do not fabricate random labels or synthetic data.")
        print("    Run 'python scripts/download_data.py' to acquire open public data packages.")
    else:
        print("\n[READY] All essential datasets are verified and ready for feature engineering.")
    print("=" * 80)

if __name__ == "__main__":
    main()
