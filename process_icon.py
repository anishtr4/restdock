
import sys
from PIL import Image
import numpy as np

def process_icon(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)

    # Define white threshold (e.g., pixels brighter than 240 in all channels)
    # We want to make "background" transparent.
    # Assuming the icon is a dark squircle on white.
    
    r, g, b, a = data.T
    
    # Identify white pixels (background)
    white_areas = (r > 240) & (g > 240) & (b > 240)
    
    # Make them transparent
    data[..., 3] = np.where(white_areas.T, 0, 255)
    
    img_transparent = Image.fromarray(data)
    
    # Now crop to content (remove transparent borders)
    bbox = img_transparent.getbbox()
    if bbox:
        img_cropped = img_transparent.crop(bbox)
    else:
        img_cropped = img_transparent

    # Save
    img_cropped.save(output_path)
    print(f"Saved processed icon to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <input> <output>")
    else:
        process_icon(sys.argv[1], sys.argv[2])
