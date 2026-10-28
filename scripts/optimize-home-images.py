#!/usr/bin/env python3
"""Rebuild full-composition homepage WebPs; requires Pillow with WebP support."""
import hashlib
import json
from pathlib import Path

from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/images/optimized'
NAMES = (
    'home-identity-flow home-dark-funnel identity-graph-website '
    'identity-graph-resolution identity-graph-profiles identity-graph-intent '
    'identity-graph-activate solution-b2b solution-recruitment solution-b2c '
    'solution-nonprofit capability-identity capability-intent '
    'capability-enrichment capability-activation capability-privacy home-local-sphere'
).split()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        'pillowVersion': pillow_version,
        'format': 'WebP', 'quality': 92, 'method': 6,
        'resize': 'LANCZOS, full original aspect ratio, no upscaling',
        'images': [],
    }
    for name in NAMES:
        source = ROOT / f'assets/images/{name}.png'
        original = Image.open(source)
        if name.startswith('capability-'):
            widths = [64, 128, 192]
            default = 128
        elif name.startswith('identity-graph-'):
            widths = [160, 320, 480, 640]
            default = 320
        else:
            widths = [320, 640, 960, 1280]
            default = 960 if name == 'home-identity-flow' else 640
            if name == 'home-identity-flow':
                widths.append(1536)
        record = {
            'name': name, 'original': str(source.relative_to(ROOT)),
            'originalWidth': original.width, 'originalHeight': original.height,
            'originalBytes': source.stat().st_size,
            'originalSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'defaultWidth': default, 'candidates': [],
        }
        # Preserve alpha and color-profile information; never crop, pad or redraw.
        original.load()
        for width in widths:
            if width > original.width:
                continue
            height = round(original.height * width / original.width)
            resized = original.resize((width, height), Image.Resampling.LANCZOS)
            target = OUTPUT / f'{name}-{width}.webp'
            resized.save(target, 'WEBP', quality=92, method=6,
                         icc_profile=original.info.get('icc_profile', b''))
            record['candidates'].append({
                'path': str(target.relative_to(ROOT)), 'width': width,
                'height': height, 'bytes': target.stat().st_size,
            })
        manifest['images'].append(record)
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f"Generated {sum(len(image['candidates']) for image in manifest['images'])} WebPs from {len(NAMES)} unchanged PNGs")


if __name__ == '__main__':
    main()
