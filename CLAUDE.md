# Excel Data Grapher

A web application for visualizing Excel data using interactive 2D/3D graphs.

## Project Structure

```
myGrapher/
├── index.html      # Main HTML entry point
├── styles.css      # All styling (design system, layouts, responsive)
├── app.js          # Application logic (state, rendering, interactions)
└── CLAUDE.md       # This file
```

## Tech Stack

- **Plotly.js 2.27.0** - Graph rendering (loaded via CDN)
- **ExcelJS 4.4.0** - Excel file parsing (loaded via CDN)
- **Vanilla JavaScript (ES6+)** - No framework, no build step
- **HTML/CSS** - Standard web structure

## Architecture

### State Management
All application state lives in a single `state` object in `app.js`:
```javascript
const state = {
    allData: {},      // Excel data by sheet name { sheetName: [rowObjects] }
    columnOrder: {},  // Column order per sheet { sheetName: [columnNames] }
    graphs: []        // Array of graph configuration objects
};
```

### Graph Object Structure
Each graph in `state.graphs` has this shape:
```javascript
{
    id: number,              // Unique graph ID
    title: string,           // Display title
    sheetName: string,       // Selected data sheet
    dimension: string,       // '2D' | '2D with Color' | '3D' | '3D with Color'
    graphType: string,       // 'Scatter' | 'Line' | 'Bar' | '3D Scatter'
    columns: {
        x: string,           // X-axis column name
        y: string,           // Y-axis column name
        z: string | null,    // Z-axis column (3D only)
        color: string | null // Color dimension column
    },
    filters: {
        x: { min: number|null, max: number|null, ignoreZero: boolean, engineeringNotation: boolean },
        y: { min: number|null, max: number|null, ignoreZero: boolean, engineeringNotation: boolean },
        z: { min: number|null, max: number|null, ignoreZero: boolean, engineeringNotation: boolean }
    },
    overlayPoints: [],       // Custom marker points
    overlayLines: [],        // Line overlays (equation or manual points)
    overlaySurfaces: [],     // Surface overlays (3D only)
    hoverFields: [],         // Additional columns shown in hover tooltips
    disableOverlayHover: boolean  // Hide hover tooltips on overlay items
}
```

### Key Functions

**File Handling:**
- `handleFileSelect()` - Parses Excel files with ExcelJS, populates state

**Graph Lifecycle:**
- `createGraphObject()` - Creates new graph config with defaults
- `addGraph()` - Adds graph to state, initializes history, renders
- `deleteGraph(graphId)` - Removes graph with confirmation, cleans up history
- `copyGraphSettings(targetId, sourceId)` - Copies config between graphs

**Undo/Redo System:**
- `graphHistory` Map - Stores `{ past: [], future: [] }` per graph (25 steps max)
- `initGraphHistory(graphId)` - Initialize history for new graph
- `saveToHistory(graphId)` - Capture state before changes
- `undo(graphId)` / `redo(graphId)` - Restore previous/next state
- `createGraphSnapshot(graph)` - Deep clone graph config
- `restoreGraphState(graph, snapshot)` - Apply snapshot to graph
- `updateUndoRedoButtons(graphId)` - Enable/disable buttons based on history

**Auto-Update System:**
- `debounce(func, wait)` - Standard debounce utility
- `getDebouncedUpdate(graphId)` - Get/create 300ms debounced updateGraph
- `scheduleHistorySave(graphId)` - Capture snapshot on first keystroke
- `commitPendingHistorySave(graphId)` - Finalize history after debounce
- `setupAutoUpdateListeners(graphId)` - Wire up all input event listeners

**Filter Slider System:**
- `filterDataRanges` Map - Stores `{ x: { min, max }, y: { min, max }, z: { min, max } }` per graph
- `getColumnDataRange(graphId, axis)` - Calculate min/max values from column data
- `updateFilterDataRanges(graphId)` - Recalculate ranges for all axes
- `updateFilterLabel(graphId, axis)` - Update filter label with column name
- `updateAllFilterLabels(graphId)` - Update all three filter labels
- `updateSliderRanges(graphId)` - Set slider min/max/step from data ranges
- `updateSliderRangeVisual(graphId, axis)` - Update colored range bar between handles
- `syncSliderToInputs(graphId, axis)` - Copy slider values to text inputs
- `syncInputsToSlider(graphId, axis)` - Copy text input values to sliders
- `resetFilterToFullRange(graphId, axis)` - Reset filter when column changes

