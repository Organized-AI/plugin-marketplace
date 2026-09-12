#!/usr/bin/env python3
"""Bundle the engine and optional connected backend without local caches/secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse, os
p=argparse.ArgumentParser();p.add_argument('output');args=p.parse_args()
root=Path(__file__).resolve().parent.parent
out=Path(args.output).resolve();out.parent.mkdir(parents=True,exist_ok=True)
skip={'node_modules','.temp','.branches','__pycache__','.git','.cache','.wrangler','.venv','venv','coverage'}
def ignored(name):
 return name in skip or name.startswith('.env') or name.startswith('.dev.vars') or name.lower().split('.')[0] in {'credentials','secrets','tokens'}
allowed={'.mjs','.js','.md','.json','.sql','.toml','.ts','.html','.css','.lock','.example','.py','.sh'}
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 z.write(root/'chat/SKILL.md','skill-loop/SKILL.md')
 for folder in ['scripts','examples','storage','setup']:
  for directory,dirs,files in os.walk(root/folder,followlinks=False):
   dirs[:]=sorted(n for n in dirs if not ignored(n) and not (Path(directory)/n).is_symlink())
   for name in sorted(files):
    f=Path(directory)/name
    if ignored(name) or f.is_symlink() or not f.is_file() or not f.resolve().is_relative_to(root):continue
    if f.suffix in allowed or f.name=='LICENSE':z.write(f,Path('skill-loop')/f.relative_to(root))
print(out)
