"""
Computer Vision Module
-----------------------
Detects civic issues (potholes, garbage overflow, water leakage, damaged
streetlights, illegal parking, road damage) in citizen-uploaded photos.

Design note for capstone / production use:
  - This module is built around Ultralytics YOLOv8. For GENERIC objects
    (car, truck, person) it uses a real pretrained YOLOv8n model (COCO
    weights), which is genuinely useful for detecting e.g. illegal parking.
  - COCO does NOT contain classes like "pothole" or "garbage overflow" —
    no public pretrained model does. Real deployments fine-tune YOLOv8 on
    a labeled civic-issue dataset (Roboflow has several open pothole /
    garbage datasets you can use for this).
  - Since no such fine-tuned weights exist in this environment, civic-issue
    classes are produced by `_heuristic_civic_detector`, which uses classic
    OpenCV image analysis (edge density, color-blob analysis, brightness)
    to make a plausible, explainable guess. It returns results in the same
    schema a fine-tuned YOLO model would, so swapping in real weights later
    is a one-function change (see `analyze_image`).
"""
import json
import random
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np

CIVIC_CLASSES = [
    "pothole",
    "garbage_overflow",
    "water_leakage",
    "damaged_streetlight",
    "illegal_parking",
    "road_damage",
]

_yolo_model = None


def _get_yolo_model():
    """Lazy-load a pretrained YOLOv8n model for generic object detection."""
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"[cv_module] YOLOv8 unavailable, using heuristic-only mode: {e}")
            _yolo_model = False
    return _yolo_model


def _heuristic_civic_detector(image: np.ndarray) -> List[Dict]:
    """
    Rule-based stand-in for a fine-tuned civic-issue YOLO model.
    Uses edge density / color analysis to produce plausible, explainable
    detections in the SAME output schema a real fine-tuned model would use:
    [{"class": str, "confidence": float, "bbox": [x1,y1,x2,y2]}, ...]

    Replace the body of this function with a call to your fine-tuned
    `YOLO("civic_issues_best.pt")` model once you have trained one.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 160)
    edge_density = edges.sum() / (h * w * 255)

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Brownish/grey road-colored mask -> proxy for pothole/road damage texture
    dark_mask = cv2.inRange(hsv, (0, 0, 0), (180, 90, 90))
    dark_ratio = dark_mask.sum() / (h * w * 255)

    detections = []

    # Deterministic-ish pseudo-detection driven by actual pixel statistics,
    # so the same image always yields the same result (not pure random).
    seed = int(gray.mean() * 1000) % (2**32)
    rng = random.Random(seed)

    if edge_density > 0.06 and dark_ratio > 0.15:
        detections.append({
            "class": "pothole",
            "confidence": round(0.55 + min(edge_density, 0.4), 2),
            "bbox": _rand_bbox(rng, w, h),
        })
    if dark_ratio > 0.35:
        detections.append({
            "class": "road_damage",
            "confidence": round(0.5 + min(dark_ratio, 0.4), 2),
            "bbox": _rand_bbox(rng, w, h),
        })

    # Green/organic color mask -> proxy for garbage overflow
    green_mask = cv2.inRange(hsv, (25, 40, 40), (95, 255, 255))
    green_ratio = green_mask.sum() / (h * w * 255)
    if green_ratio > 0.08:
        detections.append({
            "class": "garbage_overflow",
            "confidence": round(0.5 + min(green_ratio * 2, 0.4), 2),
            "bbox": _rand_bbox(rng, w, h),
        })

    # Blue mask -> proxy for water leakage / stagnant water
    blue_mask = cv2.inRange(hsv, (95, 40, 40), (135, 255, 255))
    blue_ratio = blue_mask.sum() / (h * w * 255)
    if blue_ratio > 0.05:
        detections.append({
            "class": "water_leakage",
            "confidence": round(0.5 + min(blue_ratio * 3, 0.4), 2),
            "bbox": _rand_bbox(rng, w, h),
        })

    # Low overall brightness at night -> proxy signal for damaged streetlight reports
    if gray.mean() < 60:
        detections.append({
            "class": "damaged_streetlight",
            "confidence": 0.6,
            "bbox": _rand_bbox(rng, w, h),
        })

    return detections


def _rand_bbox(rng: random.Random, w: int, h: int) -> List[int]:
    x1 = rng.randint(0, max(1, w // 2))
    y1 = rng.randint(0, max(1, h // 2))
    x2 = min(w, x1 + rng.randint(w // 6, w // 2))
    y2 = min(h, y1 + rng.randint(h // 6, h // 2))
    return [x1, y1, x2, y2]


def analyze_image(image_path: str) -> Dict:
    """
    Main entry point. Returns:
    {
        "detections": [{"class": ..., "confidence": ..., "bbox": [...]}],
        "generic_objects": [{"class": ..., "confidence": ...}],
        "top_category": str | None,
    }
    """
    image = cv2.imread(image_path)
    if image is None:
        return {"detections": [], "generic_objects": [], "top_category": None,
                "error": "unreadable_image"}

    civic_detections = _heuristic_civic_detector(image)

    generic_objects = []
    model = _get_yolo_model()
    if model:
        try:
            results = model.predict(image_path, verbose=False, conf=0.35)
            for r in results:
                for box in r.boxes:
                    cls_name = model.names[int(box.cls[0])]
                    conf = float(box.conf[0])
                    generic_objects.append({"class": cls_name, "confidence": round(conf, 2)})
                    if cls_name == "car" and conf > 0.5:
                        civic_detections.append({
                            "class": "illegal_parking",
                            "confidence": round(conf * 0.8, 2),
                            "bbox": [int(x) for x in box.xyxy[0].tolist()],
                            "note": "vehicle detected; illegal-parking flag requires zone-rule cross-check",
                        })
        except Exception as e:
            print(f"[cv_module] YOLO inference failed: {e}")

    top_category = None
    if civic_detections:
        top_category = max(civic_detections, key=lambda d: d["confidence"])["class"]

    return {
        "detections": civic_detections,
        "generic_objects": generic_objects,
        "top_category": top_category,
    }


def analyze_image_json(image_path: str) -> str:
    return json.dumps(analyze_image(image_path))
