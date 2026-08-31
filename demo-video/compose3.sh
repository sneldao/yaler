#!/bin/bash
set -e

CLIPS=/Users/udingethe/Dev/yaler/demo-video/clips
CARDS=/Users/udingethe/Dev/yaler/demo-video/cards
OUT=/Users/udingethe/Dev/yaler/demo-video
WEBM="$CLIPS/page@db378de362ce144c52852f99929f1b9a.webm"
MP4="$OUT/yaler-demo-raw.mp4"

# Convert webm to mp4
echo "Converting webm to mp4..."
ffmpeg -y -i "$WEBM" -c:v libx264 -preset fast -crf 18 -an -pix_fmt yuv420p -r 30 "$MP4" 2>/dev/null
RAW_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$MP4")
echo "Raw duration: ${RAW_DUR}s"

# Card durations
get_dur() {
  case "$1" in
    intro) echo 5 ;; problem) echo 4 ;; speak) echo 4 ;; agent) echo 4 ;;
    stop) echo 4 ;; hear) echo 4 ;; replay) echo 4 ;; cloud) echo 4 ;;
    terminal) echo 15 ;; stack) echo 4 ;; close) echo 6 ;; *) echo 4 ;;
  esac
}

echo "Converting card images to video clips..."
for id in intro problem speak agent stop hear replay cloud terminal stack close; do
  dur=$(get_dur "$id")
  ffmpeg -y -loop 1 -i "$CARDS/${id}.png" -t "$dur" \
    -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 \
    "$CLIPS/card-${id}.mp4" 2>/dev/null
  echo "  card-${id}.mp4 (${dur}s)"
done

echo "Creating architecture diagram clip..."
ffmpeg -y -loop 1 -i "$CLIPS/architecture-diagram.png" -t 12 \
  -vf "scale=1800:1000:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF4EFE6" \
  -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 \
  "$CLIPS/arch-diagram.mp4" 2>/dev/null

# Split raw footage:
# 0-15s:   landing page
# 15-60s:  rehearsal autoplay (details → looking → quotes)
# 60-95s:  replay (seed mission timeline)
# 95-135s: proof receipt
echo "Splitting raw footage into segments..."
ffmpeg -y -i "$MP4" -ss 0  -t 15 -c copy "$CLIPS/seg-landing.mp4"    2>/dev/null
ffmpeg -y -i "$MP4" -ss 15 -t 45 -c copy "$CLIPS/seg-rehearsal.mp4"  2>/dev/null
ffmpeg -y -i "$MP4" -ss 60 -t 35 -c copy "$CLIPS/seg-replay.mp4"     2>/dev/null
ffmpeg -y -i "$MP4" -ss 95 -t 40 -c copy "$CLIPS/seg-receipt.mp4"    2>/dev/null
echo "  4 segments split"

echo "Composing final video..."
cat > "$CLIPS/concat.txt" << 'EOF'
file 'card-intro.mp4'
file 'card-problem.mp4'
file 'seg-landing.mp4'
file 'card-speak.mp4'
file 'seg-rehearsal.mp4'
file 'card-agent.mp4'
file 'seg-replay.mp4'
file 'card-stop.mp4'
file 'card-hear.mp4'
file 'seg-receipt.mp4'
file 'card-cloud.mp4'
file 'card-terminal.mp4'
file 'card-stack.mp4'
file 'arch-diagram.mp4'
file 'card-close.mp4'
EOF

cd "$CLIPS"
ffmpeg -y -f concat -safe 0 -i concat.txt \
  -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 30 \
  "$OUT/yaler-demo-video.mp4" 2>&1 | tail -5

echo ""
echo "=== Final video ==="
DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT/yaler-demo-video.mp4")
SIZE=$(ls -la "$OUT/yaler-demo-video.mp4" | awk '{print $5}')
echo "Duration: ${DUR}s ($(echo "scale=1; $DUR/60" | bc) min)"
echo "Size: $(echo "scale=1; $SIZE/1024/1024" | bc) MB"
echo "Output: $OUT/yaler-demo-video.mp4"
