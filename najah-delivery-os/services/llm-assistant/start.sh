#!/bin/bash

# Najah Delivery LLM Assistant - Quick Start Script

echo "🚀 Starting Najah Delivery LLM Assistant Setup..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OPENROUTER_API_KEY"
    echo ""
fi

# Check if OPENROUTER_API_KEY is set
source .env
if [ -z "$OPENROUTER_API_KEY" ] || [ "$OPENROUTER_API_KEY" = "your_openrouter_api_key_here" ]; then
    echo "❌ OPENROUTER_API_KEY not configured"
    echo "Please edit .env and add your OpenRouter API key"
    echo ""
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "📚 To ingest knowledge base (optional):"
echo "   python scripts/ingest_kb.py"
echo ""
echo "🚀 To start the service:"
echo "   python app.py"
echo ""
echo "📖 API Documentation will be available at:"
echo "   http://localhost:8003/docs"
echo ""
