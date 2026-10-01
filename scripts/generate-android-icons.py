from PIL import Image, ImageDraw, ImageOps
from pathlib import Path

src = Path(
    r"C:\Users\bebo\.cursor\projects\d-CH-u-beshoy-reservations\assets\c__Users_bebo_AppData_Roaming_Cursor_User_workspaceStorage_688bdb544a442c04bbadb0ffe6dcf811_images_670258679_122131100517019586_7778208859178141985_n__1_-c6021fc3-9e6d-4d28-a6c5-3b386dfa2a77.jpg"
)
root = Path(r"D:\CH\u-beshoy-reservations\android\app\src\main\res")
img = Image.open(src).convert("RGBA")

w, h = img.size
size = min(w, h)
left = (w - size) // 2
top = (h - size) // 2
sq = img.crop((left, top, left + size, top + size))
mask = Image.new("L", (size, size), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((1, 1, size - 2, size - 2), fill=255)
circ = Image.new("RGBA", (size, size), (0, 0, 0, 0))
circ.paste(sq, (0, 0))
circ.putalpha(mask)

densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
fg_sizes = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

for folder, px in densities.items():
    out_dir = root / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    icon = circ.resize((px, px), Image.Resampling.LANCZOS)
    icon.save(out_dir / "ic_launcher.png")
    icon.save(out_dir / "ic_launcher_round.png")

for folder, px in fg_sizes.items():
    out_dir = root / folder
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    content = int(px * 0.72)
    logo = circ.resize((content, content), Image.Resampling.LANCZOS)
    offset = (px - content) // 2
    canvas.paste(logo, (offset, offset), logo)
    canvas.save(out_dir / "ic_launcher_foreground.png")

drawable = root / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
circ.resize((256, 256), Image.Resampling.LANCZOS).save(
    drawable / "ic_onesignal_large_icon_default.png"
)

# White silhouette for status bar (Android guideline)
alpha = circ.split()[-1]
# Boost contrast: keep opaque pixels white
stat_src = Image.new("RGBA", circ.size, (255, 255, 255, 0))
stat_src.putalpha(alpha)
stat = stat_src.resize((96, 96), Image.Resampling.LANCZOS)
a = stat.split()[-1]
white = Image.merge(
    "RGBA",
    (
        Image.new("L", stat.size, 255),
        Image.new("L", stat.size, 255),
        Image.new("L", stat.size, 255),
        a,
    ),
)
white.save(drawable / "ic_stat_onesignal_default.png")

assets = Path(r"D:\CH\u-beshoy-reservations\assets")
assets.mkdir(exist_ok=True)
circ.resize((512, 512), Image.Resampling.LANCZOS).save(assets / "app-icon.png")
print("ICONS_OK")
