#!/bin/bash

echo "🚀 Building Endo Companion Native iOS App..."

# Try to open in Xcode (if available)
if command -v xcodebuild &> /dev/null; then
    echo "✅ Xcode found - opening project..."
    open ios/App/App.xcworkspace
else
    echo "⚠️  Xcode not found - you'll need to build manually"
    echo ""
    echo "📱 To build manually:"
    echo "   1. Open ios/App/App.xcworkspace in Xcode"
    echo "   2. Select 'Any iOS Device' as destination"
    echo "   3. Product → Archive"
    echo "   4. Distribute via TestFlight or App Store"
fi

echo ""
echo "🎯 Capacitor project is ready for native iOS development!"
echo "📱 Your 'Endo Companion' app can be built and deployed!"
