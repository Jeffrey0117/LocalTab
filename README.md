# LocalTab

A lightweight, single-file localhost dashboard for developers. View and manage multiple local dev servers in one browser tab.

## Features

- **Multiple Layouts** - Row, Column, 2x2 Grid, Left/Right/Top Main, Tab Mode
- **Tab Mode** - Browser-like tabs for switching between panels
- **Panel Management** - Add, remove, rename panels on the fly
- **Keyboard Shortcuts** - Fast navigation without touching the mouse
- **Auto-Save** - Configuration persists in localStorage
- **Import/Export** - Share or backup your setup as JSON
- **Notification Badges** - See which panels have updates

## Usage

1. Open `index.html` in your browser
2. Add your localhost URLs
3. Pick a layout that works for you

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-9` | Focus panel by number |
| `R` | Reload current panel(s) |
| `←` `→` | Switch tabs (Tab Mode) |

## Configuration

- **Export** - Download current setup as JSON
- **Import** - Load a saved configuration
- **Reset** - Restore default settings

## Tech

Single HTML file. No build step. No dependencies. Just open and use.

## License

MIT
