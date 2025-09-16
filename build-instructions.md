# Building Atomic Copilot Desktop

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development**:
   ```bash
   npm start
   ```

3. **Build for distribution**:
   ```bash
   npm run build
   ```

## Step-by-Step Setup

### 1. Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### 2. Install Dependencies
```bash
cd desktop-app
npm install
```

This will install:
- **Electron** - Desktop app framework
- **electron-builder** - For creating distributable packages
- **electron-store** - For persistent settings storage

### 3. Development

**Run the app**:
```bash
npm start
```

**Run with dev tools**:
```bash
npm run dev
```

### 4. Building for Distribution

**All platforms**:
```bash
npm run build
```

**Specific platforms**:
```bash
npm run build-mac     # macOS (Intel + Apple Silicon)
npm run build-win     # Windows
npm run build-linux   # Linux AppImage
```

### 5. Distribution Files

Built apps will be created in the `dist/` folder:

- **macOS**: `.dmg` installer file
- **Windows**: `.exe` installer 
- **Linux**: `.AppImage` portable app

## Adding Icons

To add proper app icons, place these files in the `assets/` folder:

- **icon.icns** - macOS icon (512x512)
- **icon.ico** - Windows icon (256x256)
- **icon.png** - Linux icon (512x512)
- **tray-icon.png** - System tray icon (16x16 or 32x32)

## Code Signing (Optional)

For distribution, you may want to code sign your app:

### macOS
1. Get a Developer ID certificate from Apple
2. Add to `package.json`:
   ```json
   "build": {
     "mac": {
       "identity": "Developer ID Application: Your Name"
     }
   }
   ```

### Windows
1. Get a code signing certificate
2. Add to `package.json`:
   ```json
   "build": {
     "win": {
       "certificateFile": "path/to/certificate.p12",
       "certificatePassword": "password"
     }
   }
   ```

## Auto-Updates (Optional)

To enable auto-updates:

1. Set up a release server
2. Add update configuration to `package.json`
3. Implement update checking in `main.js`

## Troubleshooting Build Issues

**Permission errors on macOS**:
```bash
sudo xcode-select --install
```

**Windows build on macOS**:
```bash
brew install wine
```

**Linux build requirements**:
```bash
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2
```

**Clear build cache**:
```bash
rm -rf node_modules dist
npm install
npm run build
```

## Production Optimization

For production builds, consider:

1. **Minimize bundle size** - Remove dev dependencies
2. **Code obfuscation** - Protect your source code
3. **Performance optimization** - Minimize startup time
4. **Security** - Enable context isolation, disable node integration

## Deployment Checklist

- [ ] Icons added to `assets/` folder
- [ ] App metadata updated in `package.json`
- [ ] Code signed (if required)
- [ ] Tested on target platforms
- [ ] Auto-updater configured (if needed)
- [ ] Installation tested
- [ ] Uninstallation tested

---

Your desktop app is now ready for distribution! 🚀