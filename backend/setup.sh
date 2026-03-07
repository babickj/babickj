#!/usr/bin/env bash
# EdgeRunner AI Agent Creator — Python backend setup
set -e

echo "🔧 Setting up EdgeRunner backend..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the backend manually:"
echo "  source venv/bin/activate && python main.py"
echo ""
echo "Ensure Ollama is running and nomic-embed-text is pulled:"
echo "  ollama pull nomic-embed-text"
