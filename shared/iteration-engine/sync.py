#!/usr/bin/env python3
"""Bundle shared mechanics so plugins remain independently installable."""
from pathlib import Path
import argparse, shutil
root=Path(__file__).resolve().parents[2]
targets=[root/'plugins/skill-loop/scripts/shared',root/'fix-your-tracking/.claude/skills/gtm-autoresearch-loop/scripts/runtime/shared']
targets += [root/name/'skills/gtm-autoresearch-loop/scripts/runtime/shared' for name in ['gtm-ai-plugin','gtm-audit-pro']]
check=argparse.ArgumentParser();check.add_argument('--check',action='store_true');args=check.parse_args()
for target in targets:
 for source in Path(__file__).parent.glob('*.mjs'):
  dest=target/source.name
  if args.check:
   assert dest.exists() and dest.read_bytes()==source.read_bytes(),f'Bundle drift: {dest}'
  else:
   target.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
