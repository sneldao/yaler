#!/bin/bash
set -e

CLIPS=/Users/udingethe/Dev/yaler/demo-video/clips
OUT=/Users/udingethe/Dev/yaler/demo-video
WEBM="$CLIPS/page@e5181ba40b1ea016219585214ea80adb.webm"
MP4="$OUT/yaler-demo-raw.mp4"
SERIF="/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIF_BOLD="/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
MONO="/System/Library/Fonts/Supplemental/Courier New.ttf"
PAPER="0xF4EFE6"
INK="0x12213B"
INK_MUTED="0x5C5348"
MANDATE="0x2A6F6A"
DARK="0x0D161D"
LIGHT="0xE8E2DA"

# Convert webm to mp4 first
echo "Converting webm to mp4..."
ffmpeg -y -i "$WEBM" -c:v libx264 -preset fast -crf 18 -an -pix_fmt yuv420p -r 30 "$MP4" 2>&1 | tail -2

echo "Raw duration: $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$MP4")s"

# Title card function using ffmpeg drawtext on a solid color background
make_card() {
  local title="$1"
  local subtitle="$2"
  local output="$3"
  local duration="${4:-4}"
  local bg="${5:-$PAPER}"
  local title_color="${6:-$INK}"
  local sub_color="${7:-$INK_MUTED}"

  ffmpeg -y -f lavfi -i "color=c=${bg}:s=1920x1080:d=${duration}" \
    -vf "drawtext=fontfile='${SERIF_BOLD}':text='${title}':fontsize=68:fontcolor=${title_color}:x=(w-text_w)/2:y=(h-text_h)/2-40, \
         drawtext=fontfile='${SERIF}':text='${subtitle}':fontsize=30:fontcolor=${sub_color}:x=(w-text_w)/2:y=(h-text_h)/2+40, \
         drawtext=fontfile='${MONO}':text='yaler.persidian.com':fontsize=18:fontcolor=${MANDATE}:x=(w-text_w)/2:y=(h-text_h)/2+120" \
    -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -t "$duration" "$output" 2>&1 | tail -1
}

# Terminal-style card for curl proof
make_terminal() {
  local output="$1"
  local duration="${2:-12}"

  ffmpeg -y -f lavfi -i "color=c=${DARK}:s=1920x1080:d=${duration}" \
    -vf "drawtext=fontfile='${MONO}':text='\$ curl -s https://yaler-backend-48617502162.europe-west2.run.app/health':fontsize=22:fontcolor=${LIGHT}:x=80:y=80, \
         drawtext=fontfile='${MONO}':text='{\"service\":\"yaler-agent\",\"status\":\"ok\"}':fontsize=22:fontcolor=0x4F9E96:x=80:y=120, \
         drawtext=fontfile='${MONO}':text='\$ curl -s -X POST .../api/missions \':fontsize=22:fontcolor=${LIGHT}:x=80:y=200, \
         drawtext=fontfile='${MONO}':text='  -H \"Content-Type: application/json\" \':fontsize=22:fontcolor=${LIGHT}:x=80:y=230, \
         drawtext=fontfile='${MONO}':text='  -d '{\"goal\":\"Fridge down in N1, budget 500\"}'':fontsize=22:fontcolor=${LIGHT}:x=80:y=260, \
         drawtext=fontfile='${MONO}':text='{\"id\":\"m_1788...\",\"status\":\"DRAFT\",\"mandate\":{':fontsize=20:fontcolor=0x4F9E96:x=80:y=340, \
         drawtext=fontfile='${MONO}':text='  \"budget\":{\"maxAmount\":500,\"currency\":\"GBP\"},':fontsize=20:fontcolor=0x4F9E96:x=80:y=370, \
         drawtext=fontfile='${MONO}':text='  \"serviceCategory\":\"refrigeration\",':fontsize=20:fontcolor=0x4F9E96:x=80:y=400, \
         drawtext=fontfile='${MONO}':text='  \"serviceArea\":{\"postalDistrict\":\"N1\",\"radiusKm\":10},':fontsize=20:fontcolor=0x4F9E96:x=80:y=430, \
         drawtext=fontfile='${MONO}':text='  \"allowedActions\":[\"SOURCE\",\"REQUEST_OFFER\",\"COMMIT\"]':fontsize=20:fontcolor=0x4F9E96:x=80:y=460, \
         drawtext=fontfile='${MONO}':text='}}':fontsize=20:fontcolor=0x4F9E96:x=80:y=490, \
         drawtext=fontfile='${SERIF}':text='Backend: Go on Cloud Run (europe-west2)':fontsize=22:fontcolor=${LIGHT}:x=80:y=600, \
         drawtext=fontfile='${SERIF}':text='AI: Gemini 3.5 Flash via google.golang.org/genai':fontsize=22:fontcolor=${LIGHT}:x=80:y=640, \
         drawtext=fontfile='${SERIF}':text='State: Firestore  Queue: Cloud Tasks  Media: GCS':fontsize=22:fontcolor=${LIGHT}:x=80:y=680" \
    -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 -t "$duration" "$output" 2>&1 | tail -1
}

