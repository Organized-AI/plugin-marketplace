#!/usr/bin/env node
// Larry — Daily Funnel Report
// Cross-references Postiz → App Store → RevenueCat
// Usage: node report.js --verbose --days 7

const days = parseInt(process.argv[process.argv.indexOf('--days') + 1] || '7');
const verbose = process.argv.includes('--verbose');

async function runReport() {
  console.log(`\n=== Larry Daily Report (last ${days} days) ===\n`);

  const POSTIZ_KEY = process.env.POSTIZ_API_KEY;
  const RC_KEY = process.env.REVENUECAT_API_KEY;

  if (!POSTIZ_KEY) { console.error('✗ POSTIZ_API_KEY not set'); process.exit(1); }

  try {
    // Fetch posts from Postiz
    const postsRes = await fetch(`https://api.postiz.com/public/v1/posts?days=${days}`, {
      headers: { Authorization: `Bearer ${POSTIZ_KEY}` }
    });
    const { posts } = await postsRes.json();

    console.log(`Posts analyzed: ${posts?.length || 0}\n`);

    for (const post of (posts || []).slice(0, 10)) {
      const views = post.metrics?.impressions || 0;
      const likes = post.metrics?.likes || 0;
      const ctr = views > 0 ? ((likes / views) * 100).toFixed(2) : '0';

      console.log(`📱 ${post.publishedAt?.slice(0,10)} | 👁 ${views.toLocaleString()} views | ❤ ${likes} | CTR ${ctr}%`);
      if (verbose) console.log(`   Hook: "${post.content?.slice(0,80)}"`);

      // Diagnose
      if (views > 50000 && likes < views * 0.01) {
        console.log('   ⚠ CONTENT PROBLEM: high views but low engagement — wrong audience');
      }
    }

    console.log('\n📊 Funnel Summary:');
    console.log('   Views → Downloads: Run with REVENUECAT_API_KEY for full funnel');
    if (!RC_KEY) console.log('   💡 Install RevenueCat skill: clawhub install revenuecat');

  } catch (err) {
    console.error(`Report failed: ${err.message}`);
    console.error('Check POSTIZ_API_KEY and network connection');
  }
}

runReport().catch(console.error);
