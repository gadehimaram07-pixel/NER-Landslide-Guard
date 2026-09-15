import os
import pandas as pd
import numpy as np

BASE_DIR = r"c:\Users\HIMARAM\Downloads\ner-landslide-guard\ner-landslide-guard (2)\ner-landslide-guard"
pos_df = pd.read_csv(os.path.join(BASE_DIR, "data", "processed", "isro_inventory.csv"))

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2)**2
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

def get_storm_id(r):
    dt = str(r["date"])
    if dt in ["2024-07-01", "2024-07-02"]:
        return "STORM-2024-JUL01_02"
    return f"STORM-{dt}"

pos_df["storm_id"] = pos_df.apply(get_storm_id, axis=1)

storm_dict = {}
for sid, grp in pos_df.groupby("storm_id"):
    storm_dict[sid] = {
        "ids": grp["id"].tolist(),
        "n": len(grp),
        "coords": grp[["lat", "lon"]].values,
        "lat_min": grp["lat"].min(),
        "lat_max": grp["lat"].max(),
        "districts": list(grp["district"].unique())
    }

all_storms = list(storm_dict.keys())

def min_dist(s_list1, s_list2):
    c1 = np.vstack([storm_dict[s]["coords"] for s in s_list1])
    c2 = np.vstack([storm_dict[s]["coords"] for s in s_list2])
    m = 1e9
    for p1 in c1:
        for p2 in c2:
            d = haversine(p1[0], p1[1], p2[0], p2[1])
            if d < m:
                m = d
    return m

adj = {s: set([s]) for s in all_storms}
for i in range(len(all_storms)):
    for j in range(i+1, len(all_storms)):
        s1 = all_storms[i]
        s2 = all_storms[j]
        d = min_dist([s1], [s2])
        if d < 3.0:
            adj[s1].add(s2)
            adj[s2].add(s1)

clusters = []
visited = set()
for s in all_storms:
    if s not in visited:
        cluster = set()
        queue = [s]
        visited.add(s)
        while queue:
            curr = queue.pop(0)
            cluster.add(curr)
            for neighbor in adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        clusters.append(list(cluster))

print(f"\nFound {len(clusters)} spatially isolated storm clusters (distance between clusters >= 3.0 km):")
for idx, c in enumerate(clusters):
    n_events = sum(storm_dict[s]["n"] for s in c)
    min_lat = min(storm_dict[s]["lat_min"] for s in c)
    max_lat = max(storm_dict[s]["lat_max"] for s in c)
    print(f"\nCluster #{idx+1}: {len(c)} storms, {n_events} events | Lat range: [{min_lat:.3f}, {max_lat:.3f}]")
    for s in c:
        print(f"   - {s:20s}: {storm_dict[s]['ids']} in {storm_dict[s]['districts']}")
