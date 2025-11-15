#!/usr/bin/env bash
set -e

echo "🔐 Zero-Knowledge Legal System - Quick Start"
echo "=========================================="
echo ""

# Check if Nix is installed
if ! command -v nix &> /dev/null; then
    echo "❌ Nix is not installed. Please install Nix first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install"
    exit 1
fi

echo "✅ Nix found"

# Check if flakes are enabled
if ! nix eval --expr 'builtins.currentSystem' &> /dev/null; then
    echo "⚙️  Enabling Nix flakes..."
    mkdir -p ~/.config/nix
    echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
fi

echo "📦 Setting up ZK Legal UI..."
cd zk-legal-ui

# Create .env from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
fi

echo ""
echo "🚀 To start the development environment:"
echo ""
echo "   cd zk-legal-ui"
echo "   nix develop ..#zk-legal-ui"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "📚 For more information, see ZK_LEGAL_SYSTEM_README.md"
