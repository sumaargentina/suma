# Script para reemplazar Firebase por Supabase
Write-Host "Reemplazando referencias..." -ForegroundColor Cyan

Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $modified = $false
        
        if ($content -match 'firestoreService') {
            $content = $content -replace 'firestoreService', 'supabaseService'
            $modified = $true
        }
        
        if ($content -match "from './firebase'") {
            $content = $content -replace "from './firebase'", "from './supabase'"
            $modified = $true
        }
        
        if ($content -match "from './firebase-admin'") {
            $content = $content -replace "from './firebase-admin'", "from './supabase-admin'"
            $modified = $true
        }
        
        if ($modified) {
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "Actualizado: $($_.Name)"
        }
    }
}

Write-Host "Completado!" -ForegroundColor Green
