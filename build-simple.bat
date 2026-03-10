@echo off
echo ==========================================
echo    Endo Companion - iOS Build Script
echo ==========================================
echo.

echo Step 1: Copy web assets to iOS...
npx cap copy ios
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy web assets!
    pause
    exit /b 1
)

echo Step 2: Build iOS app...
npx cap build ios
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build iOS app!
    pause
    exit /b 1
)

echo.
echo Step 3: Build completed!
echo.
echo Your iOS app should be ready in: ios/App/build/
echo.
echo Look for: App.ipa or EndoCompanion.ipa
echo.
echo ==========================================
pause
