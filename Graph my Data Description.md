# Graph Google Sheet / Excel Data - Web Page Description

## Table of Contents

1. [Visual Appearance & Layout](#visual-appearance--layout)
2. [User Interface Screenshot Description](#user-interface-screenshot-description)
3. [Data Display on Graphs](#data-display-on-graphs)
4. [Header Section - Data Loading](#header-section---data-loading)
5. [Graph Section Layout](#graph-section-layout)
6. [Graph Controls (Left Panel)](#graph-controls-left-panel)
7. [Graph Display (Center)](#graph-display-center)
8. [Filters (Right Panel)](#filters-right-panel)
9. [Bottom Controls](#bottom-controls)
10. [Advanced Options](#advanced-options)
11. [Notifications & Feedback](#notifications--feedback)
12. [Responsive Design](#responsive-design)
13. [Technical Implementation](#technical-implementation)

---

## 1. Visual Appearance & Layout

### Overall Design
- Purple gradient background (transitions from blue-purple to darker purple)
- White centered container with rounded corners and shadow
- Clean, modern interface with card-based sections
- Maximum container width: 1400px
- Professional color scheme: Purple (#667eea to #764ba2), Green (#10b981), Red (#ef4444), Blue (#3b82f6)

### Color Palette
- **Primary:** Purple gradient
- **Success:** Green
- **Danger:** Red
- **Info:** Blue
- **Background:** White cards on purple gradient
- **Text:** Dark gray (#1e293b) for headings, medium gray (#475569) for labels
- **Borders:** Light gray (#cbd5e1, #e2e8f0)

### Typography
- **Font:** System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **Title:** 28px, white
- **Section headers:** 16-20px, bold
- **Labels:** 13-14px, semi-bold
- **Body text:** 14px

### Spacing
- Generous padding (20-24px) for major sections
- Consistent gaps (12-16px) between elements
- Clean separation between functional areas

---

## 2. User Interface Screenshot Description

### Header Section (Top)
- Purple gradient banner spanning full width
- Chart icon (📊) followed by white title text "Graph Google Sheet / Excel Data"
- Two equal-width sections below title:

#### LEFT - Google URL
- "Google URL" label in white
- White text input box with placeholder "Paste Google Sheets URL here..."
- Blue "📥 Load Sheet Data" button centered below input

#### RIGHT - Excel File
- "Excel File" label in white
- Large white box with "Choose File" button
- File selector for Excel uploads

### Main Graph Section (White Container)
- Rounded white card on purple gradient background
- Drop shadow for depth

#### Graph Title Bar
- "Example 3D Surface" text input field (left)
- Two red buttons on right:
  - 🗑️ Delete Example Data
  - 🗑️ Delete Graph

### Three-Column Layout

#### LEFT COLUMN (Controls - 250px wide)
Vertical stack of dropdown menus with centered text:
- **Sheet:** "Example Data"
- **Dimension:** "3D with Color"
- **Graph Type:** "3D Scatter"
- **X:** "X_Position"
- **Y:** "Y_Position"
- **Z:** "Z_Height"
- **Color:** "ColorValue"
- Blue link at bottom: "⚙️ Advanced Options"

#### CENTER COLUMN (Graph Display)
**Top button bar:**
- Left: Green "🔄 Update Graph" button
- Right: Blue "🔲 Fullscreen" button

**Large interactive 3D visualization showing:**
- Colorful "sombrero" or Mexican hat function
- 3D scatter plot with colored points
- Purple/blue at bottom transitioning to yellow/green at peaks
- Rotating 3D axes with labels (position values shown)
- Plotly toolbar icons at top (camera, zoom, pan, etc.)
- Legend in top-left: "Example 3D Surface" with colored dot
- Color scale bar on right side showing "ColorValue" range (-2 to 6)
- Gradient from dark purple to bright yellow
- White background with subtle grid lines
- Interactive controls for rotation and zoom

#### RIGHT COLUMN (Filters - 280px wide)
- "Filters" heading (centered)
- Three filter sections stacked vertically:

**X SECTION:**
- "X" label (centered)
- ☐ Ignore Zero checkbox (centered)
- Min input box (empty)
- Max input box (empty)

**Y SECTION:**
- "Y" label (centered)
- ☐ Ignore Zero checkbox (centered)
- Min input box (empty)
- Max input box (empty)

**Z SECTION:**
- "Z" label (centered)
- ☐ Ignore Zero checkbox (centered)
- Min input box (empty)
- Max input box (empty)

### Bottom Section (Below graph)
- "Copy Settings From:" label with dropdown showing "-- Select Graph --"
- Centered green "➕ Add Graph" button

### Visual Hierarchy
- Purple header draws attention first
- Eye flows down to white content area
- Graph visualization is the focal point in center
- Controls logically organized left (input) → center (output) → right (filters)
- Action buttons use vibrant colors (green for positive actions, red for destructive)

### Color Usage in Screenshot
- **Background:** Blue-purple gradient (#667eea to #764ba2)
- **Graph colors:** Viridis scale (dark purple → teal → yellow)
- **Buttons:** Green (#10b981), Blue (#3b82f6), Red (#ef4444)
- **Container:** Pure white (#ffffff)
- **Text:** Dark gray for contrast

### Interactive Elements Visible
- Plotly graph toolbar showing zoom, pan, rotate, camera, and fullscreen icons
- Dropdown arrows on all select menus
- Clickable buttons with hover states
- Interactive 3D graph showing rotation capability
- Form inputs with borders indicating editability

---

## 3. Data Display on Graphs

### Graph Rendering
- Powered by Plotly.js library
- Interactive 3D and 2D visualizations
- White background with light gray border
- Resizable containers (drag bottom-right corner)
- Minimum size: 400px × 300px
- Default size: Full width × 500px height

### 2D Graphs
- **Scatter plots:** Individual points, customizable size and color
- **Line plots:** Connected points with lines
- **Bar charts:** Vertical bars for categorical data
- **Optional color dimension:** Color-coded points based on data values

### 3D Graphs
- **Scatter plots:** Points floating in 3D space
- Rotatable view (click and drag)
- Zoom capability (scroll wheel)
- Pan functionality (right-click drag)
- Optional color dimension: Points colored by fourth data variable

### Data Point Appearance
- Default markers: Circles for 2D, spheres for 3D
- Colored by value when color dimension selected
- Hover tooltips show data values
- Legend in top-left corner with semi-transparent background

### Graph Features
- Interactive legend (click to show/hide series)
- Zoom controls (Plotly toolbar)
- Pan and rotate (3D)
- Export options (download as PNG)
- Reset axes button
- Fullscreen mode available

### Color Scales
- Default: Viridis color scale (purple to yellow)
- Continuous gradient for numeric data
- Color bar shows value range
- Title indicates which column is used for color

---

## 4. Header Section - Data Loading

### Layout
- Purple gradient background
- White text
- Centered title: "📊 Graph Google Sheet / Excel Data" (28px)
- Two-column grid below title

### Left Column - Google URL
- **Heading:** "Google URL" (18px, bold, white)
- **Text input:** Full width, rounded corners, white background
- **Placeholder:** "Paste Google Sheets URL here..."
- **Button:** "📥 Load Sheet Data" (white background, purple text)
- Button centered below input

### Right Column - Excel File
- **Heading:** "Excel File" (18px, bold, white)
- **File input:** Styled button appearance
- **Accepts:** .xlsx and .xls files
- Automatically loads on file selection

### Functionality
- Loading new data shows confirmation dialog if graphs exist
- Success toast notification shows number of sheets loaded
- Clears all existing graphs when new data loads

---

## 5. Graph Section Layout

### Each Graph Container
- Light gray background (#f8fafc)
- Rounded corners (8px)
- 2px border (#e2e8f0)
- 20px padding
- 24px margin below each graph

### Header Row
- Graph title input: Large text field (16px, bold)
- "Delete Example Data" button (red, only on example graph)
- "Delete Graph" button (red, right-aligned)

### Main Layout Grid
- Three columns: Left (250px) | Center (flexible) | Right (280px)
- 20px gap between columns
- Responsive: Stacks vertically on smaller screens

---

## 6. Graph Controls (Left Panel)

Controls listed vertically:

### Sheet Selection
- **Label:** "Sheet" (centered, bold, 13px)
- **Dropdown:** Centered text
- Shows all loaded sheet names
- Default: "Load data first..." when empty

### Dimension
- **Label:** "Dimension" (centered, bold)
- **Dropdown:** Centered text
- **Options:** 2D, 2D with Color, 3D, 3D with Color
- Changes available graph types when changed

### Graph Type
- **Label:** "Graph Type" (centered, bold)
- **Dropdown:** Centered text
- **2D options:** Scatter, Line, Bar
- **3D options:** 3D Scatter

### Column Selectors (X, Y, Z, Color)
- **Labels:** Left-aligned ("X", "Y", "Z", "Color")
- **Dropdowns:** Centered text
- Shows all column names from selected sheet
- Columns appear in same order as spreadsheet (left to right)
- Z only visible for 3D graphs
- Color only visible when color dimension selected

### Advanced Options Button
- At bottom of controls
- "⚙️ Advanced Options"
- Opens modal dialog
- 12px top margin

---

## 7. Graph Display (Center)

### Top Buttons Row
- Two buttons side by side
- **Left:** "🔄 Update Graph" (green, bold)
- **Right:** "🔲 Fullscreen" (blue)
- Both 10px padding, rounded corners

### Graph Container
- White background
- 2px light gray border
- Rounded corners (8px)
- 12px internal padding
- Resizable (drag corner handle)
- Contains Plotly interactive graph

### Fullscreen Mode
- Expands to fill entire viewport
- Removes rounded corners
- Shows "Press ESC to exit fullscreen" notification
- ESC key exits fullscreen
- Maintains aspect ratio

---

## 8. Filters (Right Panel)

### Container
- White background
- 2px border
- Rounded corners
- 16px padding

### Title
- "Filters" (14px, centered, medium gray)
- 12px bottom margin

### For Each Axis (X, Y, Z)
- **Label:** Axis name (centered, bold, 13px)
- **Checkbox:** "Ignore Zero" (centered)
- **Min input:** Number field, centered text, full width
- **Max input:** Number field, centered text, full width
- 8px gap between elements
- 12px margin below each axis section

### Functionality
- Filters apply when "Update Graph" clicked
- Multiple filters combine with AND logic
- Empty fields = no filter on that parameter
- Numeric validation on min/max inputs

---

## 9. Bottom Controls

Centered Layout:

### Copy Settings From
- **Label:** "Copy Settings From:" (bold)
- **Dropdown:** Shows other graphs by title
- **Format:** "Graph [#]: [Title]"
- Centered horizontally
- Copies dimension, type, columns, and filters
- Does NOT auto-update; requires "Update Graph" click

### Add Graph Button
- Below all graphs
- Centered on page
- "➕ Add Graph" (green background, white text)
- Large padding (12px × 32px)
- 16px font size
- Creates new blank graph below existing ones

---

## 10. Advanced Options

### Modal Dialog
- Centered overlay with semi-transparent dark background
- White content box with rounded corners
- Maximum width: 800px
- Maximum height: 90vh (scrollable)
- Close button (×) in top-right

### Header
- "Advanced Options" title (20px)
- Border below header

### Sections (each in light gray box)

#### A. Overlay Point(s)
Add custom points to any graph

Each point has one row with:
- Name input (100px)
- X coordinate (80px)
- Y coordinate (80px)
- Z coordinate (80px, 3D only)
- Color picker (50px)
- Size input (60px, range 1-30)
- Symbol dropdown (circle, square, diamond, cross, x, triangle, star)
- Delete button (red, far right)
- "➕ Add Point" button at bottom (green)

#### B. Overlay Line(s)
Define lines via equation or manual points

**Header row per line:**
- Name input (120px)
- Color picker
- Width input (60px, range 1-10)
- Delete button (red)

**Mode switcher buttons:**
- "📐 Equation Mode" (active = purple)
- "📍 Points Mode" (active = purple)

**Equation Mode:**
- Input for y = f(x) equation
- Input for z = f(x) equation (3D only)
- Examples shown in math reference

**Points Mode:**
- Draggable point list (☰ handle)
- X, Y, Z inputs per point
- Minimum 2 points required
- "+ Add Point" button
- "➕ Add Line" button at bottom (green)

#### C. Overlay Surface(s) (3D only)
Three modes: Surface, Parametric, Points

**Header row per surface:**
- Name input (120px)
- Color picker
- Opacity slider (0.0-1.0, shows value)
- Width input (points/parametric mode only)
- Delete button (red)

**Surface Mode:**
- Variable selector (z=f(x,y), y=f(x,z), x=f(y,z))
- Equation input

**Parametric Mode:**
- Three equation inputs: x(t), y(t), z(t)

**Points Mode:**
- Draggable point list
- X, Y, Z inputs per point
- Minimum 3 points required
- "➕ Add Surface" button at bottom (green)

#### D. Hover Data Fields
- Grid of checkboxes (auto-fit columns)
- One checkbox per data column
- Checked fields appear in hover tooltips
- Shows in addition to X, Y, Z values

#### E. Mathematical Expression Reference
- Yellow background (#fef3c7)
- Orange border
- Lists supported operators: `+`, `-`, `*`, `/`, `^`
- Lists functions: `sin`, `cos`, `tan`, `sqrt`, `abs`, `log`, `exp`
- Lists constants: `pi`, `e`
- Shows example expressions

---

## 11. Notifications & Feedback

### Toast Notifications
- Fixed position: Top-right corner
- White background with colored left border
- Box shadow for depth
- Auto-dismiss after 5 seconds
- Slide-in animation from right
- Minimum width: 300px
- Icon + message text

### Types
- **Success (✅):** Green border, "Operation completed"
- **Error (❌):** Red border, "Failed operation"
- **Info (ℹ️):** Blue border, "Status update"
- **Warning (⚠️):** Yellow border, "Non-critical issue"

### Examples
- "Example 3D graph loaded!"
- "Loaded 3 sheet(s) from filename.xlsx"
- "Graph updated successfully"
- "Press ESC to exit fullscreen"
- "Graph deleted"

### Confirmation Dialogs
Browser native `confirm()` dialog used for destructive actions:
- Loading new data (clears graphs)
- Deleting graphs
- Deleting example data

---

## 12. Responsive Design

### Desktop (>1024px)
- Three-column layout maintained
- Full width controls and graphs
- Side-by-side data loading options

### Tablet/Mobile (≤1024px)
- Single column layout
- Controls stack vertically
- Filters below graph
- Data loading options stack vertically
- Touch-friendly controls
- Larger tap targets
- Maintains functionality

### Graph Resizing
- **Desktop:** Drag corner to resize
- **Mobile:** Limited by screen width
- Maintains minimum 400×300px
- Fullscreen works on all devices

---

## 13. Technical Implementation

### Libraries Used
- **Plotly.js 2.27.0:** Graph rendering
- **SheetJS 0.18.5:** Excel file parsing
- **Google Apps Script:** Backend for Google Sheets

### Data Structure
- `allData`: Object with sheet names as keys, array of row objects as values
- `columnOrder`: Preserves left-to-right column order from source
- `graphs`: Array of graph configuration objects
- Each graph stores: dimensions, columns, filters, overlays, title

### Browser Compatibility
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Requires: ES6 JavaScript, Fetch API, File API, Canvas/WebGL
- No frameworks (vanilla JavaScript)
- Embedded CSS and JavaScript (single HTML file)

### Performance
- Client-side processing only
- Instant filter updates
- Hardware-accelerated rendering
- 30×30 grid resolution for surfaces (balance of quality/speed)

### Data Handling
- First row = headers
- Numeric columns auto-detected and parsed
- Empty cells = null values
- Column order preserved from source
- Multiple sheets supported
- No data stored on server
