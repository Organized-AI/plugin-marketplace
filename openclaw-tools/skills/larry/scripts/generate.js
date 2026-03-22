#!/usr/bin/env node
// Larry — Slide Generator
// Generates 6 portrait images with locked scene architecture
// Usage: node generate.js --app "habit tracker for ADHD" --slides 6 --lock-scene

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const appDesc = args[args.indexOf('--app') + 1] || 'app';
const outputDir = args[args.indexOf('--output') + 1] || './output/' + new Date().toISOString().slice(0,10);
const slideCount = parseInt(args[args.indexOf('--slides') + 1] || '6');

// Style variations — only this changes across slides (scene stays locked)
const STYLE_VARIANTS = [
  'photorealistic, professional product photography, warm natural light',
  'soft watercolor illustration, gentle pastel tones',
  'flat design vector art, bold colors, minimal shadows',
  'cinematic photography, dramatic lighting, high contrast',
  'isometric 3D illustration, clean geometric shapes',
  'lifestyle photography, candid authentic moment',
];

async function generateSlides() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('✗ OPENAI_API_KEY not set');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Research competitor hooks first
  const sceneBase = `Modern minimalist environment, person using ${appDesc} on their phone`;

  console.log(`Generating ${slideCount} slides for: ${appDesc}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Scene (LOCKED): ${sceneBase}`);
  console.log('');

  for (let i = 0; i < Math.min(slideCount, STYLE_VARIANTS.length); i++) {
    const prompt = `${sceneBase}, ${STYLE_VARIANTS[i]}, portrait orientation 9:16, 1080x1920, high quality`;
    console.log(`Slide ${i + 1}: ${STYLE_VARIANTS[i]}`);

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // ALWAYS use gpt-image-1.5 — never gpt-image-1
      const response = await client.images.generate({
        model: 'gpt-image-1.5',
        prompt,
        size: '1024x1792', // closest to 9:16 portrait
        quality: 'high',
        n: 1,
      });

      const imageUrl = response.data[0].url;
      const outputPath = path.join(outputDir, `slide-${String(i+1).padStart(2,'0')}.png`);
      
      // Download and save
      const res = await fetch(imageUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      console.log(`  ✓ Saved: ${outputPath}`);
    } catch (err) {
      console.error(`  ✗ Slide ${i+1} failed: ${err.message}`);
    }
  }

  // Save metadata for overlay script
  const meta = { appDesc, sceneBase, styles: STYLE_VARIANTS.slice(0, slideCount), outputDir, generated: new Date().toISOString() };
  fs.writeFileSync(path.join(outputDir, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\n✓ Generation complete. Run overlay.js next.');
}

generateSlides().catch(console.error);
