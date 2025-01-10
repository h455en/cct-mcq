# zip with versionning

$cct = "cct346"
$version = "3.4.6"
Write-Host "Preparing R$version ($cct)" -ForegroundColor Cyan
$folder = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\App_v" + $version + ".zip"

$compress = @{
    LiteralPath      = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\index.html", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\script.js", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\style.css"
    CompressionLevel = "Fastest"
    DestinationPath  = $folder
}

Compress-Archive @compress
Write-Host "Release $version ($cct)" -ForegroundColor Green


# Rollback

<#
#----------------
# Cleaning
Write-Host "Cleaning ..." -ForegroundColor Cyan
rm D:\hassen\work\CYBERSEC\cct-mcq\App\index.html
rm D:\hassen\work\CYBERSEC\cct-mcq\App\script.js
rm D:\hassen\work\CYBERSEC\cct-mcq\App\style.css

$v = "3.2.8"
$version = "_v" + $v + ".zip"
$zipFolder = "D:\hassen\work\CYBERSEC\cct-mcq\App\App" + $version
Write-Host "Rollback to version [$version]" -ForegroundColor Cyan
Expand-Archive -LiteralPath $zipFolder -DestinationPath .

Write-Host "Rollback terminated." -ForegroundColor Green
#----------------

#>


