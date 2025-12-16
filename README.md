# Excel Data Grapher

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

### Data Filtering
Per-axis filters for X, Y, and Z:
- Minimum value
- Maximum value
- Ignore zero values

Filters combine with AND logic.

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
- **Update Graph** - Apply configuration changes
- **Fullscreen** - Expand graph to full viewport (ESC to exit)
- **New Window** - Open graph in a popup window
- **Copy** - Copy graph image to clipboard

### Custom Hover Data
Select which columns appear in hover tooltips beyond the default X, Y, Z values.

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
3. Configure graph type, columns, and filters
4. Click "Update Graph" to render
5. Use "Advanced Options" for overlays and custom hover data
6. Add more graphs with the "Add Graph" button

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
