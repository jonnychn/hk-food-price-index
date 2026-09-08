# HK Food Price Index

Search, compare, and bookmark supermarket prices from the Hong Kong Consumer Council **Online Price Watch** open data.

Live data: [data.gov.hk package `cc-pricewatch-pricewatch`](https://data.gov.hk/en-data/dataset/cc-pricewatch-pricewatch)

## Features

- Daily prices across Wellcome, PARKnSHOP, Market Place, AEON, Watsons, Mannings, and more
- Category navigation (fresh & staples, dairy, bakery, drinks, …)
- Search by brand, product, or category (English / 繁體)
- Food price index trendline from data.gov.hk historical archives
- Category averages and “who is cheapest most often”
- Bookmark products into folders, with a personal price history on repeat visits
- Desktop sidebar + mobile category chips and bottom nav

## Data

- Current snapshot: `https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json`
- Package metadata: `https://data.gov.hk/en-data/api/3/action/package_show?id=cc-pricewatch-pricewatch`
- Historical weekly index: data.gov.hk historical archive of the English CSV

Intellectual property of the dataset belongs to the Consumer Council. This app is an independent viewer.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` deploy on Vercel.
