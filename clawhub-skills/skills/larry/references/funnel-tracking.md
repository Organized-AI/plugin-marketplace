# Funnel Tracking — Postiz + RevenueCat Cross-Reference

## The Intelligence Loop

```
TikTok views (Postiz)
     ↓
App Store downloads (App Store Connect API)
     ↓
Trial starts (RevenueCat)
     ↓
Paid subscriptions (RevenueCat)
```

## Diagnosis Framework

| Symptom | Problem | Fix |
|---------|---------|-----|
| High views, low downloads | Content problem — hook attracts wrong audience | Rewrite hook, test new angle |
| High downloads, low trials | App problem — onboarding needs work | Fix first-run experience |
| High trials, low conversions | Value problem — paywall too early or unclear | Adjust trial length / paywall copy |
| Low views on everything | Distribution problem — account not warmed up | Run warmup protocol |

## Daily Report Query Logic

```js
// Postiz: get posts from last 7 days
const posts = await postiz.analytics.list({ days: 7 });

// For each post, pull metrics
for (const post of posts) {
  const views = post.metrics.impressions;
  const downloads = await appStore.getDownloadsForDate(post.publishedAt);
  const trials = await revenueCat.getTrialsForDate(post.publishedAt);
  const paid = await revenueCat.getPaidForDate(post.publishedAt);
  
  // Score the hook
  post.score = calculateHookScore(views, downloads, trials, paid);
}
```

## RevenueCat Integration
Install the RevenueCat skill: `clawhub install revenuecat`
Then set: `REVENUECAT_API_KEY=your_key`
