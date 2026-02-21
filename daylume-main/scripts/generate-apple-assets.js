/**
 * Generate Apple PWA Assets
 * Creates apple-touch-icon and splash screens for iOS
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const STATIC_DIR = './static/assets';
const SPLASH_DIR = './static/assets/splash';
const SOURCE_LOGO = './static/assets/logo.png';

// Apple splash screen sizes for different devices
const splashScreens = [
    // iPhone 15 Pro Max, 14 Pro Max
    { width: 1290, height: 2796, name: 'apple-splash-2796-1290.png' },
    { width: 2796, height: 1290, name: 'apple-splash-1290-2796.png' },
    // iPhone 15 Pro, 15, 14 Pro
    { width: 1179, height: 2556, name: 'apple-splash-2556-1179.png' },
    { width: 2556, height: 1179, name: 'apple-splash-1179-2556.png' },
    // iPhone 14, 13 Pro, 13, 12 Pro, 12
    { width: 1170, height: 2532, name: 'apple-splash-2532-1170.png' },
    { width: 2532, height: 1170, name: 'apple-splash-1170-2532.png' },
];

// Background color matching the app
const BACKGROUND_COLOR = '#020617';
const LOGO_SIZE_RATIO = 0.25; // Logo takes 25% of smallest dimension

async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
}

async function generateAppleTouchIcon() {
    const outputPath = path.join(STATIC_DIR, 'apple-touch-icon.png');
    
    try {
        // Create 180x180 apple touch icon with padding
        const iconSize = 180;
        const logoSize = Math.floor(iconSize * 0.75);
        const padding = Math.floor((iconSize - logoSize) / 2);
        
        await sharp(SOURCE_LOGO)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } })
            .extend({
                top: padding,
                bottom: padding,
                left: padding,
                right: padding,
                background: { r: 2, g: 6, b: 23, alpha: 1 }
            })
            .png()
            .toFile(outputPath);
        
        console.log(`✅ Generated: ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error generating apple-touch-icon: ${error.message}`);
    }
}

async function generateSplashScreen(config) {
    const { width, height, name } = config;
    const outputPath = path.join(SPLASH_DIR, name);
    
    try {
        // Calculate logo size
        const minDim = Math.min(width, height);
        const logoSize = Math.floor(minDim * LOGO_SIZE_RATIO);
        
        // Create the splash screen
        const background = sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 2, g: 6, b: 23, alpha: 1 }
            }
        });
        
        // Resize logo
        const logo = await sharp(SOURCE_LOGO)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
        
        // Calculate center position
        const left = Math.floor((width - logoSize) / 2);
        const top = Math.floor((height - logoSize) / 2);
        
        // Composite logo onto background
        await background
            .composite([{ input: logo, left, top }])
            .png()
            .toFile(outputPath);
        
        console.log(`✅ Generated: ${name} (${width}x${height})`);
    } catch (error) {
        console.error(`❌ Error generating ${name}: ${error.message}`);
    }
}

async function main() {
    console.log('🍎 Generating Apple PWA Assets...\n');
    
    // Check if source logo exists
    if (!fs.existsSync(SOURCE_LOGO)) {
        console.error(`❌ Source logo not found: ${SOURCE_LOGO}`);
        console.log('Using favicon as fallback...');
        // Try to use favicon as fallback
        const fallback = './static/assets/favicon-512.png';
        if (fs.existsSync(fallback)) {
            fs.copyFileSync(fallback, SOURCE_LOGO);
        } else {
            console.error('No suitable source image found. Please add a logo.png to static/assets/');
            process.exit(1);
        }
    }
    
    // Ensure splash directory exists
    await ensureDir(SPLASH_DIR);
    
    // Generate apple touch icon
    await generateAppleTouchIcon();
    
    // Generate all splash screens
    console.log('\n📱 Generating splash screens...');
    for (const config of splashScreens) {
        await generateSplashScreen(config);
    }
    
    console.log('\n✨ Apple PWA assets generation complete!');
}

main().catch(console.error);
