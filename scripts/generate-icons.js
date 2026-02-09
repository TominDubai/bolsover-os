// Generate PWA icons using canvas
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// We'll create a simple script that can be run with sharp or canvas
// For now, create placeholder instructions

const sizes = [192, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Check if we can use sharp
try {
  const sharp = require('sharp');
  
  sizes.forEach(size => {
    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.167}" fill="#3b82f6"/>
      <text x="${size/2}" y="${size * 0.625}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.42}" font-weight="bold" fill="white">B</text>
    </svg>`;
    
    sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`))
      .then(() => console.log(`Created icon-${size}.png`))
      .catch(err => console.error(`Error creating icon-${size}.png:`, err));
  });
} catch (e) {
  console.log('sharp not installed. Installing...');
  console.log('Run: npm install sharp --save-dev');
  console.log('Then: node scripts/generate-icons.js');
  
  // Create placeholder files so the app doesn't break
  sizes.forEach(size => {
    // Create a minimal valid 1x1 blue PNG as placeholder
    const placeholder = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0x38, 0x58, 0xF2, 0x0F,
      0x00, 0x02, 0x1F, 0x01, 0x1E, 0x47, 0x56, 0xD8,
      0x56, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(path.join(outputDir, `icon-${size}.png`), placeholder);
    console.log(`Created placeholder icon-${size}.png`);
  });
}
