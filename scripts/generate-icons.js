// Simple script to generate PWA icons as data URIs
// For now, we'll use inline SVG-based icons
const fs = require('fs');
const path = require('path');

// Create a simple PNG-like icon using a 1x1 pixel approach
// In production, replace with real PNG icons

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#6366f1"/>
  <text x="96" y="125" text-anchor="middle" font-size="100" font-weight="bold" fill="white" font-family="Arial,sans-serif">G</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#6366f1"/>
  <text x="256" y="330" text-anchor="middle" font-size="260" font-weight="bold" fill="white" font-family="Arial,sans-serif">G</text>
</svg>`;

fs.writeFileSync(path.join(__dirname, '../public/icon-192.png'), Buffer.from(svg192));
fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), Buffer.from(svg512));

console.log('Icons generated (SVG fallback - replace with real PNGs for production)');
