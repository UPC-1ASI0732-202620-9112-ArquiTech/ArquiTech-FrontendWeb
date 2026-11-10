import argparse
import csv
import hashlib
import tarfile
from pathlib import Path

review = Path(__file__).resolve().parent
results = review.parent
root = results / "agent-runs"
packages = results / ".evidence-packages"
packages.mkdir(exist_ok=True)
with (review / "inventory.csv").open(newline="", encoding="utf-8") as source:
    inventory = list(csv.DictReader(source))
parser = argparse.ArgumentParser()
parser.add_argument("--rebuild", action="append", default=[])
options = parser.parse_args()
assets = []
for name in sorted({row["asset"] for row in inventory if row["asset"]}):
    members = {row["path"]: row for row in inventory if row["asset"] == name}
    path = packages / name
    if name in options.rebuild:
        with tarfile.open(path, "w:gz", compresslevel=1, format=tarfile.PAX_FORMAT) as archive:
            for member in members:
                archive.add(root / member, arcname=member, recursive=False)
    with tarfile.open(path, "r|gz") as archive:
        seen = set()
        for item in archive:
            if item.name not in members or item.name in seen or not item.isfile():
                raise ValueError(f"Unexpected member in {name}: {item.name}")
            row = members[item.name]
            with archive.extractfile(item) as data:
                digest = hashlib.file_digest(data, "sha256").hexdigest()
            if digest != row["sha256"] or item.size != int(row["bytes"]):
                raise ValueError(f"Member mismatch in {name}: {item.name}")
            seen.add(item.name)
        if seen != set(members):
            raise ValueError(f"Missing members in {name}")
    with path.open("rb") as data:
        digest = hashlib.file_digest(data, "sha256").hexdigest()
    assets.append((name, path.stat().st_size, digest, len(members)))
    print(f"{name}: {len(members)} members, {path.stat().st_size} bytes, {digest}", flush=True)
with (review / "assets.csv").open("w", newline="", encoding="utf-8") as output:
    writer = csv.writer(output, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writerow(("asset", "bytes", "sha256", "files"))
    writer.writerows(assets)