echo "Creating title cards..."
make_card "Yaler" "Autonomous kitchen repair agent" "$CLIPS/card-intro.mp4" 5
make_card "The Problem" "Independent kitchens lose £1,000s/day when kit breaks" "$CLIPS/card-problem.mp4" 4
make_card "Speak the Job" "Gemini 3.5 Flash extracts the mandate" "$CLIPS/card-speak.mp4" 4
make_card "The Agent Works" "Three AI supplier agents source quotes" "$CLIPS/card-agent.mp4" 4
make_card "The Over-Budget Stop" "The agent refuses to break your rules" "$CLIPS/card-stop.mp4" 4
make_card "Hear the Paper" "ElevenLabs reads the proof receipt" "$CLIPS/card-hear.mp4" 4
make_card "Replay Mode" "Scrub the full mission lifecycle" "$CLIPS/card-replay.mp4" 4
make_card "Backend on Google Cloud" "Live Cloud Run endpoint" "$CLIPS/card-cloud.mp4" 4
make_card "The Stack" "Architecture diagram" "$CLIPS/card-stack.mp4" 4
make_card "Yaler" "Delegate the outcome. Keep the mandate." "$CLIPS/card-close.mp4" 6

echo "Creating terminal proof card..."
make_terminal "$CLIPS/card-terminal.mp4" 12

echo "Creating architecture diagram clip..."
# Resize architecture diagram to fit 1920x1080 with paper background
ffmpeg -y -loop 1 -i "$CLIPS/architecture-diagram.png" -t 10 -vf "scale=1800:1000:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xF4EFE6" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 "$CLIPS/arch-diagram.mp4" 2>&1 | tail -1

echo "Splitting raw footage into segments..."
ffmpeg -y -i "$MP4" -ss 0 -t 12 -c copy "$CLIPS/seg-landing.mp4" 2>&1 | tail -1
ffmpeg -y -i "$MP4" -ss 12 -t 13 -c copy "$CLIPS/seg-rehearsal.mp4" 2>&1 | tail -1
ffmpeg -y -i "$MP4" -ss 25 -t 9 -c copy "$CLIPS/seg-mandate.mp4" 2>&1 | tail -1
ffmpeg -y -i "$MP4" -ss 34 -t 16 -c copy "$CLIPS/seg-timeline.mp4" 2>&1 | tail -1
ffmpeg -y -i "$MP4" -ss 50 -t 12 -c copy "$CLIPS/seg-offers.mp4" 2>&1 | tail -1
ffmpeg -y -i "$MP4" -ss 62 -t 11 -c copy "$CLIPS/seg-receipt.mp4" 2>&1 | tail -1

echo "Composing final video..."
cat > "$CLIPS/concat.txt" << 'EOF'
file 'card-intro.mp4'
file 'card-problem.mp4'
file 'seg-landing.mp4'
file 'card-speak.mp4'
file 'seg-rehearsal.mp4'
file 'seg-mandate.mp4'
file 'card-agent.mp4'
file 'seg-timeline.mp4'
file 'card-stop.mp4'
file 'seg-offers.mp4'
file 'card-hear.mp4'
file 'seg-receipt.mp4'
file 'card-replay.mp4'
file 'card-cloud.mp4'
file 'card-terminal.mp4'
file 'card-stack.mp4'
file 'arch-diagram.mp4'
file 'card-close.mp4'
EOF

cd "$CLIPS"
ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 30 "$OUT/yaler-demo-video.mp4" 2>&1 | tail -5

echo ""
echo "=== Final video ==="
ffprobe -v quiet -print_format json -show_format "$OUT/yaler-demo-video.mp4" 2>&1 | python3 -c "import json,sys; d=json.load(sys.stdin); dur=float(d['format']['duration']); print(f'Duration: {dur:.1f}s ({dur/60:.1f} min)'); print(f'Size: {int(d[\"format\"][\"size\"])/1024/1024:.1f} MB')"
echo "Output: $OUT/yaler-demo-video.mp4"
