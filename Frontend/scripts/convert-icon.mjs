// Script para convertir PNG a ICO
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const inputPath = path.join(process.cwd(), 'build', 'icon.png');
const outputPath = path.join(process.cwd(), 'build', 'icon.ico');

console.log('Converting PNG to ICO...');
console.log('Input:', inputPath);
console.log('Output:', outputPath);

pngToIco(inputPath)
    .then(buf => {
        fs.writeFileSync(outputPath, buf);
        console.log('✅ ICO file created successfully!');
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
