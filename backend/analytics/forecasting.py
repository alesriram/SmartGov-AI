"""
Predictive Analytics Module
-----------------------------
- forecast_complaints(): time-series forecast of complaint volume per category
  using a Scikit-learn regression over engineered date features (day-of-week,
  trend). For larger historical datasets, swap `LinearRegression` for
  `xgboost.XGBRegressor` (drop-in compatible with the same fit/predict calls
  used below) to capture non-linear seasonal patterns.
- get_hotspots(): clusters complaint lat/long into geographic hotspots using
  simple grid-binning (fast, dependency-light, and interpretable). For a
  larger dataset, swap in sklearn.cluster.DBSCAN for density-based clustering.
"""
import datetime
from collections import defaultdict
from typing import Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression


def forecast_complaints(historical: List[Dict], days_ahead: int = 7) -> Dict[str, List[Dict]]:
    """
    historical: list of {"date": "YYYY-MM-DD", "category": str, "count": int}
    Returns: {category: [{"date": ..., "predicted_count": ...}, ...]}
    """
    by_category = defaultdict(list)
    for row in historical:
        by_category[row["category"]].append(row)

    forecasts = {}
    for category, rows in by_category.items():
        rows = sorted(rows, key=lambda r: r["date"])
        dates = [datetime.datetime.strptime(r["date"], "%Y-%m-%d") for r in rows]
        base = dates[0]
        X = np.array([[(d - base).days, d.weekday()] for d in dates])
        y = np.array([r["count"] for r in rows])

        if len(X) < 3:
            avg = float(np.mean(y)) if len(y) else 1.0
            forecasts[category] = [
                {"date": (dates[-1] + datetime.timedelta(days=i + 1)).strftime("%Y-%m-%d"),
                 "predicted_count": round(avg, 1)}
                for i in range(days_ahead)
            ]
            continue

        model = LinearRegression()
        model.fit(X, y)

        last_day_offset = (dates[-1] - base).days
        future_X = np.array([
            [last_day_offset + i + 1, (dates[-1] + datetime.timedelta(days=i + 1)).weekday()]
            for i in range(days_ahead)
        ])
        preds = model.predict(future_X)
        preds = np.clip(preds, 0, None)

        forecasts[category] = [
            {"date": (dates[-1] + datetime.timedelta(days=i + 1)).strftime("%Y-%m-%d"),
             "predicted_count": round(float(p), 1)}
            for i, p in enumerate(preds)
        ]

    return forecasts


def get_hotspots(complaints: List[Dict], grid_size: float = 0.01) -> List[Dict]:
    """
    complaints: list of {"latitude": float, "longitude": float, "category": str}
    Bins complaints into a lat/long grid to find geographic hotspots.
    grid_size ~0.01 degrees ≈ 1.1 km at the equator.
    """
    bins = defaultdict(lambda: defaultdict(int))
    coords_sum = defaultdict(lambda: [0.0, 0.0, 0])

    for c in complaints:
        if c.get("latitude") is None or c.get("longitude") is None:
            continue
        key = (round(c["latitude"] / grid_size) * grid_size,
               round(c["longitude"] / grid_size) * grid_size)
        bins[key][c.get("category", "general")] += 1
        coords_sum[key][0] += c["latitude"]
        coords_sum[key][1] += c["longitude"]
        coords_sum[key][2] += 1

    hotspots = []
    for key, cat_counts in bins.items():
        total = sum(cat_counts.values())
        top_category = max(cat_counts, key=cat_counts.get)
        n = coords_sum[key][2]
        avg_lat = coords_sum[key][0] / n
        avg_lng = coords_sum[key][1] / n

        if total >= 8:
            intensity = "high"
        elif total >= 4:
            intensity = "medium"
        else:
            intensity = "low"

        hotspots.append({
            "latitude": round(avg_lat, 5),
            "longitude": round(avg_lng, 5),
            "category": top_category,
            "complaint_count": total,
            "intensity": intensity,
        })

    return sorted(hotspots, key=lambda h: -h["complaint_count"])
