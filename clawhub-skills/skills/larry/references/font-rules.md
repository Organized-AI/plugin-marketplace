# Text Overlay Rules — 500 Lines of Lessons

These rules were learned from failure. Every single one was wrong first.

## Font Size
- **Rule**: Font = 6.5% of image height
- **Why**: At 1920px tall, that's ~125px. Smaller = unreadable on phones. Bigger = cuts off.
- **Code**: `fontSize = imageHeight * 0.065`

## Safe Zones (TikTok UI hides parts of the image)
```
┌─────────────────────┐
│  STATUS BAR (10%)   │ ← hidden — never place text here
│─────────────────────│
│                     │
│   SAFE TEXT ZONE    │ ← text must live between 30% and 80%
│   (30% → 80%)       │
│                     │
│─────────────────────│
│ CAPTIONS/BUTTONS    │ ← hidden — never place text here
│    (bottom 20%)     │
└─────────────────────┘
```

- **Top position**: Start text at 30% from top
- **Bottom boundary**: End text by 80% from top (20% buffer for buttons)

## Line Breaking
- **Rule**: Break every 4–6 words
- **Why**: Canvas renderer squashes horizontal text. Short lines render cleanly.
- **Bad**: `"Transform your productivity with this one simple habit"`
- **Good**: `"Transform your productivity\nwith this one simple habit"`

## Font Choice
- Sans-serif only — serifs render poorly at small sizes on mobile
- Bold weight for readability
- High contrast: white text with dark shadow, or dark text with light shadow
- Shadow: `2px 2px 8px rgba(0,0,0,0.8)` minimum

## Color Rules
- **Never**: brand colors that blend with the image
- **Always**: test contrast on both bright and dark image regions
- White + black shadow works 95% of the time

## Hook Text Formula (tested)
- Line 1 (hook): Bold claim or question — 4–6 words
- Line 2 (context): Brief setup — 4–8 words  
- Line 3 (payoff): Result or action — 4–6 words
