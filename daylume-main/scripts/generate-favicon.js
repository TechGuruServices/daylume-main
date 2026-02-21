import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../static/assets/icon.png');
const outputIco = path.join(__dirname, '../static/assets/favicon.ico');
const output192 = path.join(__dirname, '../static/assets/favicon-192.png');
const output512 = path.join(__dirname, '../static/assets/favicon-512.png');

async function generateFavicons() {
    try {
        console.log('Reading source icon...');
        const inputBuffer = fs.readFileSync(inputPath);

        // Generate 192x192 PNG
        console.log('Generating favicon-192.png...');
        await sharp(inputBuffer)
            .resize(192, 192)
            .png()
            .toFile(output192);

        // Generate 512x512 PNG
        console.log('Generating favicon-512.png...');
        await sharp(inputBuffer)
            .resize(512, 512)
            .png()
            .toFile(output512);

        // Generate multiple sizes for ICO
        console.log('Generating favicon.ico...');
        const sizes = [16, 32, 48, 64, 128, 256];
        const pngBuffers = await Promise.all(
            sizes.map(size => 
                sharp(inputBuffer)
                    .resize(size, size)
                    .png()
                    .toBuffer()
            )
        );

        // Convert to ICO
        const icoBuffer = await pngToIco(pngBuffers);
        fs.writeFileSync(outputIco, icoBuffer);

        console.log('✅ All favicons generated successfully!');
        console.log('   - favicon.ico (16, 32, 48, 64, 128, 256px)');
        console.log('   - favicon-192.png');
        console.log('   - favicon-512.png');
    } catch (error) {
        console.error('Error generating favicons:', error);
        process.exit(1);
    }
}

generateFavicons();
