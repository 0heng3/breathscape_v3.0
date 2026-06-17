Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "public\fig\sprites"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$cloudSource = "$([char]0x4E91).png"
$grassSource = "$([char]0x8349).png"
$flowerSource = "$([char]0x82B1).png"

$sprites = @(
  @{ Source = $cloudSource; Name = "cloud-1.png"; X = 20; Y = 48; W = 310; H = 150 },
  @{ Source = $cloudSource; Name = "cloud-2.png"; X = 520; Y = 58; W = 360; H = 160 },
  @{ Source = $cloudSource; Name = "cloud-7.png"; X = 970; Y = 468; W = 270; H = 130 },

  @{ Source = $grassSource; Name = "grass-2.png"; X = 360; Y = 58; W = 260; H = 150 },
  @{ Source = $grassSource; Name = "grass-8.png"; X = 360; Y = 300; W = 300; H = 150 },
  @{ Source = $grassSource; Name = "grass-14.png"; X = 690; Y = 535; W = 270; H = 140 },
  @{ Source = $grassSource; Name = "grass-20.png"; X = 1320; Y = 760; W = 300; H = 160 },

  @{ Source = $flowerSource; Name = "flower-1.png"; X = 92; Y = 32; W = 170; H = 170 },
  @{ Source = $flowerSource; Name = "flower-4.png"; X = 548; Y = 32; W = 170; H = 170 },
  @{ Source = $flowerSource; Name = "flower-7.png"; X = 324; Y = 248; W = 200; H = 190 },
  @{ Source = $flowerSource; Name = "flower-16.png"; X = 480; Y = 690; W = 190; H = 160 }
)

function Convert-WhiteToAlpha {
  param(
    [System.Drawing.Bitmap] $Bitmap
  )

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      $pixel = $Bitmap.GetPixel($x, $y)
      $ink = [Math]::Max([Math]::Max(255 - $pixel.R, 255 - $pixel.G), 255 - $pixel.B)
      $alpha = [Math]::Min(255, [Math]::Max(0, ($ink - 5) * 11))
      if ($alpha -lt 8) {
        $alpha = 0
      }
      $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb([int]$alpha, $pixel.R, $pixel.G, $pixel.B))
    }
  }
}

foreach ($sprite in $sprites) {
  $sourcePath = Join-Path $root ("fig\" + $sprite.Source)
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    $rect = New-Object System.Drawing.Rectangle $sprite.X, $sprite.Y, $sprite.W, $sprite.H
    $crop = $source.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      Convert-WhiteToAlpha -Bitmap $crop
      $outPath = Join-Path $outputDir $sprite.Name
      $crop.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Host "wrote $outPath"
    }
    finally {
      $crop.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}
