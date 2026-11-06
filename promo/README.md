# Vídeo promocional (Reels)

Anúncio de 90s, 1080x1920, gerado por código.

```bash
cd promo
node shots.js            # print do painel com dados fictícios -> shots/dash.png
python3 music.py         # trilha sintetizada -> audio/music.wav
node preview.js 5 30 60  # quadros de conferência -> build/
node render.js nortis-reels.mp4
```

Requer Playwright (Chromium), ffmpeg, Python 3 com numpy.
