
import sharp from 'sharp';
import path from 'path';

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
    console.error("Usage: node process_icon.js <input> <output>");
    process.exit(1);
}

sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
        const pixelArray = new Uint8ClampedArray(data.buffer);

        for (let i = 0; i < pixelArray.length; i += 4) {
            const r = pixelArray[i];
            const g = pixelArray[i + 1];
            const b = pixelArray[i + 2];

            // If near white, make transparent
            if (r > 240 && g > 240 && b > 240) {
                pixelArray[i + 3] = 0;
            }
        }

        return sharp(pixelArray, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
            .trim()
            .toBuffer({ resolveWithObject: true });
    })
    .then(({ data, info }) => {
        // Now resize/pad to make it square
        const size = Math.max(info.width, info.height);

        return sharp(data, {
            raw: { width: info.width, height: info.height, channels: 4 }
        })
            .extend({
                top: Math.floor((size - info.height) / 2),
                bottom: Math.ceil((size - info.height) / 2),
                left: Math.floor((size - info.width) / 2),
                right: Math.ceil((size - info.width) / 2),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(output);
    })
    .then(info => console.log('Processed square image:', info))
    .catch(err => console.error('Error:', err));
