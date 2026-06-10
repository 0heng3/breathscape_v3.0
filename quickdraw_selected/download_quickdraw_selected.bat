@echo off
setlocal enabledelayedexpansion

cd /d E:\breathscape_v2.0
mkdir quickdraw_selected 2>nul
cd quickdraw_selected

set BUCKET=gs://quickdraw_dataset/full/simplified

for %%C in (
  flower
  grass
  sun
  rain
  cloud
  star
  moon
  rainbow
  river
  pond
  leaf
  bridge
  mushroom
  snail
  lantern
  "light bulb"
  squiggle
  line
  circle
  garden
  tree
  bush
  hurricane
  tornado
  windmill
) do (
  echo Downloading %%~C.ndjson ...
  gsutil cp "%BUCKET%/%%~C.ndjson" .
)

echo Done.
pause