Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 24, 24
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Background rounded rect
$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 139, 92, 246))
$g.FillRectangle($bg, 0, 0, 24, 24)
# Letter Z
$font = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Bold)
$fg = [System.Drawing.Brushes]::White
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, 24, 24
$g.DrawString('Z', $font, $fg, $rect, $sf)

$bmp.Save('d:\Utilisateurs\johan.dossantos\Mes documents\Zimb\zimb\packages\extension\assets\zimb.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host '✅ Created assets/zimb.png'
