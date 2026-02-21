import { createCanvas, loadImage } from 'canvas';
import GIFEncoder from 'gif-encoder-2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSpinningLogo() {
    const logoPath = path.join(__dirname, '../static/assets/logo.png');
    const outputPath = path.join(__dirname, '../static/assets/logo-spin.gif');
    
    // Load the logo
    const logo = await loadImage(logoPath);
    
    // GIF settings
    const size = 120; // Output size
    const frames = 36; // Number of frames (more = smoother)
    const delay = 30; // Delay between frames in ms
    
    // Create encoder
    const encoder = new GIFEncoder(size, size, 'neuquant', true);
    encoder.setDelay(delay);
    encoder.setRepeat(0); // 0 = loop forever
    encoder.setQuality(10); // Lower = better quality
    encoder.setTransparent(0x000000);
    
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Start encoding
    encoder.start();
    
    console.log('Generating spinning logo GIF...');
    
    // Generate frames
    for (let i = 0; i < frames; i++) {
        // Clear canvas with transparency
        ctx.clearRect(0, 0, size, size);
        
        // Calculate rotation angle
        const angle = (i / frames) * Math.PI * 2;
        
        // Save context
        ctx.save();
        
        // Move to center, rotate, then draw
        ctx.translate(size / 2, size / 2);
        ctx.rotate(angle);
        
        // Draw logo centered
        const logoSize = size * 0.9;
        ctx.drawImage(logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        
        // Restore context
        ctx.restore();
        
        // Add frame to GIF
        encoder.addFrame(ctx);
        
        process.stdout.write(`\rFrame ${i + 1}/${frames}`);
    }
    
    // Finish encoding
    encoder.finish();
    
    // Write to file
    const buffer = encoder.out.getData();
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`\n✅ Spinning logo saved to: ${outputPath}`);
    console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

createSpinningLogo().catch(console.error);
