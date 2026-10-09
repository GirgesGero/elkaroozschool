#!/bin/bash
# prepare-deployment.sh
# Auto-prepare deployment packages for Hostinger
# Usage: bash scripts/prepare-deployment.sh

set -e  # Exit on error

echo "=========================================="
echo "🚀 EL KAROOZ School - Deployment Preparation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root (assuming script is in backend-api/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-api"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DEPLOY_DIR="$PROJECT_ROOT/deploy-packages"

echo "📂 Project Root: $PROJECT_ROOT"
echo "📂 Backend: $BACKEND_DIR"
echo "📂 Frontend: $FRONTEND_DIR"
echo "📦 Deploy Output: $DEPLOY_DIR"
echo ""

# Create deploy directory
mkdir -p "$DEPLOY_DIR"

# Step 1: Build Frontend
echo "=========================================="
echo "1️⃣  Building Frontend (Next.js)..."
echo "=========================================="

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
        npm install
    fi
    
    # Build
    echo "🔨 Running npm run build..."
    npm run build
    
    # Check if build succeeded
    if [ -d "out" ] || [ -d ".next" ]; then
        echo -e "${GREEN}✅ Frontend build successful${NC}"
    else
        echo -e "${RED}❌ Frontend build failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend directory not found${NC}"
    exit 1
fi

echo ""

# Step 2: Package Backend
echo "=========================================="
echo "2️⃣  Packaging Backend (PHP)..."
echo "=========================================="

cd "$BACKEND_DIR"

echo "📦 Creating backend-deploy.tar.gz..."
tar -czf "$DEPLOY_DIR/backend-deploy.tar.gz" \
    --exclude='node_modules' \
    --exclude='vendor' \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='storage/logs/*' \
    --exclude='storage/cache/*' \
    --exclude='storage/bible/bible_encyclopedia.sqlite-shm' \
    --exclude='storage/bible/bible_encyclopedia.sqlite-wal' \
    --exclude='scripts/prepare-deployment.sh' \
    --exclude='DEPLOYMENT_*.md' \
    .

BACKEND_SIZE=$(du -h "$DEPLOY_DIR/backend-deploy.tar.gz" | cut -f1)
echo -e "${GREEN}✅ Backend packaged: $BACKEND_SIZE${NC}"
echo ""

# Step 3: Package Frontend
echo "=========================================="
echo "3️⃣  Packaging Frontend (Static Export)..."
echo "=========================================="

cd "$FRONTEND_DIR"

if [ -d "out" ]; then
    echo "📦 Creating frontend-deploy.tar.gz from out/..."
    tar -czf "$DEPLOY_DIR/frontend-deploy.tar.gz" out/
elif [ -d ".next" ]; then
    echo "📦 Creating frontend-deploy.tar.gz from .next/..."
    tar -czf "$DEPLOY_DIR/frontend-deploy.tar.gz" .next/
else
    echo -e "${RED}❌ No build output found (out/ or .next/)${NC}"
    exit 1
fi

FRONTEND_SIZE=$(du -h "$DEPLOY_DIR/frontend-deploy.tar.gz" | cut -f1)
echo -e "${GREEN}✅ Frontend packaged: $FRONTEND_SIZE${NC}"
echo ""

# Step 4: Package Bible Storage
echo "=========================================="
echo "4️⃣  Packaging Bible Storage..."
echo "=========================================="

cd "$BACKEND_DIR/storage/bible"

if [ -f "database/bible_encyclopedia.sqlite" ]; then
    echo "📦 Creating bible-deploy.tar.gz..."
    tar -czf "$DEPLOY_DIR/bible-deploy.tar.gz" \
        --exclude='*.sqlite-shm' \
        --exclude='*.sqlite-wal' \
        .
    
    BIBLE_SIZE=$(du -h "$DEPLOY_DIR/bible-deploy.tar.gz" | cut -f1)
    echo -e "${GREEN}✅ Bible storage packaged: $BIBLE_SIZE${NC}"
else
    echo -e "${YELLOW}⚠️  Bible database not found, skipping...${NC}"
