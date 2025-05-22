import os
import subprocess
import sys

# Ensure Pillow is installed
try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

class IconResizer:
    def __init__(self, input_image_path, output_folder, base_filename):
        self.input_image_path = input_image_path
        self.output_folder = output_folder
        self.base_filename = base_filename
        self.sizes = [(16, 16), (48, 48), (128, 128)]

    def resize_and_save(self):
        if not os.path.exists(self.input_image_path):
            print(f"❌ Input file not found: {self.input_image_path}")
            return

        os.makedirs(self.output_folder, exist_ok=True)

        # Compatibility with Pillow 10+ and older versions
        try:
            resample_filter = Image.Resampling.LANCZOS
        except AttributeError:
            resample_filter = Image.ANTIALIAS

        try:
            with Image.open(self.input_image_path) as img:
                for width, height in self.sizes:
                    resized = img.resize((width, height), resample_filter)
                    # filename without underscore, directly base name + size
                    filename = f"{self.base_filename}{width}.png"
                    output_path = os.path.join(self.output_folder, filename)
                    resized.save(output_path, format='PNG')
                    print(f"✅ Saved: {output_path}")
        except Exception as e:
            print(f"❌ Failed to process image: {e}")

def main():
    print("=== Icon Resizer ===")
    input_path = input("Enter path to source image (e.g. icon.png): ").strip()
    output_dir = input("Enter output folder path: ").strip()
    base_name = input("Enter base filename (without extension): ").strip()

    resizer = IconResizer(input_image_path=input_path,
                          output_folder=output_dir,
                          base_filename=base_name)
    resizer.resize_and_save()

    input("🎯 Done. Press Enter to exit...")

if __name__ == "__main__":
    main()

