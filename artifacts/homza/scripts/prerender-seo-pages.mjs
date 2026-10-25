import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../dist/public');
const template = await readFile(path.join(output, 'index.html'), 'utf8');

const pages = [
  {
    path: '/',
    title: 'Homza Uganda | Find a Home to Rent',
    description: 'Find homes to rent in Kampala, Wakiso, Entebbe and across Uganda with Homza. Compare property details and connect with property owners.',
    heading: 'Find a place to feel at home with Homza',
    body: 'Discover homes to rent in Kampala, Wakiso, Entebbe and across Uganda. Compare property details, explore locations and connect with property owners.',
    extra: 'Homza makes the Ugandan rental search clearer, with home listings and useful details to help you choose your next place.',
  },
  {
    path: '/properties',
    title: 'Homes for Rent in Uganda | Homza',
    description: 'Browse homes and rental properties in Kampala, Wakiso, Entebbe and across Uganda. Compare rent, locations, bedrooms and property details.',
    heading: 'Homes for rent across Uganda',
    body: 'Explore rental homes and property listings in Kampala, Wakiso, Entebbe and other areas of Uganda. Review rent, location, bedrooms and listing details before contacting an owner.',
    extra: 'Use Homza to compare available property information and narrow your search to a home that suits your needs and budget.',
  },
  {
    path: '/search',
    title: 'Search Rental Homes in Uganda | Homza',
    description: 'Search homes for rent by neighbourhood, district and budget across Kampala and other parts of Uganda.',
    heading: 'Search for your next home',
    body: 'Find rental homes by area and budget across Kampala and other parts of Uganda. Compare listing details and explore properties that fit your requirements.',
    extra: 'Start with the homes page to browse available listings and refine your search.',
  },
  {
    path: '/about',
    title: 'About Homza | A Clearer Way to Find a Home',
    description: 'Learn how Homza helps people in Uganda discover rental homes with clearer property details and ways to contact owners.',
    heading: 'A clearer way to find a home',
    body: 'Homza is a property marketplace built to make finding and managing rental homes in Uganda simpler. We bring property information and ways to contact owners into one place.',
    extra: 'Our goal is to help people compare details more confidently, spot useful information and spend less time on dead ends during their home search.',
  },
  {
    path: '/contact',
    title: 'Contact Homza | Help with Homes and Listings',
    description: 'Contact the Homza team for help finding a home, listing a property or reporting a concern in Uganda.',
    heading: 'Contact Homza',
    body: 'Need help with a home search, a property listing or a concern about information on Homza? Use the contact options on this page to get in touch with the team.',
    extra: 'When reporting a listing, include the property link and a clear explanation so the team can review the concern.',
  },
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

for (const page of pages) {
  const canonical = `https://homza-chi.vercel.app${page.path === '/' ? '/' : page.path}`;
  const description = escapeHtml(page.description);
  const title = escapeHtml(page.title);
  const fallback = `<main><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.body)}</p><p>${escapeHtml(page.extra)}</p><nav aria-label="Main pages"><a href="/">Home</a><a href="/properties">Find homes</a><a href="/search">Search homes</a><a href="/about">About Homza</a><a href="/contact">Contact Homza</a></nav></main>`;
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${description}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/i, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/i, `<meta name="twitter:description" content="${description}" />`);
  html = html.replace(/<meta name="robots" content="[^"]*"\s*\/>/i, '<meta name="robots" content="index, follow, max-image-preview:large" />');
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/i, '');
  html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n  </head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<script type="module"/, `<div id="root">${fallback}</div>\n    <script type="module"`);
  const destination = page.path === '/' ? path.join(output, 'index.html') : path.join(output, page.path.slice(1), 'index.html');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, 'utf8');
  console.log(`Prerendered ${page.path} -> ${path.relative(output, destination)}`);
}