**Rendering:**
- `renderAllGraphs()` - Re-renders all graph sections
- `renderGraphSection(graph)` - Creates DOM for single graph
- `updateGraph(graphId)` - Reads UI state, filters data, renders with Plotly
- `populateGraphControls(graph)` - Updates UI controls from graph state
- `getGraphTypeButtons(dimension, selected, graphId)` - Generates graph type option buttons

**Event Handlers:**
- `onSheetChange(graphId)` - Handles sheet dropdown change
- `onDimensionClick(graphId, dimension)` - Handles dimension button click
- `onTypeClick(graphId, type)` - Handles graph type button click
- `handleCopySettings(graphId)` - Applies settings from another graph

**Trace Building:**
- `buildMainTrace(data, graph, is3D, hasColor)` - Main data scatter/line/bar
- `buildPointTrace(point, is3D, disableHover)` - Single overlay point marker
- `buildLineTrace(line, graph, data, is3D, disableHover)` - Line from equation or points
- `buildSurfaceTrace(surface, graph, data, disableHover)` - Surface (equation/parametric/mesh)
- `buildLayout(graph, is3D)` - Plotly layout config with engineering notation support

**Data Processing:**
- `filterData(data, graph)` - Applies min/max/ignoreZero filters
- `evaluateExpression(expr, variables)` - Safe math expression evaluation

**Graph Actions:**
- `toggleFullscreen(graphId)` - Toggle fullscreen mode (adds/removes exit button dynamically)
- `openInNewWindow(graphId)` - Open graph in popup window
- `copyToClipboard(graphId)` - Copy graph image to clipboard

**Modal System (Draft/Apply Workflow):**
- `openAdvancedOptions(graphId)` - Opens modal, captures snapshot for potential revert
- `applyAdvancedOptions()` - Commits changes, saves to history, updates graph
- `discardAndCloseModal()` - X button handler, restores from snapshot
- `softCloseModal()` - Click-outside handler, keeps changes but doesn't apply
- `closeModalCleanup()` - Clears modal state
- `modalOpenSnapshot` - Stores overlay/hover state when modal opens
- `addOverlayPoint/Line/Surface()` - Add overlay items (no graph update)
- `updateOverlayPoint/Line/Surface(index)` - Update from modal inputs (no graph update)
- `deleteOverlayPoint/Line/Surface(index)` - Remove overlay items (no graph update)

### Graph Types
- **2D**: Scatter, Line, Bar
- **3D**: 3D Scatter only
- All types support optional color dimension (Viridis colorscale)

### Overlay System

**Points**: Custom markers with:
- name, x, y, z (3D), color, size, symbol (circle/square/diamond/cross/x/triangle/star)

**Lines**: Two modes:
- `equation`: y = f(x), optionally z = f(x) for 3D
- `points`: Manual coordinate list (min 2 points)

**Surfaces** (3D only): Three modes:
- `surface`: z = f(x,y), y = f(x,z), or x = f(y,z)
- `parametric`: x(u,v), y(u,v), z(u,v) with u,v in [0, 2*PI]
- `points`: Delaunay triangulated mesh (min 3 points)

### Expression Evaluation
Supported in overlays via `evaluateExpression()`:
- **Operators**: `+`, `-`, `*`, `/`, `^` (power)
- **Functions**: `sin`, `cos`, `tan`, `sqrt`, `abs`, `log`, `exp`
- **Constants**: `pi`, `e`
- **Variables**: `x`, `y`, `z`, `t`, `u`, `v`

Example: `sin(x) * cos(y)`, `sqrt(x^2 + y^2)`, `2*x + 3`

## Development

### Running Locally
```bash
# Simple HTTP server (Python)
python3 -m http.server 8000

# Or with Node.js
npx serve .
```
Then open http://localhost:8000

### No Build Process
Files are served directly - edit and refresh browser to see changes.

### Browser Support
Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Code Conventions

- Functions use camelCase
- DOM IDs use kebab-case with graph ID suffix (e.g., `plot-1`, `x-col-1`)
- State updates happen in event handlers, graph auto-updates via listeners
- Toast notifications via `showToast(message, type)` where type is 'success'|'error'|'info'|'warning'
- Confirmation dialogs use native `confirm()`
- Modal state tracked via `currentModalGraphId` and `modalOpenSnapshot`

