#!/bin/bash

echo "🚀 Setting up Poster Voting App..."
echo ""

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure MongoDB is running (sudo systemctl start mongod)"
echo "2. Start the app: npm start"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "🔑 Default admin credentials:"
echo "   Email: admin@admin.com"
echo "   Password: admin123"
echo ""
