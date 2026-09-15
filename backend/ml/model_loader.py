"""
Model Loader Service for NER-LandslideGuard.
Loads trained ML model artifacts (Random Forest & XGBoost) and evaluation metrics safely.
"""

import os
import json
import joblib
from typing import Optional, Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "data", "models")

_CACHE: Dict[str, Any] = {
    "rf_model": None,
    "xgb_model": None,
    "metadata": None,
    "metrics": None,
    "comparison": None
}

def get_models_dir() -> str:
    return MODELS_DIR

def is_model_trained() -> bool:
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    return os.path.exists(rf_path) and os.path.exists(meta_path)

def load_metadata() -> Optional[Dict[str, Any]]:
    if _CACHE["metadata"] is not None:
        return _CACHE["metadata"]
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                _CACHE["metadata"] = json.load(f)
                return _CACHE["metadata"]
        except Exception as e:
            print(f"[WARN] Failed to read model metadata: {e}")
    return None

def load_metrics() -> Optional[Dict[str, Any]]:
    if _CACHE["metrics"] is not None:
        return _CACHE["metrics"]
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                _CACHE["metrics"] = json.load(f)
                return _CACHE["metrics"]
        except Exception as e:
            print(f"[WARN] Failed to read model metrics: {e}")
    return None

def load_comparison() -> Optional[Dict[str, Any]]:
    if _CACHE["comparison"] is not None:
        return _CACHE["comparison"]
    comp_path = os.path.join(MODELS_DIR, "model_comparison.json")
    if os.path.exists(comp_path):
        try:
            with open(comp_path, "r") as f:
                _CACHE["comparison"] = json.load(f)
                return _CACHE["comparison"]
        except Exception as e:
            print(f"[WARN] Failed to read model comparison: {e}")
    return None

def load_rf_model():
    if _CACHE["rf_model"] is not None:
        return _CACHE["rf_model"]
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
    if os.path.exists(rf_path):
        try:
            _CACHE["rf_model"] = joblib.load(rf_path)
            return _CACHE["rf_model"]
        except Exception as e:
            print(f"[WARN] Failed to load Random Forest model: {e}")
    return None

def load_xgb_model():
    if _CACHE["xgb_model"] is not None:
        return _CACHE["xgb_model"]
    xgb_path = os.path.join(MODELS_DIR, "xgboost_model.json")
    if os.path.exists(xgb_path):
        try:
            import xgboost as xgb
            clf = xgb.XGBClassifier()
            clf.load_model(xgb_path)
            _CACHE["xgb_model"] = clf
            return _CACHE["xgb_model"]
        except Exception as e:
            print(f"[WARN] Failed to load XGBoost model: {e}")
    return None

def reload_models():
    """Clear in-memory cache to force reloading after training."""
    global _CACHE
    _CACHE = {
        "rf_model": None,
        "xgb_model": None,
        "metadata": None,
        "metrics": None,
        "comparison": None
    }
    return get_model_status()

def get_model_status() -> Dict[str, Any]:
    rf_path = os.path.join(MODELS_DIR, "random_forest.pkl")
    xgb_path = os.path.join(MODELS_DIR, "xgboost_model.json")
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    
    rf_exists = os.path.exists(rf_path)
    xgb_exists = os.path.exists(xgb_path)
    meta = load_metadata()
    metrics = load_metrics()

    is_trained = rf_exists and (meta is not None)

    return {
        "is_trained": is_trained,
        "status": "TRAINED" if is_trained else "NOT_TRAINED",
        "pipeline_name": meta.get("model_pipeline_name", "NER-LandslideGuard Real ML Risk Predictor") if meta else "Not Trained",
        "model_version": meta.get("model_version", "None") if meta else "None",
        "training_timestamp": meta.get("training_timestamp") if meta else None,
        "primary_model": meta.get("primary_model", "RandomForestClassifier") if meta else None,
        "secondary_model": meta.get("secondary_model", "XGBClassifier") if meta else None,
        "training_samples": meta.get("training_samples", 0) if meta else 0,
        "validation_samples": meta.get("validation_samples", 0) if meta else 0,
        "test_samples": metrics.get("test_samples_count", 0) if metrics else 0,
        "total_samples": (meta.get("training_samples", 0) + meta.get("validation_samples", 0) + (metrics.get("test_samples_count", 0) if metrics else 0)) if meta else 0,
        "feature_count": len(meta.get("feature_list", [])) if meta else 0,
        "feature_list": meta.get("feature_list", []) if meta else [],
        "disclaimer": "PRELIMINARY RESULTS ON A PROTOTYPE DATASET",
        "model_files": {
            "random_forest": rf_exists,
            "xgboost": xgb_exists,
            "metadata": os.path.exists(meta_path),
            "metrics": os.path.exists(metrics_path)
        }
    }

def get_feature_importances() -> List[Dict[str, Any]]:
    meta = load_metadata()
    if meta and "top_feature_importances" in meta:
        return meta["top_feature_importances"]
    
    # Fallback to model Gini importances if metadata is missing but model exists
    rf = load_rf_model()
    if rf and hasattr(rf, "feature_importances_") and meta and "feature_list" in meta:
        feats = meta["feature_list"]
        importances = rf.feature_importances_
        sorted_indices = importances.argsort()[::-1]
        return [
            {"feature": feats[i], "importance": round(float(importances[i]), 4)}
            for i in sorted_indices
        ]
    return []
