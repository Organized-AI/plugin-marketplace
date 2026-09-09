#!/usr/bin/env python3
"""Bundle the shared engine as a Claude Chat skill upload, with local paths."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
p=argparse.ArgumentParser();p.add_argument('output');args=p.parse_args()
root=Path(__file__).resolve().parent.parent
out=Path(args.output).resolve();out.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 z.write(root/'chat/SKILL.md','skill-loop/SKILL.md')
 for folder in ['scripts','examples']:
  for f in sorted((root/folder).rglob('*')):
   if f.is_file() and (f.suffix in ['.mjs','.js','.md','.json'] or f.name=='LICENSE'):
    z.write(f,Path('skill-loop')/f.relative_to(root))
print(out)
