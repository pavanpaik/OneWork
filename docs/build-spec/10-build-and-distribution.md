# 10 — Build and Distribution

## Overview

The build pipeline produces a single installable binary per platform that bundles:

1. The Tauri shell (Rust binary)
2. The React frontend (compiled static assets)
3. The Python agent system (PyOxidizer-compiled binary)
4. Static resources (soul.md, tool_definitions.json)

No runtime dependencies. No system Python. No `npm install`. Download → Install → Run.

## Build Pipeline

```
┌─────────────────────────────────────────────────┐
│  Step 1: Build Python Agent                     │
│  pyoxidizer build --release                     │
│  Output: binaries/python-runtime (per platform) │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  Step 2: Build Frontend                         │
│  npm run build (tsc && vite build)              │
│  Output: dist/ (static HTML/JS/CSS)             │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  Step 3: Build Tauri App                        │
│  tauri build                                    │
│  Bundles: dist/ + python-runtime + resources/   │
│  Output: .dmg / .msi / .AppImage                │
└─────────────────────────────────────────────────┘
```

## Python Embedding with PyOxidizer

### Why PyOxidizer

- Compiles Python + all dependencies into a single executable
- No system Python required on the user's machine
- Cross-platform (macOS, Windows, Linux)
- Produces a standalone binary that Tauri can bundle as an external binary

### PyOxidizer Configuration

**File:** `pyoxidizer.bzl`

Key settings:
- **Entry module**: `agents.orchestrator.main` — The stdin/stdout JSON-RPC loop
- **Resources location**: `filesystem-relative:lib` — Fallback for resources that can't be embedded
- **Dependencies**: Only standard library + project code. Minimize pip dependencies.
- **Output name**: `automation-agent`

### Python Dependencies

The Python agent system should use only:
- Standard library modules (`json`, `pathlib`, `asyncio`, `shutil`, `subprocess`, `uuid`, `datetime`, `platform`, `os`)
- No third-party packages for the MVP

This keeps the PyOxidizer build simple and the binary size small. If a dependency is truly needed later, add it explicitly via `exe.pip_install()`.

### Platform-Specific Binaries

PyOxidizer builds are platform-specific. You must build on each target platform:

| Platform | Binary name | Location in Tauri bundle |
|---|---|---|
| macOS (Intel) | `automation-agent-x86_64-apple-darwin` | `src-tauri/binaries/` |
| macOS (ARM) | `automation-agent-aarch64-apple-darwin` | `src-tauri/binaries/` |
| Windows | `automation-agent-x86_64-pc-windows-msvc.exe` | `src-tauri/binaries/` |
| Linux | `automation-agent-x86_64-unknown-linux-gnu` | `src-tauri/binaries/` |

Tauri's `externalBin` config handles the platform suffix automatically. Configure it as:

```json
"externalBin": ["binaries/automation-agent"]
```

Tauri will append the platform triple at build time.

## Frontend Build

### Vite Configuration

Standard Vite build with React plugin:
- Dev server: `localhost:1420` (Tauri dev mode)
- Output: `dist/` directory
- Target: `esnext` (modern browsers — the Tauri webview supports it)

### TypeScript Check

Run `tsc --noEmit` before building to catch type errors. Include in the build script:

```json
"build": "tsc --noEmit && vite build"
```

## Tauri Build

### Configuration

Key `tauri.conf.json` bundle settings:

```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi", "appimage"],
    "identifier": "com.onework.app",
    "resources": [
      "resources/*"
    ],
    "externalBin": [
      "binaries/automation-agent"
    ]
  }
}
```

- **`resources`**: Files copied into the app bundle. Accessible at runtime via Tauri's resource path API.
- **`externalBin`**: The PyOxidizer binary. Tauri resolves the correct platform variant and bundles it.

### Resource Access at Runtime

In Rust, use `app.path_resolver().resolve_resource("resources/soul.md")` to get the absolute path to bundled resources.

Pass this path to the Python process via command-line arguments or environment variables.

### Platform Targets

| Platform | Target | Output |
|---|---|---|
| macOS | `dmg` | `.dmg` disk image with `.app` bundle |
| Windows | `msi` | `.msi` installer |
| Linux | `appimage` | `.AppImage` portable binary |

## Build Scripts

### `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "build:python": "pyoxidizer build --release",
    "build:all": "npm run build:python && npm run build && npm run tauri:build"
  }
}
```

### Full Build Command

```bash
npm run build:all
```

This runs:
1. `pyoxidizer build --release` — Compile Python agent
2. `tsc --noEmit && vite build` — Type-check and compile frontend
3. `tauri build` — Bundle everything into a platform installer

## Development Mode

For development, you don't need PyOxidizer. Run the Python agent directly:

```bash
# Terminal 1: Start Tauri dev (frontend + Rust)
npm run tauri:dev

# The Rust backend should be configured to spawn Python differently in dev mode:
# - Dev: python3 -m agents.orchestrator.main
# - Prod: ./binaries/automation-agent
```

### Dev vs Prod Python Path

In `python_bridge/runtime.rs`, detect the build mode:

```rust
fn get_python_command() -> (String, Vec<String>) {
    if cfg!(debug_assertions) {
        // Development: use system Python
        ("python3".to_string(), vec!["-m".to_string(), "agents.orchestrator.main".to_string()])
    } else {
        // Production: use bundled binary
        let binary = app.path_resolver()
            .resolve_resource("binaries/automation-agent")
            .expect("Python runtime not found");
        (binary.to_string_lossy().to_string(), vec![])
    }
}
```

## App Icons

Place platform-appropriate icons in `src-tauri/icons/`:

| File | Size | Platform |
|---|---|---|
| `32x32.png` | 32x32 | All |
| `128x128.png` | 128x128 | All |
| `128x128@2x.png` | 256x256 | macOS Retina |
| `icon.icns` | Multi-size | macOS |
| `icon.ico` | Multi-size | Windows |

Generate all sizes from a single 1024x1024 source icon using Tauri's icon generation tool:

```bash
npx tauri icon path/to/icon-1024x1024.png
```

## Installer Size Targets

| Component | Estimated Size |
|---|---|
| Tauri shell (Rust) | ~5 MB |
| Frontend (compiled) | ~2 MB |
| Python runtime (PyOxidizer) | ~30-50 MB |
| Resources | < 1 MB |
| **Total installed** | **~40-60 MB** |

The PyOxidizer binary is the largest component. It can be reduced by stripping unused standard library modules.

## CI/CD Considerations (Future)

For automated builds across platforms:
- Use GitHub Actions with platform-specific runners (macOS, Windows, Ubuntu)
- Cache PyOxidizer builds (they're slow)
- Sign macOS builds with an Apple Developer certificate
- Sign Windows builds with a code signing certificate
- Auto-publish releases with platform artifacts
