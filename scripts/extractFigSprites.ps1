Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "public\fig\sprites"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$cloudSource = "$([char]0x4E91).png"
$grassSource = "$([char]0x8349).png"
$flowerSource = "$([char]0x82B1).png"

$sprites = New-Object System.Collections.Generic.List[object]

$cloudRects = @(
  @{ X = 16; Y = 54; W = 360; H = 170 }, @{ X = 510; Y = 54; W = 390; H = 170 },
  @{ X = 918; Y = 150; W = 330; H = 150 }, @{ X = 1308; Y = 52; W = 260; H = 152 },
  @{ X = 16; Y = 340; W = 390; H = 176 }, @{ X = 500; Y = 418; W = 380; H = 142 },
  @{ X = 970; Y = 466; W = 282; H = 132 }, @{ X = 1290; Y = 438; W = 280; H = 132 },
  @{ X = 32; Y = 628; W = 326; H = 138 }, @{ X = 510; Y = 636; W = 346; H = 132 },
  @{ X = 944; Y = 642; W = 312; H = 124 }, @{ X = 1282; Y = 642; W = 286; H = 126 },
  @{ X = 34; Y = 842; W = 302; H = 116 }, @{ X = 520; Y = 846; W = 300; H = 112 },
  @{ X = 936; Y = 850; W = 308; H = 104 }, @{ X = 1300; Y = 850; W = 262; H = 102 }
)
for ($i = 0; $i -lt $cloudRects.Count; $i++) {
  $r = $cloudRects[$i]
  $sprites.Add(@{ Source = $cloudSource; Name = "cloud-$($i + 1).png"; X = $r.X; Y = $r.Y; W = $r.W; H = $r.H })
}

$grassRects = @(
  @{ X = 22; Y = 46; W = 260; H = 140 }, @{ X = 354; Y = 50; W = 285; H = 148 },
  @{ X = 700; Y = 48; W = 270; H = 148 }, @{ X = 1036; Y = 48; W = 245; H = 154 },
  @{ X = 1360; Y = 48; W = 270; H = 154 }, @{ X = 50; Y = 280; W = 250; H = 148 },
  @{ X = 350; Y = 292; W = 300; H = 150 }, @{ X = 700; Y = 300; W = 260; H = 130 },
  @{ X = 1030; Y = 300; W = 270; H = 130 }, @{ X = 1340; Y = 278; W = 292; H = 160 },
  @{ X = 58; Y = 520; W = 210; H = 128 }, @{ X = 362; Y = 520; W = 286; H = 142 },
  @{ X = 690; Y = 520; W = 284; H = 140 }, @{ X = 1010; Y = 520; W = 300; H = 140 },
  @{ X = 1364; Y = 520; W = 252; H = 134 }, @{ X = 34; Y = 708; W = 252; H = 150 },
  @{ X = 342; Y = 720; W = 308; H = 150 }, @{ X = 690; Y = 724; W = 292; H = 146 },
  @{ X = 1010; Y = 712; W = 304; H = 148 }, @{ X = 1340; Y = 710; W = 300; H = 154 },
  @{ X = 36; Y = 890; W = 258; H = 140 }, @{ X = 352; Y = 898; W = 300; H = 122 },
  @{ X = 690; Y = 884; W = 294; H = 144 }, @{ X = 1015; Y = 886; W = 300; H = 140 },
  @{ X = 1344; Y = 884; W = 292; H = 144 }
)
for ($i = 0; $i -lt $grassRects.Count; $i++) {
  $r = $grassRects[$i]
  $sprites.Add(@{ Source = $grassSource; Name = "grass-$($i + 1).png"; X = $r.X; Y = $r.Y; W = $r.W; H = $r.H })
}

$flowerRects = @(
  @{ X = 86; Y = 28; W = 180; H = 174 }, @{ X = 312; Y = 26; W = 170; H = 176 },
  @{ X = 535; Y = 26; W = 188; H = 178 }, @{ X = 764; Y = 30; W = 200; H = 176 },
  @{ X = 930; Y = 140; W = 210; H = 196 }, @{ X = 82; Y = 250; W = 202; H = 190 },
  @{ X = 318; Y = 246; W = 210; H = 196 }, @{ X = 552; Y = 260; W = 160; H = 176 },
  @{ X = 770; Y = 260; W = 178; H = 168 }, @{ X = 930; Y = 260; W = 210; H = 202 },
  @{ X = 60; Y = 495; W = 180; H = 172 }, @{ X = 290; Y = 512; W = 174; H = 158 },
  @{ X = 500; Y = 500; W = 218; H = 176 }, @{ X = 766; Y = 490; W = 190; H = 180 },
  @{ X = 930; Y = 488; W = 210; H = 186 }, @{ X = 18; Y = 712; W = 218; H = 178 },
  @{ X = 260; Y = 726; W = 196; H = 150 }, @{ X = 505; Y = 720; W = 180; H = 160 },
  @{ X = 726; Y = 715; W = 190; H = 162 }, @{ X = 930; Y = 706; W = 210; H = 184 }
)
for ($i = 0; $i -lt $flowerRects.Count; $i++) {
  $r = $flowerRects[$i]
  $sprites.Add(@{ Source = $flowerSource; Name = "flower-$($i + 1).png"; X = $r.X; Y = $r.Y; W = $r.W; H = $r.H })
}

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
