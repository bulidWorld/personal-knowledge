# Windows Packaging

This project uses Tauri to package the Next.js desktop build as a Windows app.

## Prerequisites

Install these on the Windows build machine:

1. Node.js 20 or newer
2. Rust with Cargo
3. Microsoft C++ Build Tools with the MSVC toolchain
4. WebView2 runtime, or network access during install when using the WebView2 bootstrapper
5. NSIS, only needed when generating the fallback installer with `scripts/windows-installer.nsi`

Verify the required tools:

```powershell
node --version
npm --version
rustc --version
cargo --version
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` for the commands below.

## Build

Install dependencies:

```powershell
npm install
```

Build the Windows executable and installers:

```powershell
npm.cmd run build:windows
```

The command runs the Next.js desktop export first through Tauri's `beforeBuildCommand`, then compiles and bundles the Rust desktop shell.

If the Tauri NSIS tool download is unstable, build the executable first and generate the NSIS setup package with the local script:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:LOCALAPPDATA\Programs\NSIS;$env:PATH"
npm.cmd run build:next:desktop
npx.cmd tauri build --target x86_64-pc-windows-msvc --no-bundle
New-Item -ItemType Directory -Force src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis
& "$env:LOCALAPPDATA\Programs\NSIS\makensis.exe" scripts\windows-installer.nsi
```

## Outputs

Expected artifacts:

```txt
src-tauri/target/x86_64-pc-windows-msvc/release/personal-knowledge-desktop.exe
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/
```

The NSIS directory contains the user-facing setup executable. The MSI directory contains the Windows Installer package.

Current generated NSIS setup path:

```txt
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Personal Knowledge Desktop_0.1.0_x64-setup.exe
```
