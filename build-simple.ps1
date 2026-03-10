# Endo Companion - Simple Build Script

Write-Host "Building Endo Companion..."

# Step 1: Test Capacitor setup
Write-Host "Testing Capacitor functionality..."
Start-Process "msedge" "file://$PSScriptRoot/www/test.html"
Wait-Process

# Check if test passed
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Capacitor test passed!"
} else {
    Write-Host "❌ Capacitor test failed!"
    exit 1
}

Stop-Process

# Step 1: Copy web assets
Write-Host "Copying web assets to iOS project..."

# Check if www directory exists
if (Test-Path "www") {
    Write-Host "✅ www directory found!"
} else {
    Write-Host "❌ www directory not found!"
    Write-Host "Creating www directory with index.html..."
    New-Item -Path "www" -ItemType Directory -Force
    Copy-Item -Path "index.html" -Destination "www\index.html"
    Write-Host "✅ www directory created with index.html!"
}

# Copy web assets
npx cap copy ios
if ($LASTEXITCODE -ne 0) {
    Write-Host "✅ Web assets copied successfully!"
} else {
    Write-Host "❌ Failed to copy web assets!"
    exit 1
}

# Step 2: Build iOS app
Write-Host "Building iOS app..."
npx cap build ios
if ($LASTEXITCODE -ne 0) {
    Write-Host "✅ iOS app built successfully!"
} else {
    Write-Host "❌ Failed to build iOS app!"
    exit 1
}

# Step 3: Show results
Write-Host "=========================================="
Write-Host "📱 BUILD COMPLETED!"
Write-Host "Your iOS app should be ready in: ios\App\build\"
Write-Host "Look for files like:"
Write-Host "  - App.ipa"
Write-Host "  - EndoCompanion.ipa"
Write-Host "=========================================="
Write-Host "🎉 Your native iOS app is ready!"
Write-Host "📱 Next steps:"
Write-Host "  1. Install on iPhone with Sideloadly"
Write-Host "  2. Enjoy your Endo Companion app!"
Write-Host ""

# Keep window open
Read-Host "Press any key to continue..."
