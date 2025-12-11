# Excel Data Grapher - Requirements Document

## 1. Project Overview

**Purpose:** Web application for visualizing data from Excel files using interactive 2D/3D graphs.

**Tech Stack:**
- Plotly.js 2.27.0 (graph rendering)
- ExcelJS 4.x (Excel parsing)
- Vanilla JavaScript (ES6+)
- HTML/CSS/JS (standard web structure)

**Target Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 2. Core Features

### 2.1 Data Import
**Excel Files:**
- File upload input (.xlsx, .xls)
- Client-side parsing with ExcelJS
- Auto-load on file selection
- Support for drag-and-drop upload (optional)

**Data Handling:**
- Support multiple sheets per file
- Preserve column order from source
- Auto-detect and parse numeric columns
- First row = headers
- Empty cells = null values
- Confirmation dialog before clearing existing graphs when loading new file

### 2.2 Graph Management
**Multiple Graphs:**
- Add unlimited graphs to page
- Each graph is independent
- Copy settings between graphs
- Delete individual graphs
- Example graph loads on page load (deletable)

**Graph Types:**
- **2D:** Scatter, Line, Bar
- **3D:** 3D Scatter
- Optional color dimension for all types

### 2.3 Graph Configuration

**Basic Controls (per graph):**
- Sheet selector (dropdown)
- Dimension selector: 2D, 2D with Color, 3D, 3D with Color
- Graph type selector (changes based on dimension)
- Column selectors: X, Y, Z (3D only), Color (when color dimension enabled)
- Graph title (editable text input)

**Data Filters (per axis):**
- Min value filter
- Max value filter
- "Ignore Zero" checkbox
- Filters combine with AND logic

**Graph Actions:**
- Update Graph button (applies changes)
- Fullscreen toggle
- Delete graph
- Copy settings from another graph

### 2.4 Advanced Features

**Overlay Points:**
- Add custom points to any graph
- Properties per point: Name, X, Y, Z (3D), Color, Size (1-30), Symbol (circle/square/diamond/cross/x/triangle/star)
- Add/delete multiple points

**Overlay Lines:**
- Two modes: Equation or Manual Points
- **Equation Mode:**
  - Define y = f(x) and z = f(x) (3D)
  - Support operators: +, -, *, /, ^
  - Support functions: sin, cos, tan, sqrt, abs, log, exp
  - Support constants: pi, e
- **Points Mode:**
  - Define line via 2+ points (draggable list)
  - X, Y, Z coordinates per point
- Properties per line: Name, Color, Width (1-10)

**Overlay Surfaces (3D only):**
- Three modes: Surface Equation, Parametric, Manual Points
- All modes create smooth mesh surfaces (Plotly mesh3d or surface traces)
- **Surface Mode:**
  - Choose variable: z=f(x,y), y=f(x,z), or x=f(y,z)
  - Input equation
  - Evaluated on 30×30 grid to create smooth surface
- **Parametric Mode:**
  - Define x(t), y(t), z(t) equations
  - Evaluated over parameter range to create smooth surface
- **Points Mode:**
  - Define surface via 3+ vertex points
  - Creates triangulated mesh surface connecting all points (Delaunay triangulation)
  - Minimum 3 points (forms single triangle)
  - More points = more detailed faceted surface
- Properties per surface: Name, Color, Opacity (0.0-1.0)
- Note: Width property not applicable to surfaces (only for lines)

**Custom Hover Data:**
- Select which columns appear in hover tooltips
- Checkbox grid showing all available columns
- Shows in addition to X, Y, Z values

---

## 3. User Interface Requirements

### 3.1 Layout Structure

