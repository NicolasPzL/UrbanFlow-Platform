from PIL import Image, ImageDraw, ImageFont
import os

BLUE = (0, 75, 133, 255)
WHITE = (255, 255, 255, 255)

OUTPUT_DIR = os.path.join('public')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_icon(size: int) -> Image.Image:
    """Generate the UrbanFlow circular icon with transparent background."""
    base_size = size * 4  # trabajar en alta resolución y luego escalar
    img = Image.new("RGBA", (base_size, base_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    padding = int(base_size * 0.05)
    circle_bbox = [padding, padding, base_size - padding, base_size - padding]
    draw.ellipse(circle_bbox, fill=BLUE)

    # Cable
    cable_width = int(base_size * 0.07)
    cable_start = (base_size * 0.12, base_size * 0.24)
    cable_end = (base_size * 0.88, base_size * 0.12)
    draw.line([cable_start, cable_end], fill=WHITE, width=cable_width)

    # Gancho
    hook_t = 0.45
    hook_x = cable_start[0] + (cable_end[0] - cable_start[0]) * hook_t
    hook_y = cable_start[1] + (cable_end[1] - cable_start[1]) * hook_t
    draw.line(
        [(hook_x, hook_y), (hook_x, base_size * 0.48)],
        fill=WHITE,
        width=cable_width,
    )

    # Cabina
    cab_width = base_size * 0.36
    cab_height = base_size * 0.26
    cab_left = (base_size - cab_width) / 2
    cab_top = base_size * 0.48
    cab_bbox = [cab_left, cab_top, cab_left + cab_width, cab_top + cab_height]
    draw.rounded_rectangle(cab_bbox, radius=base_size * 0.08, fill=WHITE)

    # Ventanas
    window_gap_x = cab_width * 0.14
    window_gap_y = cab_height * 0.22
    window_width = (cab_width - window_gap_x * 3) / 2
    window_height = cab_height - window_gap_y * 2
    for idx in range(2):
        left = cab_left + window_gap_x + idx * (window_width + window_gap_x)
        top = cab_top + window_gap_y
        window_bbox = [left, top, left + window_width, top + window_height]
        draw.rounded_rectangle(window_bbox, radius=base_size * 0.05, fill=BLUE)

    # Olas
    wave_width = int(base_size * 0.13)
    wave_boxes = [
        [base_size * 0.04, base_size * 0.62, base_size * 0.96, base_size * 1.08],
        [base_size * 0.02, base_size * 0.70, base_size * 0.94, base_size * 1.16],
        [base_size * 0.00, base_size * 0.78, base_size * 0.92, base_size * 1.24],
    ]
    for bbox in wave_boxes:
        draw.arc(bbox, start=205, end=340, fill=WHITE, width=wave_width)

    # Recortar figura al círculo
    mask = Image.new("L", (base_size, base_size), 0)
    ImageDraw.Draw(mask).ellipse(circle_bbox, fill=255)
    img.putalpha(mask)

    # Reducir al tamaño final con antialias
    return img.resize((size, size), Image.LANCZOS)


icon_only = create_icon(256)
icon_only_path = os.path.join(OUTPUT_DIR, 'urbanflow_icon_only.png')
icon_only.save(icon_only_path)

primary_width, primary_height = 800, 250
primary = Image.new('RGBA', (primary_width, primary_height), (0, 0, 0, 0))
icon_primary = create_icon(220)
icon_primary_pos = (40, (primary_height - icon_primary.height) // 2)
primary.paste(icon_primary, icon_primary_pos, icon_primary)

draw_primary = ImageDraw.Draw(primary)

font = None
font_candidates = [
    'C:/Windows/Fonts/SegoeUI-Bold.ttf',
    'C:/Windows/Fonts/SegoeUI-Semibold.ttf',
    'C:/Windows/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
for path in font_candidates:
    if os.path.exists(path):
        try:
            font = ImageFont.truetype(path, 140)
            break
        except Exception:
            continue
if font is None:
    font = ImageFont.load_default()

text = 'UrbanFlow'
text_bbox = draw_primary.textbbox((0, 0), text, font=font)
text_width = text_bbox[2] - text_bbox[0]
text_height = text_bbox[3] - text_bbox[1]
text_x = icon_primary_pos[0] + icon_primary.width + 50
text_y = (primary_height - text_height) // 2

if text_x + text_width > primary_width - 40 and hasattr(font, 'size'):
    available = primary_width - 80 - text_x
    if available > 0:
        scale_factor = available / text_width
        new_size = max(60, int(font.size * scale_factor))
        for path in font_candidates:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, new_size)
                    text_bbox = draw_primary.textbbox((0, 0), text, font=font)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]
                    text_y = (primary_height - text_height) // 2
                    break
                except Exception:
                    continue

text_position = (text_x, text_y)
draw_primary.text(text_position, text, font=font, fill=BLUE)

primary_path = os.path.join(OUTPUT_DIR, 'urbanflow_logo_primary.png')
primary.save(primary_path)

print('Generated:', icon_only_path)
print('Generated:', primary_path)
