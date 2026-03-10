#!/usr/bin/env python3
import runpy
from pathlib import Path


TARGET = Path(__file__).resolve().parents[1] / "core/skills/trade-operations-workflow/scripts/trade_generate_quote_from_bitable.py"


if __name__ == "__main__":
    runpy.run_path(str(TARGET), run_name="__main__")