fi

echo ""

# Step 5: Create deployment checklist
echo "=========================================="
echo "5️⃣  Creating Deployment Checklist..."
echo "=========================================="

cat > "$DEPLOY_DIR/DEPLOYMENT_CHECKLIST.txt" << 'EOF'
# EL KAROOZ School - Deployment Checklist
# Generated: $(date)

## 📦 Package Files

✓ backend-deploy.tar.gz    - PHP Backend
✓ frontend-deploy.tar.gz   - Next.js Static
✓ bible-deploy.tar.gz      - Bible Encyclopedia (SQLite + JSON + Images)

## 🚀 Deployment Steps

### 1. Upload Files to Hostinger

Via SSH:
```bash
scp backend-deploy.tar.gz username@your-domain.com:~/
scp frontend-deploy.tar.gz username@your-domain.com:~/
scp bible-deploy.tar.gz username@your-domain.com:~/
```

### 2. Extract on Server

```bash
# Connect
ssh username@your-domain.com

# Backend
mkdir -p ~/backend-api
cd ~/backend-api
tar -xzf ../backend-deploy.tar.gz
rm ../backend-deploy.tar.gz

# Frontend
cd ~/public_html
tar -xzf ../frontend-deploy.tar.gz
mv out/* . 2>/dev/null || mv .next/* .
rmdir out 2>/dev/null || rmdir .next 2>/dev/null
rm ../frontend-deploy.tar.gz

# Bible Storage
cd ~/backend-api/storage
mkdir -p bible/database bible/data bible/images
tar -xzf ../../bible-deploy.tar.gz -C bible/
rm ../../bible-deploy.tar.gz
```

### 3. Configure Environment

```bash
cd ~/backend-api
cp .env.example .env
nano .env  # Fill in your credentials
```

Required variables:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- JWT_SECRET
- APP_URL
- CORS_ALLOWED_ORIGINS

### 4. Set Permissions

```bash
cd ~/backend-api
chmod -R 755 storage/
chmod 644 storage/bible/database/bible_encyclopedia.sqlite
chmod 644 .env
mkdir -p storage/logs
chmod 755 storage/logs
```

### 5. Test Deployment

```bash
# API Health Check
curl https://your-domain.com/api/health

# Bible Sections
curl https://your-domain.com/api/bible/sections

# Bible Search
curl "https://your-domain.com/api/bible/search?q=المسيح&limit=5"
```

## ✅ Success Criteria

- [ ] API returns JSON responses without errors
- [ ] Frontend loads at https://your-domain.com/
- [ ] Bible Hub accessible at https://your-domain.com/bible/
- [ ] Search returns results in < 1 second
- [ ] Articles load correctly
- [ ] No console errors in browser (F12)

## 📞 Support

If issues occur, check:
1. ~/backend-api/storage/logs/php-error.log
2. Hostinger cPanel → Error Logs
3. Browser Console (F12) → Network tab

For full guide, see: backend-api/HOSTINGER_DEPLOYMENT_GUIDE.md
EOF

echo -e "${GREEN}✅ Checklist created${NC}"
echo ""

# Step 6: Summary
echo "=========================================="
echo "✅ Deployment Preparation Complete!"
echo "=========================================="
echo ""
echo "📦 Package Files Created:"
echo ""
ls -lh "$DEPLOY_DIR"/*.tar.gz 2>/dev/null || echo "  (No packages found)"
echo ""
echo "📄 Documentation:"
echo "  - QUICK_DEPLOY.md           (Fast deployment guide)"
echo "  - HOSTINGER_DEPLOYMENT_GUIDE.md  (Full documentation)"
echo "  - DEPLOYMENT_CHECKLIST.txt  (Step-by-step checklist)"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review the checklist: $DEPLOY_DIR/DEPLOYMENT_CHECKLIST.txt"
echo "  2. Upload packages to Hostinger via SSH/FTP"
echo "  3. Follow QUICK_DEPLOY.md for 5-step setup"
echo ""
echo -e "${GREEN}🚀 Ready to deploy!${NC}"
