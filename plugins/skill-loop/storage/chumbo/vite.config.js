import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
export default defineConfig({root:'supabase/functions/skill-loop/app',plugins:[viteSingleFile()],build:{outDir:'../dist',emptyOutDir:true}});
