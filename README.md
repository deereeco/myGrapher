# Excel Data Grapher

![Excel Data Grapher](Pictures/cover%20photo.png)

A web application for visualizing data from Excel files using interactive 2D and 3D graphs powered by Plotly.js.

## Features

### Data Import
- Upload Excel files (.xlsx, .xls)
- Support for multiple sheets per file
- Automatic column detection
- Drag-and-drop file upload

### Graph Types
- **2D Scatter** - Plot points on X/Y axes
- **2D Line** - Connect data points with lines
- **2D Bar** - Bar chart visualization
- **3D Scatter** - Plot points in 3D space

All graph types support an optional **color dimension** to add a fourth variable using the Viridis colorscale.

### Graph Management
- Create unlimited graphs on a single page
- Each graph is independently configurable
- Copy settings between graphs
- Delete individual graphs
- Editable graph titles
- **Undo/Redo** - 25-step history per graph
- **Auto-update** - Graphs refresh automatically as you make changes

### Data Filtering
Per-axis filters for X, Y, and Z with intuitive controls:
- **Dynamic labels** - Filter sections show the actual column name (e.g., "Radius Filter" instead of "X-Axis Filter")
- **Dual-handle range sliders** - Drag min/max handles to filter data visually
- **Text inputs** - Type exact values or see current slider positions
- **Ignore zero values** - Checkbox to exclude zero values
- **Engineering notation** - Display axis values with SI prefixes (k, M, G, etc.)
- **Auto-detected range** - Slider bounds automatically set from column data

Sliders and text inputs are bidirectionally synced. Graph updates on slider release for smooth interaction. Filters combine with AND logic.

### Overlay System

**Overlay Points**
- Add custom marker points to any graph
- Configure: name, coordinates, color, size (1-30), symbol

**Overlay Lines**
- *Equation mode*: Define y = f(x) and z = f(x)
- *Points mode*: Define line via multiple coordinates
- Configure: name, color, width

**Overlay Surfaces** (3D only)
- *Equation mode*: z = f(x,y), y = f(x,z), or x = f(y,z)
- *Parametric mode*: x(u,v), y(u,v), z(u,v)
- *Points mode*: Triangulated mesh from vertices
- Configure: name, color, opacity

### Mathematical Expressions
Supported in overlay equations:
- **Operators**: `+`, `-`, `*`, `/`, `^` (power)
- **Functions**: `sin`, `cos`, `tan`, `sqrt`, `abs`, `log`, `exp`
- **Constants**: `pi`, `e`
- **Variables**: `x`, `y`, `z`, `t`, `u`, `v`

### Graph Actions
- **Undo/Redo** - Revert or redo changes (25-step history)
- **Refresh** - Manual graph refresh (top-right corner, fallback for auto-update)
- **Fullscreen** - Expand graph to full viewport (top-left corner)
  - Minimize button appears in fullscreen mode
  - Press ESC or click minimize to exit
- **New Window** - Open graph in a popup window
- **Copy** - Copy graph image to clipboard

### 3D Graph Interaction
- Rotate, pan, and zoom 3D graphs with mouse/touch
- **Camera preservation** - Graph orientation is maintained when making changes (filters, settings, etc.)

### Custom Hover Data
Select which columns appear in hover tooltips beyond the default X, Y, Z values.

### Overlay Hover Control
Option to disable hover tooltips on overlay items (points, lines, surfaces) while keeping main data hover active.

## Getting Started

### Option 1: Open Directly
Simply open `index.html` in a modern web browser.

### Option 2: Local Server
```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```
Then visit http://localhost:8000

### Quick Start
1. The app loads with example data - explore the interface
2. Click "Choose Excel File" to upload your own data
3. Configure graph type, columns, and filters - graph updates automatically
4. Use "Advanced Options" for overlays and custom hover data
5. Click "Apply Changes" in the modal to apply overlay/hover settings
6. Use Undo/Redo buttons to revert mistakes
7. Add more graphs with the "Add Graph" button

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled and WebGL support for 3D graphs.

## Dependencies

Loaded via CDN (no installation required):
- [Plotly.js 2.27.0](https://plotly.com/javascript/)
- [ExcelJS 4.4.0](https://github.com/exceljs/exceljs)

## Project Structure

```
myGrapher/
├── index.html      # Main HTML page
├── styles.css      # Styling
├── app.js          # Application logic
├── README.md       # This file
├── CLAUDE.md       # Developer notes
└── Requirements.md # Feature specifications
```

## License

MIT