**Header Section:**
- Purple gradient background (#667eea to #764ba2)
- App title with chart icon
- Centered Excel file upload input

**Graph Sections:**
- Each graph in its own container
- Three-column layout per graph:
  - **Left (250px):** Control dropdowns
  - **Center (flexible):** Graph display with action buttons
  - **Right (280px):** Filter controls
- Stack vertically on mobile (≤1024px)

**Bottom:**
- "Add Graph" button (centered)

### 3.2 Design System

**Colors:**
- Primary: Purple gradient (#667eea to #764ba2)
- Success/Add: Green (#10b981)
- Danger/Delete: Red (#ef4444)
- Info: Blue (#3b82f6)
- Background: White cards on gradient
- Text: Dark gray (#1e293b) headings, medium gray (#475569) labels
- Borders: Light gray (#cbd5e1, #e2e8f0)

**Typography:**
- Font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Title: 28px
- Section headers: 16-20px bold
- Labels: 13-14px semi-bold
- Body: 14px

**Spacing:**
- Container max-width: 1400px
- Section padding: 20-24px
- Element gaps: 12-16px
- Graph margin-bottom: 24px

### 3.3 Interactive Elements

**Graph Display:**
- White background, 2px gray border, 8px rounded corners
- Resizable (drag corner, min 400×300px)
- Default size: full width × 500px height
- Fullscreen mode (ESC to exit)
- Plotly toolbar: zoom, pan, rotate, camera, download PNG, reset axes

**Notifications:**
- Toast notifications (top-right corner)
- Types: Success (✅), Error (❌), Info (ℹ️), Warning (⚠️)
- Auto-dismiss after 5 seconds
- Slide-in animation

**Modals:**
- Advanced Options dialog
- Semi-transparent overlay
- Max width: 800px, max height: 90vh (scrollable)
- Close button (×)

**Confirmation Dialogs:**
- Native browser confirm() for destructive actions
- Use cases: Loading new data, deleting graphs

---

## 4. Data Model

### 4.1 Application State

```javascript
{
  allData: {
    "Sheet1": [
      { "Column1": value, "Column2": value, ... },
      ...
    ],
    "Sheet2": [ ... ]
  },

  columnOrder: {
    "Sheet1": ["Column1", "Column2", ...],
    "Sheet2": [...]
  },

  graphs: [
    {
      title: string,
      sheetName: string,
      dimension: "2D" | "2D with Color" | "3D" | "3D with Color",
      graphType: "Scatter" | "Line" | "Bar" | "3D Scatter",
      columns: {
        x: string,
        y: string,
        z: string | null,
        color: string | null
      },
      filters: {
        x: { min: number | null, max: number | null, ignoreZero: boolean },
        y: { min: number | null, max: number | null, ignoreZero: boolean },
        z: { min: number | null, max: number | null, ignoreZero: boolean }
      },
      overlayPoints: [
        { name: string, x: number, y: number, z: number | null,
          color: string, size: number, symbol: string }
      ],
      overlayLines: [
        {
          name: string,
          color: string,
          width: number,
          mode: "equation" | "points",
          equation: { y: string, z: string | null } | null,
          points: [{ x: number, y: number, z: number | null }] | null
        }
      ],
      overlaySurfaces: [
        {
          name: string,
          color: string,
          opacity: number,
          mode: "surface" | "parametric" | "points",
          surfaceEquation: { variable: "z" | "y" | "x", equation: string } | null,
          parametricEquations: { x: string, y: string, z: string } | null,
          points: [{ x: number, y: number, z: number }] | null
          // Note: All modes render as mesh3d or surface traces
        }
      ],
      hoverFields: string[]
    }
  ]
}
```

---

## 5. Functional Requirements

### 5.1 Data Loading

**FR-1:** User can upload Excel file (.xlsx, .xls)
- Use ExcelJS to parse file
- Extract all sheets
- Store in `allData` object
- Show success toast with sheet count and filename

**FR-2:** Loading new data clears all existing graphs
- Show confirmation dialog if graphs exist
- Clear `graphs` array on confirmation
- Re-render page

**FR-3:** Column order preserved from source
- Store column order in `columnOrder` object
- Use for populating dropdowns

**FR-4:** (Optional) Drag-and-drop file upload
- Accept files dropped anywhere on page
- Highlight drop zone on drag-over
- Process file same as file input

### 5.2 Graph Creation & Configuration

**FR-5:** User can add multiple graphs
- Click "Add Graph" button
- Create new graph object with default values
- Append to `graphs` array
- Render new graph section

**FR-6:** User can select sheet, dimension, type, and columns
- Populate sheet dropdown from `allData` keys
- Change graph type options based on dimension
- Show/hide Z selector based on dimension
- Show/hide Color selector based on dimension
- Populate column dropdowns from selected sheet

**FR-7:** User can set graph title
- Editable text input
- Store in graph object
- Display in graph legend

**FR-8:** User can apply filters per axis
- Min/Max numeric inputs
- Ignore Zero checkbox
- Apply filters on "Update Graph" click
- Combine filters with AND logic

**FR-9:** User can delete graphs
- Show confirmation dialog
- Remove from `graphs` array
- Re-render page

**FR-10:** User can copy settings between graphs
- Dropdown shows all other graphs by title
- Copy dimension, type, columns, filters (not overlays)
- Require "Update Graph" to apply

### 5.3 Graph Rendering

**FR-11:** Render 2D graphs (Scatter, Line, Bar)
- Filter data based on filters
- Create Plotly trace with X, Y data
- Apply color dimension if selected
- Render with Plotly.newPlot()

**FR-12:** Render 3D Scatter graphs
- Filter data based on filters
- Create Plotly 3D scatter trace with X, Y, Z data
- Apply color dimension if selected
- Render with Plotly.newPlot()

**FR-13:** Apply overlay points
- Add separate trace per point
- Use specified coordinates, color, size, symbol
- Render on same graph

**FR-14:** Apply overlay lines
- **Equation mode:** Evaluate equation at sample points, create line trace
- **Points mode:** Create line trace from specified points
- Apply color and width
- Render on same graph

**FR-15:** Apply overlay surfaces (3D only)
- All modes create smooth mesh surfaces using Plotly's mesh3d or surface traces
- **Surface mode:**
  - Evaluate equation on 30×30 grid
  - Create smooth surface trace from grid data
- **Parametric mode:**
  - Evaluate x(t), y(t), z(t) over parameter range
  - Create smooth surface trace from parametric data
- **Points mode:**
  - Use specified vertex points (minimum 3)
  - Apply Delaunay triangulation to create mesh3d surface
  - Connect all points into continuous triangulated mesh
- Apply color and opacity to surface
- Render on same graph as data

**FR-16:** Custom hover data
- Include selected columns in hover template
- Show in addition to X, Y, Z values

**FR-17:** Update graph on button click
- Re-filter data
- Re-evaluate overlays
- Call Plotly.react() to update graph

**FR-18:** Fullscreen mode
- Expand graph to viewport
- Show "Press ESC to exit" notification
- ESC key exits fullscreen

### 5.4 Advanced Options Modal

**FR-19:** Open/close Advanced Options dialog
- Click "Advanced Options" link
- Show modal overlay
- Click × or outside to close

**FR-20:** Add/edit/delete overlay points
- Add Point button creates new point entry
- Each point has inputs for all properties
- Delete button removes point
- Validate numeric inputs

**FR-21:** Add/edit/delete overlay lines
- Add Line button creates new line entry
- Toggle between Equation and Points mode
- Each mode shows relevant inputs
- Validate equations and numeric inputs
- Minimum 2 points in Points mode

**FR-22:** Add/edit/delete overlay surfaces (3D only)
- Add Surface button creates new surface entry
- Toggle between Surface, Parametric, Points modes
- Each mode shows relevant inputs
- All modes result in smooth mesh surface visualization
- Validate equations and numeric inputs
- Minimum 3 points in Points mode (creates triangulated mesh)

**FR-23:** Select hover data fields
- Show checkbox grid of all columns
- Store selected fields in graph object
- Apply to hover template

**FR-24:** Show mathematical expression reference
- Display supported operators, functions, constants
- Show example expressions

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Client-side processing only (no server data storage)
- Instant filter updates (no loading spinners for filters)
- Hardware-accelerated rendering (WebGL for 3D)
- 30×30 grid resolution for surfaces (balance quality/speed)

### 6.2 Usability
- Responsive design (mobile ≤1024px)
- Touch-friendly controls on mobile
- Clear visual feedback for all actions
- Tooltips on hover for graph data points
- Error messages for invalid inputs

### 6.3 Compatibility
- Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Requires ES6, Fetch API, File API, Canvas/WebGL
- No polyfills for older browsers

### 6.4 Code Organization
- Standard web structure: separate HTML, CSS, and JS files
- Modular JavaScript (can use ES6 modules or separate script files)
- External dependencies: Plotly.js and ExcelJS (loaded via CDN or local)
- No build process required (optional bundling for production)

---

## 7. Technical Implementation Notes

### 7.1 Graph Rendering
- Use Plotly.js for all visualizations
- Viridis color scale for color dimensions
- White background, light gray grid lines
- Interactive legend (click to toggle series)

### 7.2 Equation Parsing
- Use `eval()` or math.js for evaluating expressions
- Sanitize inputs to prevent code injection
- Support variables: x, y, z, t
- Support operators: +, -, *, /, ^
- Support functions: sin, cos, tan, sqrt, abs, log, exp
- Support constants: pi, e

### 7.3 Error Handling
- Validate numeric inputs before graphing
- Show error toast for invalid data/equations
- Graceful degradation for missing data
- Catch and display Plotly rendering errors

### 7.4 State Management
- Store all state in JavaScript objects (no framework)
- Re-render graphs on state changes
- No persistence (state lost on page reload)
- Could add localStorage for session persistence (optional)

---

## 8. User Stories

**US-1:** As a data analyst, I want to upload an Excel file and see my data in a 3D scatter plot so I can identify patterns.

**US-2:** As a researcher, I want to filter out zero values and apply min/max ranges so I can focus on relevant data.

**US-3:** As a student, I want to overlay a theoretical line equation on my experimental data so I can compare theory vs. reality.

**US-4:** As a teacher, I want to create multiple graphs from different sheets in one file so I can show different datasets side-by-side.

**US-5:** As a power user, I want to add custom points and surfaces to my graph so I can annotate regions of interest.

**US-6:** As a mobile user, I want the interface to work on my tablet so I can analyze data on the go.

