#!/usr/bin/env python3
"""Test the real migration in an isolated local PostgreSQL cluster, no Docker."""
from pathlib import Path
import subprocess,tempfile,shutil
root=Path(__file__).resolve().parent.parent
folder=Path(tempfile.mkdtemp(prefix='skill-loop-postgres-'))
started=False
try:
 subprocess.run(['initdb','-D',str(folder/'data'),'--no-locale','--encoding=UTF8','--auth=trust'],check=True,capture_output=True)
 subprocess.run(['pg_ctl','-D',str(folder/'data'),'-l',str(folder/'server.log'),'-o',f'-F -p 57432 -h 127.0.0.1 -k {folder}','-w','start'],check=True,capture_output=True);started=True
 def sql(text):
  r=subprocess.run(['psql','-h',str(folder),'-p','57432','-d','postgres','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr)
  return r.stdout
 sql("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;")
 sql((root/'supabase/migrations/20260909223000_skill_loop_history.sql').read_text())
 print(sql((root/'tests/database.sql').read_text()).split('result')[-1])
finally:
 if started:subprocess.run(['pg_ctl','-D',str(folder/'data'),'-m','immediate','-w','stop'],capture_output=True)
 shutil.rmtree(folder)
