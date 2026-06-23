import os
import glob
import json

base_dir = "data/sap-o2c-data"
for d in os.listdir(base_dir):
    path = os.path.join(base_dir, d)
    if os.path.isdir(path):
        files = glob.glob(os.path.join(path, "*.jsonl"))
        if files:
            with open(files[0], 'r') as f:
                first_line = f.readline()
                if first_line:
                    data = json.loads(first_line)
                    print(f"\n--- {d} ---")
                    print(list(data.keys()))
