# Sydney Diving — Gas Tools

Simple, fast scuba gas utilities for **nitrox/trimix blending** and **EAN planning** — built as a lightweight static site (HTML/CSS/JS).

**Live:** https://sydneydiving.com.au/gastools/  
**Author / Project:** @sydneydiving

> ⚠️ **Planning aid only.** Always analyse your final gas and dive within your training, procedures, and dive computer limits.

---

## What it does

### 1) Blend (Nitrox / Trimix)
Calculate how much to add (in **bar**) when blending a target mix to a final pressure using:
- **Pure O₂**
- **Pure He**
- A chosen **top‑up gas** (e.g. air = 21% O₂)

It supports:
- **Top‑up mode**: tank already contains gas (start O₂/He and start pressure) 
- **Empty mode**: assume tank starts at 0 bar and blend to target 
- **Drain suggestion**: if the target isn’t reachable from the current start pressure, the tool may recommend a **“Drain to”** pressure first (minimum bleed)
### 2) EAN Plan
Quick nitrox planning helpers:
- **MOD** (given PPO₂ limit)
- **Best mix** for a depth and PPO₂ limit
- **EAD** (Equivalent Air Depth) 

Includes **Copy to plan** which copies the target O₂% from Blend into EAN Plan.
---

## How to use

### Blend (Top‑up)
