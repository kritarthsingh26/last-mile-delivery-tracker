const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf8');

// Replace brand strings back to Last-Mile
pageContent = pageContent.replace(/SwiftMile Logistics/g, 'Last-Mile Delivery Tracker');
pageContent = pageContent.replace(/SwiftMile Tracker/g, 'Last-Mile Tracker');

fs.writeFileSync(pagePath, pageContent, 'utf8');
console.log('Renamed brand back in page.tsx successfully!');

const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Replace metadata back to Last-Mile
layoutContent = layoutContent.replace(/title: "SwiftMile Logistics"/g, 'title: "Last-Mile Delivery Tracker"');
layoutContent = layoutContent.replace(/description: "Logistics Operations and Delivery Management Dashboard"/g, 'description: "Last-Mile Delivery Tracker operations and dashboard"');

fs.writeFileSync(layoutPath, layoutContent, 'utf8');
console.log('Renamed metadata back in layout.tsx successfully!');
