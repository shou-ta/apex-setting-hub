from PIL import Image, ImageDraw

image = Image.new("RGBA", (256, 256), (12, 19, 29, 255))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((8, 8, 248, 248), radius=48, fill=(24, 36, 51, 255), outline=(67, 88, 109, 255), width=4)
draw.polygon([(128, 31), (217, 213), (170, 213), (128, 119), (86, 213), (39, 213)], fill=(238, 88, 69, 255))
draw.polygon([(128, 170), (143, 202), (113, 202)], fill=(24, 36, 51, 255))
image.save("src-tauri/icons/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
image.save("src-tauri/icons/icon.png")