### Auto-Update Behavior
- **Immediate update**: Dropdowns, buttons, checkboxes trigger instant graph refresh
- **Debounced update (300ms)**: Text inputs, number inputs wait for typing to stop
- **Manual refresh button**: Kept as fallback, de-emphasized styling
- **Modal changes**: Only applied when user clicks "Apply Changes"

### Undo/Redo Behavior
- Each user action = one undo step (cascading internal changes are grouped)
- 25-step history per graph
- History cleared when graph is deleted
- Undo/Redo buttons in graph header, next to Delete

### UI Layout
Each graph section has a 3-column layout:
- **Left panel**: Controls (sheet dropdown, dimension buttons, type buttons, column selectors)
- **Center**: Graph display with corner action buttons and title input
- **Right panel**: Axis filters (with dual-handle sliders) and copy settings section

**Control Types:**
- Sheet selection: Dropdown
- Dimension: 2x2 grid of option buttons (`2D`, `2D+Color`, `3D`, `3D+Color`)
- Graph Type: Row of option buttons (changes based on dimension)
- Column selectors: Dropdowns
- Filters: Dynamic column name label, "Ignore 0" checkbox, "Engineering notation" checkbox, min/max inputs with dual-handle range slider

### DOM ID Patterns
- Graph section: `graph-section-{id}`
- Plot container: `plot-{id}`
- Controls: `sheet-{id}` (select), `dimension-{id}` (button container), `type-{id}` (button container)
- Columns: `x-col-{id}`, `y-col-{id}`, `z-col-{id}`, `color-col-{id}`
- Filter labels: `x-filter-label-{id}`, `y-filter-label-{id}`, `z-filter-label-{id}`
- Filter inputs: `x-min-{id}`, `x-max-{id}`, `x-ignore-zero-{id}`, `x-eng-notation-{id}`, etc.
- Filter sliders: `x-slider-min-{id}`, `x-slider-max-{id}`, `x-slider-range-{id}`, `x-slider-container-{id}`, etc.
- Visibility groups: `z-col-group-{id}`, `color-col-group-{id}`, `z-filter-group-{id}`
- Copy settings: `copy-from-{id}`
- Modal: `disable-overlay-hover` (checkbox)
- Fullscreen: `.fullscreen-exit-btn` (dynamically added button)

## Initialization

On page load, `initializeExampleGraph()` creates sample 3D data (Gaussian ripple) to demonstrate the app without requiring file upload.

## Testing

Manual testing workflow:
1. Load page - example 3D graph should display with "Gaussian Ripple Example Data" title
2. Upload Excel file - graphs clear, new data loads
3. Add/delete/configure graphs
4. Test dimension buttons (2D/2D+Color/3D/3D+Color) - graph type buttons should update
5. Test graph type buttons (Scatter/Line/Bar for 2D, 3D Scatter for 3D)
6. Test filters:
   - Filter labels should show column names (e.g., "X Filter" becomes "Radius Filter" when column changes)
   - Dual-handle sliders should update text inputs in real-time while dragging
   - Text inputs should update slider positions when edited
   - Graph should update only on slider release (not during drag)
   - Slider range should auto-detect from column data
7. Test copy settings (select source graph, click Apply)
8. Test fullscreen:
   - Fullscreen button is in top-left, refresh button in top-right
   - In fullscreen, minimize/exit button appears in top-left corner
   - Clicking minimize or pressing ESC exits fullscreen
9. Test new window, clipboard buttons
10. Test Advanced Options modal (overlays, hover fields, disable overlay hover)
11. Test responsive layout at different screen widths
12. Test auto-update (changes apply automatically without clicking refresh)
13. Test undo/redo buttons (make changes, click undo, click redo)
14. Test Advanced Options Apply/Discard (add overlay, click Apply vs X button)
15. Test 3D camera preservation (rotate graph, change filter, orientation should stay)
16. Test engineering notation:
    - Toggle checkbox in filter section
    - Axis labels should change from numbers like "4000" to "4k"
    - Only visible with large values (>=1000) or small values (<=0.001)
17. Test disable overlay hover:
    - Toggle checkbox in Advanced Options modal
    - When enabled, overlay points/lines/surfaces show no hover tooltip
    - Main data trace hover is NOT affected
