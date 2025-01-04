# zip with versionning

$cct = "cct323"
$version = "v3.2.3"
$folder = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\App_" + $version + ".zip"

$compress = @{
    LiteralPath      = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\index.html", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\script.js", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\style.css"
    CompressionLevel = "Fastest"
    DestinationPath  = $folder
}

Compress-Archive @compress
Write-Host "Release $version ($cct)" -ForegroundColor Green