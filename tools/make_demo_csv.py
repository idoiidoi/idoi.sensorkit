#!/usr/bin/env python3
"""Generate help/idoi.sensorkit.demo.csv, a 20 s recording used by the help patches.

Same format as idoi.datarecorder writes: unix_ms, elapsed_ms, then the data
columns. ax/ay draw a Lissajous-like figure (nice in the plotter's xy mode),
pressure moves slowly. Two marker rows are included.
"""

import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "help" / "idoi.sensorkit.demo.csv"
RATE = 50
SECONDS = 20
T0 = 1791123600000  # fixed so the file is reproducible

random.seed(1)
lines = ["unix_ms,elapsed_ms,ax,ay,pressure"]
markers = {5000: "marker,start", 12000: "marker,peak"}
for i in range(RATE * SECONDS + 1):
    ms = i * 1000 // RATE
    if ms in markers:
        lines.append(f"{T0 + ms},{ms},{markers[ms]}")
    t = ms / 1000
    ax = 0.8 * math.cos(1.3 * t) + random.gauss(0, 0.02)
    ay = 0.6 * math.sin(2.1 * t) + random.gauss(0, 0.02)
    pressure = 0.5 + 0.4 * math.sin(0.4 * t) + random.gauss(0, 0.01)
    lines.append(f"{T0 + ms},{ms},{ax:.4f},{ay:.4f},{pressure:.4f}")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines) + "\n")
print(f"wrote {OUT} ({len(lines) - 1} rows)")
