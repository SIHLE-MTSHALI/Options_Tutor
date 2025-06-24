# Options Tutor - Installation Guide

This guide provides detailed installation instructions for Options Tutor across different operating systems and deployment scenarios.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Windows Installation](#windows-installation)
3. [macOS Installation](#macos-installation)
4. [Linux Installation](#linux-installation)
5. [Development Installation](#development-installation)
6. [Troubleshooting](#troubleshooting)
7. [Uninstallation](#uninstallation)

## System Requirements

### Minimum Requirements

**Operating System:**
- Windows 10 (64-bit) or later
- macOS 10.14 (Mojave) or later
- Ubuntu 18.04 LTS or equivalent Linux distribution

**Hardware:**
- RAM: 4GB minimum
- Storage: 500MB free space
- CPU: Intel Core i3 or AMD equivalent
- Graphics: DirectX 11 compatible (Windows) or Metal compatible (macOS)
- Network: Broadband internet connection

### Recommended Requirements

**Hardware:**
- RAM: 8GB or more
- Storage: 1GB free space
- CPU: Intel Core i5 or AMD Ryzen 5 equivalent or better
- Graphics: Dedicated graphics card with 1GB VRAM
- Display: 1920x1080 resolution or higher
- Network: High-speed broadband connection

**Additional Recommendations:**
- Multiple monitors for enhanced trading interface
- SSD storage for faster application performance
- Stable internet connection for real-time data

## Windows Installation

### Standard Installation

#### Step 1: Download
1. Visit the official Options Tutor website
2. Navigate to the Downloads section
3. Click "Download for Windows"
4. Save the installer file (OptionsTutor-Setup.exe) to your Downloads folder

#### Step 2: Pre-Installation
1. **Close all running applications**
2. **Disable antivirus temporarily** (if it interferes with installation)
3. **Run as Administrator** (right-click installer → "Run as administrator")

#### Step 3: Installation Process
1. **Launch Installer**: Double-click OptionsTutor-Setup.exe
2. **Security Warning**: Click "Yes" when prompted by Windows UAC
3. **Welcome Screen**: Click "Next" to continue
4. **License Agreement**: Read and accept the license terms
5. **Installation Location**: 
   - Default: `C:\Program Files\Options Tutor\`
   - Custom: Click "Browse" to select different location
6. **Start Menu Folder**: Choose start menu folder name (default: "Options Tutor")
7. **Additional Tasks**:
   - ✓ Create desktop shortcut
   - ✓ Create Quick Launch shortcut
   - ✓ Associate .ots files with Options Tutor
8. **Ready to Install**: Review settings and click "Install"
9. **Installation Progress**: Wait for files to be copied
10. **Completion**: Click "Finish" to complete installation

#### Step 4: First Launch
1. **Launch Application**: Double-click desktop shortcut or use Start Menu
2. **Windows Firewall**: Allow network access when prompted
3. **Initial Setup**: Complete the welcome wizard
4. **Verification**: Confirm application loads successfully

### Silent Installation (IT Administrators)

#### Command Line Installation
```batch
# Silent installation with default settings
OptionsTutor-Setup.exe /S

# Silent installation with custom directory
OptionsTutor-Setup.exe /S /D=C:\CustomPath\OptionsTutor

# Silent installation without desktop shortcut
OptionsTutor-Setup.exe /S /NODESKTOP

# Silent installation with log file
OptionsTutor-Setup.exe /S /LOG=C:\Temp\OptionsTutor-Install.log
```

#### Group Policy Deployment
1. **Create MSI Package**: Convert installer to MSI format using admin tools
2. **Group Policy Setup**:
   - Open Group Policy Management Console
   - Navigate to Computer Configuration → Software Settings
   - Right-click Software Installation → New → Package
   - Select the Options Tutor MSI file
3. **Deployment Options**:
   - Assigned: Installs automatically
   - Published: Available in Add/Remove Programs

### Windows-Specific Features

#### Registry Settings
The installer creates registry entries at:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Options Tutor\
HKEY_CURRENT_USER\SOFTWARE\Options Tutor\
```

#### File Associations
- `.ots` files: Options Tutor Strategy files
- `.otp` files: Options Tutor Portfolio files
- `.otw` files: Options Tutor Workspace files

#### Windows Integration
- Start Menu integration
- Windows Search integration
- Jump List support (Windows 7+)
- Taskbar progress indicators

## macOS Installation

### Standard Installation

#### Step 1: Download
1. Visit the official Options Tutor website
2. Click "Download for macOS"
3. Save the DMG file (OptionsTutor.dmg) to your Downloads folder

#### Step 2: Installation Process
1. **Mount DMG**: Double-click OptionsTutor.dmg
2. **Disk Image Window**: A new window opens showing the application
3. **Install Application**: Drag "Options Tutor.app" to the Applications folder
4. **Eject DMG**: Right-click the mounted disk and select "Eject"
5. **Security Check**: macOS may show a security warning for unsigned apps

#### Step 3: Security Configuration
1. **Gatekeeper Warning**: If you see "cannot be opened because it is from an unidentified developer"
2. **Override Security**:
   - Open System Preferences → Security & Privacy
   - Click "Open Anyway" next to the Options Tutor warning
   - Or use Terminal: `sudo spctl --master-disable` (not recommended)

#### Step 4: First Launch
1. **Launch Application**: Double-click Options Tutor in Applications folder
2. **Permissions**: Grant necessary permissions when prompted:
   - Network access for market data
   - File system access for saving data
3. **Initial Setup**: Complete the welcome wizard

### Homebrew Installation (Advanced Users)

#### Using Homebrew Cask
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Options Tutor tap (when available)
brew tap options-tutor/homebrew-tap

# Install Options Tutor
brew install --cask options-tutor
```

### macOS-Specific Features

#### Spotlight Integration
Options Tutor integrates with Spotlight search for:
- Application launching
- Document searching
- Strategy file indexing

#### Touch Bar Support (MacBook Pro)
- Quick access to common functions
- Context-sensitive controls
- Trading shortcuts

#### Dark Mode Support
- Automatic theme switching
- Respect system appearance settings
- Optimized for both light and dark modes

## Linux Installation

### Ubuntu/Debian Installation

#### Step 1: Download
1. Visit the official Options Tutor website
2. Select "Download for Linux"
3. Choose the appropriate package:
   - `.deb` for Ubuntu/Debian
   - `.rpm` for Red Hat/Fedora
   - `.tar.gz` for generic Linux

#### Step 2: Install Dependencies
```bash
# Update package list
sudo apt update

# Install required dependencies
sudo apt install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libasound2
```

#### Step 3: Install Package
```bash
# For .deb package
sudo dpkg -i options-tutor_1.0.0_amd64.deb

# Fix any dependency issues
sudo apt install -f

# For .rpm package (on RPM-based systems)
sudo rpm -i options-tutor-1.0.0.x86_64.rpm

# For .tar.gz package
tar -xzf options-tutor-1.0.0-linux.tar.gz
sudo mv options-tutor /opt/
sudo ln -s /opt/options-tutor/options-tutor /usr/local/bin/
```

#### Step 4: Desktop Integration
```bash
# Create desktop entry
cat > ~/.local/share/applications/options-tutor.desktop << EOF
[Desktop Entry]
Name=Options Tutor
Comment=Options Trading Education Platform
Exec=/opt/options-tutor/options-tutor
Icon=/opt/options-tutor/icon.png
Type=Application
Categories=Office;Finance;Education;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

### Arch Linux Installation

#### Using AUR (Arch User Repository)
```bash
# Install yay AUR helper (if not installed)
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si

# Install Options Tutor from AUR
yay -S options-tutor
```

### Fedora/CentOS Installation

#### Using RPM Package
```bash
# Install dependencies
sudo dnf install -y \
    gtk3 \
    libnotify \
    nss \
    libXScrnSaver \
    libXtst \
    xdg-utils \
    at-spi2-atk \
    libdrm \
    libXcomposite \
    libXdamage \
    libXrandr \
    mesa-libgbm \
    libxkbcommon \
    alsa-lib

# Install RPM package
sudo rpm -i options-tutor-1.0.0.x86_64.rpm
```

### Linux-Specific Configuration

#### Environment Variables
Add to `~/.bashrc` or `~/.profile`:
```bash
# Options Tutor configuration
export OPTIONS_TUTOR_HOME="$HOME/.options-tutor"
export OPTIONS_TUTOR_DATA_DIR="$HOME/.local/share/options-tutor"
```

#### Permissions
```bash
# Ensure proper permissions
chmod +x /opt/options-tutor/options-tutor
chown -R $USER:$USER ~/.options-tutor
```

## Development Installation

### Prerequisites

#### Node.js and npm
```bash
# Install Node.js 18.x or later
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (using Homebrew)
brew install node

# Windows (using Chocolatey)
choco install nodejs
```

#### Git
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Windows
# Download from https://git-scm.com/download/win
```

### Clone and Build

#### Step 1: Clone Repository
```bash
git clone https://github.com/options-tutor/options-tutor-app.git
cd options-tutor-app
```

#### Step 2: Install Dependencies
```bash
# Install all dependencies
npm install

# Install development dependencies
npm install --only=dev
```

#### Step 3: Build Application
```bash
# Build for development
npm run build

# Build for production
npm run build:production

# Build for specific platform
npm run build:windows
npm run build:macos
npm run build:linux
```

#### Step 4: Run Development Server
```bash
# Start development server
npm run dev

# Start with debugging
npm run dev:debug

# Start main process only
npm run dev:main

# Start renderer process only
npm run dev:renderer
```

### Development Environment Setup

#### VS Code Configuration
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

#### Environment Variables
Create `.env` file:
```bash
# Development environment
NODE_ENV=development
ELECTRON_IS_DEV=true
DEBUG=options-tutor:*

# API Configuration
API_BASE_URL=https://api.optionstutor.com
API_KEY=your_development_api_key

# Feature Flags
ENABLE_REAL_TIME_DATA=true
ENABLE_BACKTESTING=true
ENABLE_ADVANCED_FEATURES=true
```

## Troubleshooting

### Common Installation Issues

#### Windows Issues

**Issue**: "Windows protected your PC" SmartScreen warning
**Solution**:
1. Click "More info"
2. Click "Run anyway"
3. Or disable SmartScreen temporarily in Windows Security

**Issue**: Antivirus blocking installation
**Solution**:
1. Temporarily disable real-time protection
2. Add Options Tutor to antivirus exclusions
3. Re-enable protection after installation

**Issue**: Installation fails with "Access denied"
**Solution**:
1. Run installer as Administrator
2. Ensure no other instances are running
3. Check disk space availability

#### macOS Issues

**Issue**: "App can't be opened because it is from an unidentified developer"
**Solution**:
1. Control-click the app icon
2. Choose "Open" from the shortcut menu
3. Click "Open" in the dialog

**Issue**: App crashes on startup
**Solution**:
1. Check Console app for error messages
2. Reset app preferences: `rm -rf ~/Library/Preferences/com.optionstutor.app.plist`
3. Clear app cache: `rm -rf ~/Library/Caches/com.optionstutor.app`

#### Linux Issues

**Issue**: Missing dependencies
**Solution**:
```bash
# Check missing libraries
ldd /opt/options-tutor/options-tutor | grep "not found"

# Install missing packages
sudo apt install -f
```

**Issue**: Application won't start
**Solution**:
1. Check permissions: `ls -la /opt/options-tutor/`
2. Run from terminal to see error messages
3. Check system logs: `journalctl -u options-tutor`

### Performance Issues

#### Slow Startup
**Causes and Solutions**:
- **Large cache files**: Clear application cache
- **Network connectivity**: Check internet connection
- **Insufficient RAM**: Close other applications
- **Disk space**: Ensure adequate free space

#### High Memory Usage
**Solutions**:
1. Restart application periodically
2. Reduce number of open charts
3. Disable unnecessary features
4. Increase system RAM if possible

#### Network Issues
**Solutions**:
1. Check firewall settings
2. Verify proxy configuration
3. Test internet connectivity
4. Contact ISP if persistent issues

### Log Files and Debugging

#### Log File Locations

**Windows**:
```
%APPDATA%\Options Tutor\logs\
C:\Users\[username]\AppData\Roaming\Options Tutor\logs\
```

**macOS**:
```
~/Library/Logs/Options Tutor/
~/Library/Application Support/Options Tutor/logs/
```

**Linux**:
```
~/.config/options-tutor/logs/
~/.local/share/options-tutor/logs/
```

#### Debug Mode
Enable debug mode by setting environment variable:
```bash
# Windows
set DEBUG=options-tutor:*

# macOS/Linux
export DEBUG=options-tutor:*
```

## Uninstallation

### Windows Uninstallation

#### Standard Uninstall
1. **Control Panel Method**:
   - Open Control Panel → Programs and Features
   - Find "Options Tutor" in the list
   - Click "Uninstall" and follow prompts

2. **Settings App Method** (Windows 10/11):
   - Open Settings → Apps
   - Search for "Options Tutor"
   - Click and select "Uninstall"

#### Complete Removal
```batch
# Remove application data
rmdir /s "%APPDATA%\Options Tutor"
rmdir /s "%LOCALAPPDATA%\Options Tutor"

# Remove registry entries
reg delete "HKCU\Software\Options Tutor" /f
reg delete "HKLM\Software\Options Tutor" /f
```

### macOS Uninstallation

#### Standard Uninstall
1. Open Finder → Applications
2. Find "Options Tutor.app"
3. Drag to Trash or right-click → Move to Trash
4. Empty Trash

#### Complete Removal
```bash
# Remove application
rm -rf /Applications/Options\ Tutor.app

# Remove user data
rm -rf ~/Library/Application\ Support/Options\ Tutor
rm -rf ~/Library/Preferences/com.optionstutor.app.plist
rm -rf ~/Library/Caches/com.optionstutor.app
rm -rf ~/Library/Logs/Options\ Tutor
```

### Linux Uninstallation

#### Package Manager Removal
```bash
# Ubuntu/Debian
sudo apt remove options-tutor
sudo apt autoremove

# Fedora/CentOS
sudo dnf remove options-tutor

# Arch Linux
sudo pacman -R options-tutor
```

#### Complete Removal
```bash
# Remove application files
sudo rm -rf /opt/options-tutor

# Remove user data
rm -rf ~/.config/options-tutor
rm -rf ~/.local/share/options-tutor
rm -rf ~/.cache/options-tutor

# Remove desktop entries
rm -f ~/.local/share/applications/options-tutor.desktop
```

## Support and Additional Resources

### Getting Help
- **Documentation**: Complete user guide and API reference
- **Community Forum**: User discussions and support
- **Email Support**: support@optionstutor.com
- **GitHub Issues**: Technical issues and bug reports

### Useful Links
- **Official Website**: https://optionstutor.com
- **Documentation**: https://docs.optionstutor.com
- **GitHub Repository**: https://github.com/options-tutor/options-tutor-app
- **Community Forum**: https://community.optionstutor.com

---

*This installation guide is regularly updated. For the latest version, visit our documentation website.*

*If you encounter any issues not covered in this guide, please contact our support team.*