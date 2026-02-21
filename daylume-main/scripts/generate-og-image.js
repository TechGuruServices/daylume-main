import sharp from 'sharp';
import path from 'path';

const WIDTH = 1200;
const HEIGHT = 630;

async function generateOGImage() {
    // Create a solid color base image first, then composite text as SVG overlay
    // This produces much crisper results than pure SVG rendering
    
    const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Clean solid background -->
        <rect width="100%" height="100%" fill="#0a0a0f"/>
        
        <!-- Top accent bar -->
        <rect x="0" y="0" width="${WIDTH}" height="5" fill="#8b5cf6"/>
        
        <!-- Centered purple glow circle (simple, no blur filter) -->
        <circle cx="600" cy="280" r="120" fill="#8b5cf6" opacity="0.15"/>
        <circle cx="600" cy="280" r="80" fill="#8b5cf6" opacity="0.1"/>
        
        <!-- Main title -->
        <text x="600" y="270" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="88" 
              font-weight="bold" 
              fill="#ffffff" 
              text-anchor="middle"
              dominant-baseline="middle">DAYLUME</text>
        
        <!-- Tagline -->
        <text x="600" y="360" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="32" 
              fill="#a78bfa" 
              text-anchor="middle">Bring Your Day Into Focus</text>
        
        <!-- Features line -->
        <text x="600" y="430" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="22" 
              fill="#64748b" 
              text-anchor="middle">AI-Powered Planner  •  Tasks  •  Habits  •  Goals  •  Journal</text>
        
        <!-- Bottom divider -->
        <rect x="450" y="500" width="300" height="2" fill="#8b5cf6" opacity="0.6"/>
        
        <!-- Powered by -->
        <text x="600" y="560" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="16" 
              fill="#475569" 
              text-anchor="middle">powered by TECHGURU</text>
        
        <!-- Decorative corners -->
        <rect x="40" y="40" width="60" height="3" fill="#8b5cf6" opacity="0.5"/>
        <rect x="40" y="40" width="3" height="60" fill="#8b5cf6" opacity="0.5"/>
        <rect x="1100" y="40" width="60" height="3" fill="#8b5cf6" opacity="0.5"/>
        <rect x="1157" y="40" width="3" height="60" fill="#8b5cf6" opacity="0.5"/>
        <rect x="40" y="587" width="60" height="3" fill="#8b5cf6" opacity="0.5"/>
        <rect x="40" y="530" width="3" height="60" fill="#8b5cf6" opacity="0.5"/>
        <rect x="1100" y="587" width="60" height="3" fill="#8b5cf6" opacity="0.5"/>
        <rect x="1157" y="530" width="3" height="60" fill="#8b5cf6" opacity="0.5"/>
    </svg>`;

    // Output to BOTH locations for maximum compatibility
    const outputRoot = path.join(process.cwd(), 'static', 'og-image.png');
    const outputAssets = path.join(process.cwd(), 'static', 'assets', 'og-image.png');
    
    // Generate high-quality PNG with maximum settings
    const buffer = await sharp(Buffer.from(svg), { density: 150 })
        .png({ 
            compressionLevel: 0,
            palette: false
        })
        .toBuffer();
    
    // Write to both locations
    await sharp(buffer).toFile(outputRoot);
    await sharp(buffer).toFile(outputAssets);
    
    console.log('✅ OG images generated!');
    console.log(`📍 Root: ${outputRoot}`);
    console.log(`📍 Assets: ${outputAssets}`);
    console.log(`📐 Size: ${WIDTH}x${HEIGHT}px`);
}

generateOGImage().catch(console.error);
