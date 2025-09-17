[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/habibidipopadi-sentauri-desktop-badge.png)](https://mseep.ai/app/habibidipopadi-sentauri-desktop)

# Atomic Copilot Desktop

🖥️ **AI-powered design system assistant with local LLM support**

A desktop application built with Electron that provides an AI copilot for atomic design systems, supporting both cloud APIs and local LLMs.

## Features

### 🤖 **AI Providers**
- **OpenAI** (GPT-4, GPT-3.5 Turbo)
- **Anthropic Claude** (Claude-3 family)
- **Google Gemini** (Gemini Pro, Gemini Vision)
- **Local LLMs**:
  - 🖥️ **Ollama** - Easy local LLM runner
  - 🖥️ **LM Studio** - User-friendly interface
  - 🖥️ **LocalAI** - OpenAI-compatible local API

### 🖥️ **Desktop Features**
- **Global Shortcuts**:
  - `Cmd+Shift+A` (or `Ctrl+Shift+A`) - Toggle app visibility
  - `Cmd+Shift+C` (or `Ctrl+Shift+C`) - Quick chat focus
- **System Tray Integration** - Minimize to tray, right-click context menu
- **Always-on-Top Mode** - Keep copilot visible while working
- **Persistent Settings** - Your configuration saved securely
- **Auto-Detection** - Automatically find running local LLM services
- **Model Discovery** - Refresh and load available models

### 💡 **Capabilities**
- Component discovery and analysis
- Code generation and refactoring
- Design system optimization
- Best practices and documentation
- Real-time AI assistance

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Quick Start

1. **Clone/Download** the desktop app folder
2. **Install dependencies**:
   ```bash
   cd desktop-app
   npm install
   ```

3. **Run in development**:
   ```bash
   npm start
   ```

### Building for Distribution

#### Build for all platforms:
```bash
npm run build
```

#### Build for specific platforms:
```bash
npm run build-mac     # macOS (Intel + Apple Silicon)
npm run build-win     # Windows
npm run build-linux   # Linux AppImage
```

Built apps will be in the `dist/` folder.

## Local LLM Setup

### Ollama (Recommended)
1. **Install Ollama**: Visit [ollama.ai](https://ollama.ai)
2. **Pull a model**: `ollama pull llama2`
3. **In Copilot**: Select "Ollama (Local LLM)" and click "Auto-Detect"

### LM Studio
1. **Download**: Visit [lmstudio.ai](https://lmstudio.ai)
2. **Load a model** and start the local server
3. **In Copilot**: Select "LM Studio (Local LLM)" and click "Auto-Detect"

### LocalAI
1. **Setup LocalAI**: Follow [localai.io](https://localai.io) instructions
2. **Start the server** on port 8080
3. **In Copilot**: Select "LocalAI" and click "Auto-Detect"

## Cloud API Setup

### OpenAI
1. Get your API key from [OpenAI Platform](https://platform.openai.com)
2. In settings, select "OpenAI" and enter your API key
3. Choose your preferred model (GPT-4 recommended)

### Anthropic Claude
1. Get your API key from [Anthropic Console](https://console.anthropic.com)
2. In settings, select "Anthropic Claude" and enter your API key
3. Choose your preferred Claude model

### Google Gemini
1. Get your API key from [Google AI Studio](https://makersuite.google.com)
2. In settings, select "Google Gemini" and enter your API key
3. Choose your preferred Gemini model

## Usage

### Basic Chat
1. **Open the app** (or use global shortcut)
2. **Configure your AI provider** in settings
3. **Start chatting** about your design system needs

### Global Shortcuts
- **Quick Toggle**: `Cmd+Shift+A` to show/hide the app
- **Quick Chat**: `Cmd+Shift+C` to open and focus chat input

### System Tray
- **Right-click** the tray icon for options
- **Double-click** to show/hide the app
- **Always on top** toggle available

## Development

### Project Structure
```
desktop-app/
├── src/
│   ├── main.js         # Electron main process
│   ├── preload.js      # IPC bridge
│   ├── index.html      # App UI
│   └── app.js          # App logic
├── assets/             # Icons and assets
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Development Commands
```bash
npm start              # Run in development
npm run dev           # Run with dev tools
npm run build         # Build for distribution
npm run dist          # Create distributable packages
```

### Adding New Features
1. **Main Process**: Edit `src/main.js` for Electron features
2. **Renderer**: Edit `src/app.js` for app logic
3. **UI**: Edit `src/index.html` and CSS for interface
4. **IPC**: Use `src/preload.js` for secure communication

## Privacy & Security

- **Local Storage**: Settings stored securely on your device
- **No Telemetry**: No usage data sent to external servers
- **API Keys**: Stored locally, never transmitted to our servers
- **Local LLMs**: Complete privacy - everything runs on your machine

## Troubleshooting

### Common Issues

**Can't detect local LLM:**
- Ensure the service is running
- Check the correct port (Ollama: 11434, LM Studio: 1234, LocalAI: 8080)
- Try manually entering the endpoint URL

**Connection failed:**
- Verify your API key is correct
- Check your internet connection for cloud APIs
- Ensure local LLM service is accessible

**App won't start:**
- Run `npm install` to ensure dependencies are installed
- Check Node.js version (18+ required)
- Try deleting `node_modules` and reinstalling

### Getting Help
- Check the console (View → Toggle Developer Tools) for error messages
- Verify your AI provider's service status
- Try a different AI provider to isolate the issue

## Architecture & Development Notes

### Project Evolution
This project has evolved from a proof-of-concept to a fully functional desktop application used daily. It represents pragmatic engineering decisions focused on shipping working software while identifying areas for future improvement.

### Current Architecture
- **Main Process** (`src/main.js`): Handles Electron lifecycle, window management, and system integration
- **Renderer Process** (`src/app.js`): Manages UI state and AI provider interactions
- **MCP Integration** (`src/mcp-*.js`): Implements Model Context Protocol for extensible tool use
- **Provider Abstraction**: Unified interface for OpenAI, Anthropic, Google, and local LLMs

### Technical Achievements
✅ **Multi-provider AI orchestration** - Seamless switching between AI providers
✅ **MCP Protocol Implementation** - Early adopter of Model Context Protocol
✅ **Local LLM Integration** - Privacy-first approach with Ollama/LM Studio support
✅ **Cross-platform compatibility** - Single codebase for Mac, Windows, Linux
✅ **Real-time streaming** - Responsive UI with streaming AI responses

### Known Areas for Improvement
As this is a living project, I've identified several areas for enhancement:

1. **Code Organization**: The main app.js has grown to 2000+ lines and would benefit from modularization
2. **State Management**: Currently using direct DOM manipulation; considering Redux or Zustand
3. **Type Safety**: Planning TypeScript migration for better development experience
4. **Test Coverage**: Basic tests exist; comprehensive testing suite in development

### Why This Matters
I believe in shipping functional software and iterating based on real usage. This project has:
- **Active users** providing feedback
- **Regular updates** based on user needs
- **Clear roadmap** for architectural improvements

The code you see here works in production. It's not perfect, but it solves real problems for real users every day.

### Upcoming Improvements (Q1 2026)
- [ ] Extract provider integrations into plugin architecture
- [ ] Implement proper state management
- [ ] Add comprehensive error boundaries
- [ ] Migrate critical paths to TypeScript
- [ ] Expand test coverage to 80%+

### Learning Highlights
Building this project taught me:
- The importance of shipping MVPs and iterating based on feedback
- How to balance code quality with delivery speed
- Desktop app distribution challenges across different OS platforms
- The complexity of managing multiple AI provider APIs efficiently
- Early adoption benefits and challenges of new protocols (MCP)

## License

MIT License - feel free to modify and distribute!

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

---

**Built with ❤️ using Electron and modern web technologies**