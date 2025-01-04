# 

# zip with versionning

$version = "v3.1.19"

$folder = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\App_" + $version + ".zip"
#$outFile = Join-Path($folder, $version)
$compress = @{
    LiteralPath      = "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\index.html", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\script.js", "D:\HASSEN\WORK\CYBERSEC\cct-mcq\App\style.css"
    CompressionLevel = "Fastest"
    DestinationPath  = $folder
}

Compress-Archive @compress
Write-Host "Release $version" -ForegroundColor Green