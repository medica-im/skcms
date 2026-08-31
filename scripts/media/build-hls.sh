#!/usr/bin/env bash
#
# Build an HLS ladder from a source MP4.
#
# Why HLS rather than a list of MP4s: video.js plays the first source its tech
# can play and never looks at the rest, so three standalone MP4s give one fixed
# quality and no way to change it. HLS is one playlist over segmented
# renditions — the player measures bandwidth, switches between them mid-play,
# and starts on the first segment rather than waiting for a whole file.
#
# Renditions are derived from the 1080p master, never from the smaller MP4s:
# those are already-compressed and re-encoding one costs a generation. A source
# is only laddered up to its own height — a 1080p rendition built from a 157
# kbps master looks worse than the 720p beside it, not better.
#
# Black bars are cropped here rather than baked in, because cropdetect reads
# them off the master: the colorectal footage is 1.89:1 padded into a 16:9
# frame, and every rendition would inherit the padding otherwise.
#
# Audio is re-encoded to AAC even where the source is Opus: HLS in MP4/TS
# segments needs AAC for broad playback, and Safari will not play Opus in HLS.
#
# Usage: build-hls.sh <source.mp4> <output-dir>
set -euo pipefail

SRC="${1:?usage: build-hls.sh <source.mp4> <output-dir>}"
OUT="${2:?usage: build-hls.sh <source.mp4> <output-dir>}"
[[ -f "$SRC" ]] || { echo "error: no such file: $SRC" >&2; exit 1; }

command -v ffmpeg >/dev/null || { echo "error: ffmpeg not installed (sudo apt install ffmpeg)" >&2; exit 1; }

SRC_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$SRC")
SRC_BPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of csv=p=0 "$SRC" 2>/dev/null || echo 0)
[[ "$SRC_BPS" =~ ^[0-9]+$ ]] || SRC_BPS=0
SRC_KBPS=$(( SRC_BPS / 1000 ))
(( SRC_KBPS > 0 )) && echo "  source: ${SRC_H}p @ ${SRC_KBPS} kbps"

# Detect padding on the master and crop it from every rendition. Sampled a few
# seconds in: a title card or fade at t=0 reads as all-black and would crop the
# whole frame.
CROP=$(ffmpeg -hide_banner -ss 5 -i "$SRC" -vf cropdetect=24:2:0 -frames:v 120 -f null - 2>&1 |
       grep -o 'crop=[0-9:]*' | tail -1 || true)
