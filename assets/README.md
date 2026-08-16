# Media assets

Replace these placeholders with your own files.

## Video (background)

Put your loop video here:

```text
assets/video/intro.mp4
```

Tips:
- Prefer a short muted loop (5–20s)
- Keep file size reasonable for the web
- Until `intro.mp4` exists, the page shows a gradient fallback

## Archive images

Replace or add images referenced in `js/main.js` (`ARCHIVE_IMAGES`):

```text
assets/images/archive-1.jpg
assets/images/archive-2.jpg
...
```

Current placeholders are SVG files so the page works without photos. After adding real images, update the `src` paths in `js/main.js` (for example `.jpg` / `.png` / `.webp`).

## Poster

`assets/images/poster.svg` is the video poster while the file loads. You can swap it for a still frame from your video.