if [[ -n "$CROP" ]]; then
    CROP_W=${CROP#crop=}; CROP_W=${CROP_W%%:*}
    CROP_H=$(cut -d: -f2 <<<"${CROP#crop=}")
    echo "  cropdetect: $CROP (content ${CROP_W}x${CROP_H})"
    VF_CROP="${CROP},"
    # Ladder against the height that survives the crop. Scaling to the padded
    # height would upscale the picture — 1016 rows stretched back to 1080.
    SRC_H="$CROP_H"
else
    VF_CROP=""
fi

mkdir -p "$OUT"

# height:width:video kbps:audio kbps. Only rungs at or below the source height
# are built.
LADDER=(
    "1080:1920:4500:128"
    "720:1280:2500:128"
    "480:854:1200:96"
    "360:640:700:96"
)

# The nominal bitrate of the highest rung this source will produce; every rung
# is scaled against it so the ladder keeps its shape.
TOP_VB=0
for rung in "${LADDER[@]}"; do
    IFS=: read -r h w vb ab <<<"$rung"
    (( h > SRC_H )) && continue
    TOP_VB=$vb; break
done
(( TOP_VB == 0 )) && TOP_VB=1200

LAST_VB=0
MASTER="$OUT/master.m3u8"
: > "$MASTER.tmp"
echo "#EXTM3U" >> "$MASTER.tmp"
echo "#EXT-X-VERSION:3" >> "$MASTER.tmp"

for rung in "${LADDER[@]}"; do
    IFS=: read -r h w vb ab <<<"$rung"
    (( h > SRC_H )) && continue

    # Never spend more bits than the master holds. These are re-encodes of an
    # already-compressed file, so a rung above the source bitrate stores
    # compression artefacts at high fidelity — 241MB from a 34MB master, on the
    # first run of this script. Capped at the source, with a floor so the
    # smallest rung stays watchable.
    # Scaled to the master's own bitrate rather than flat-capped. A flat cap
    # collapses the ladder — 720p and 480p both pinned to the source rate come
    # out the same size, which gives the player nothing to switch between.
    # Each rung keeps its share of the target relative to the top rung.
    # Scaled against the master's own bitrate, every rung, not just the ones
    # above it. Capping only the top rung collapses the ladder: 720p pinned
    # down to the source rate while 480p keeps its nominal 1200k leaves the two
    # the same size, and the player has nothing worth switching between.
    if (( SRC_KBPS > 0 )) && (( TOP_VB > SRC_KBPS )); then
        vb=$(( vb * SRC_KBPS / TOP_VB ))
    fi

    # A rung only earns its place if it is meaningfully cheaper than the one
    # above. A very compressed master (the cervical screening film is 1080p at
    # 156 kbps) scales every rung down to the same floor, and four renditions
    # of identical size give the player nothing to choose between while costing
    # four encodes and four times the disk. Below 250k the picture is not worth
    # serving either, so the ladder simply stops.
    if (( vb < 250 )); then
        echo "  skipping ${h}p (${vb}k too low to be worth a rung)"
        continue
    fi
    if (( LAST_VB > 0 )) && (( vb * 100 > LAST_VB * 75 )); then
        echo "  skipping ${h}p (${vb}k too close to the ${LAST_VB}k rung above)"
        continue
    fi

    LAST_VB=$vb
    echo "  encoding ${h}p (${vb}k)…"
    ffmpeg -hide_banner -loglevel error -y -i "$SRC" \
        -vf "${VF_CROP}scale=-2:${h}" \
        -c:v libx264 -profile:v main -preset slow \
        -b:v "${vb}k" -maxrate "$((vb * 107 / 100))k" -bufsize "$((vb * 2))k" \
        -g 50 -keyint_min 50 -sc_threshold 0 \
        -c:a aac -b:a "${ab}k" -ac 2 \
        -hls_time 6 -hls_playlist_type vod \
        -hls_segment_filename "$OUT/${h}p_%03d.ts" \
        "$OUT/${h}p.m3u8"

    # Bandwidth is video+audio in bits, with headroom: the player uses it to
    # decide what it can sustain, and understating it causes needless upshifts.
    BW=$(( (vb + ab) * 1100 ))
    # From a segment, not the playlist: ffprobe on an .m3u8 returns a line per
    # segment, and the stray newlines corrupt the master.
    read -r REAL_W REAL_H < <(ffprobe -v error -select_streams v:0 \
        -show_entries stream=width,height -of csv=p=0 "$OUT/${h}p_000.ts" | head -1 | tr ',' ' ')
    echo "#EXT-X-STREAM-INF:BANDWIDTH=${BW},RESOLUTION=${REAL_W}x${REAL_H},CODECS=\"avc1.4d401f,mp4a.40.2\"" >> "$MASTER.tmp"
    echo "${h}p.m3u8" >> "$MASTER.tmp"
done

# A master with no rungs is worse than no master: the page would load a
# playlist the player cannot use. A source this compressed has nothing to gain
# from HLS anyway — keep serving it as the single MP4 it already is.
if ! grep -q EXT-X-STREAM-INF "$MASTER.tmp"; then
    rm -f "$MASTER.tmp"
    rmdir "$OUT" 2>/dev/null || true
    echo "  no rung is worth building from this source — leave it as a plain MP4" >&2
    exit 2
fi

mv "$MASTER.tmp" "$MASTER"
echo "  wrote $MASTER"
du -sh "$OUT" | sed 's/^/  total: /'
