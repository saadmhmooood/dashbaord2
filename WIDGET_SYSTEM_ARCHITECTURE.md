# Widget System Architecture

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WIDGET SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Frontend   │ ───► │   Backend    │ ───► │   Database   │ │
│  │   (React)    │ ◄─── │   (Node.js)  │ ◄─── │  (Postgres)  │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                      │                      │         │
│    Displays              REST APIs            Stores Config    │
│    Widgets               + Logging                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

```
┌─────────────────────┐
│   widget_types      │
│─────────────────────│
│ id (UUID)           │ ◄────┐
│ name (text)         │      │
│ component_name      │      │
│ default_config      │      │
└─────────────────────┘      │
                             │
                             │ references
                             │
┌─────────────────────┐      │
│ widget_definitions  │      │
│─────────────────────│      │
│ id (UUID)           │ ◄────┼────┐
│ name (text)         │      │    │
│ widget_type_id ────────────┘    │
│ data_source_config  │           │ (metric, unit, title, colors)
│ created_by          │           │
└─────────────────────┘           │
                                  │
                                  │ references
                                  │
┌─────────────────────┐           │
│   dashboards        │           │
│─────────────────────│           │
│ id (UUID)           │ ◄────┐    │
│ name (text)         │      │    │
│ description (text)  │      │    │
│ grid_config (json)  │      │    │
│ is_active (bool)    │      │    │
└─────────────────────┘      │    │
                             │    │
                             │    │ references both
                             │    │
┌─────────────────────┐      │    │
│ dashboard_layouts   │      │    │
│─────────────────────│      │    │
│ id (UUID)           │      │    │
│ dashboard_id ──────────────┘    │
│ widget_definition_id ───────────┘
│ layout_config (json) │ ← (x, y, w, h positions)
│ instance_config      │
│ display_order        │
└─────────────────────┘
```

## 🔄 Data Flow

### 1. Widget Loading Flow

```
User Opens Dashboard
       │
       ▼
Frontend: useEffect hook fires
       │
       ▼
API Call: GET /api/widgets/dashboards
       │
       ▼
Backend: Query all dashboards
       │
       ▼
Database: Return dashboard list
       │
       ▼
Frontend: Get first dashboard ID
       │
       ▼
API Call: GET /api/widgets/dashboard/:id
       │
       ▼
Backend: JOIN 4 tables
  - dashboard_layouts
  - widget_definitions
  - widget_types
  - dashboards
       │
       ▼
Backend: Log widget details
  [WIDGET SYSTEM] Loaded 10 widgets
       │
       ▼
Frontend: Receive widget data
       │
       ▼
Frontend: Log received data
  [WIDGET SYSTEM FRONTEND] Loaded 10 widgets
       │
       ▼
Frontend: setWidgets(data)
       │
       ▼
Frontend: Render widgets
       │
       ▼
✅ Widgets appear with data from DB
❌ Widgets ignore layout_config positions
```

### 2. Widget Configuration Update Flow

```
Admin Changes Widget Config
       │
       ▼
Update widget_definitions.data_source_config
  (e.g., unit: "l/min" → "m³/h")
       │
       ▼
User Refreshes Dashboard
       │
       ▼
Frontend: GET /api/widgets/dashboard/:id
       │
       ▼
Backend: Returns updated config
       │
       ▼
Frontend: Renders with new unit
       │
       ▼
✅ Widget shows "m³/h" instead of "l/min"
```

### 3. Widget Layout Update Flow (Future with react-grid-layout)

```
Admin Drags Widget
       │
       ▼
Frontend: react-grid-layout onLayoutChange
       │
       ▼
Frontend: Calculate new positions
  { x: 0, y: 0, w: 6, h: 2 }
       │
       ▼
API Call: POST /api/widgets/dashboard/:id/layout
  Body: { layouts: [{ layoutId, layoutConfig }] }
       │
       ▼
Backend: Update dashboard_layouts table
       │
       ▼
Backend: Log changes
  [WIDGET SYSTEM] Updated layout: x=6, y=0, w=6, h=2
       │
       ▼
Database: Save new positions
       │
       ▼
User Refreshes Dashboard
       │
       ▼
Frontend: Load widgets with new positions
       │
       ▼
react-grid-layout: Apply positions
       │
       ▼
✅ Widgets appear in new positions
```

## 🏗️ Component Architecture

### Frontend Component Tree

```
App.tsx
  │
  ├─ Dashboard.tsx
  │   │
  │   └─ DashboardLayout.tsx
  │       │
  │       ├─ DashboardSidebar.tsx
  │       │
  │       └─ DashboardContent.tsx  ◄── Loads widgets from API
  │           │
  │           ├─ MetricsCards.tsx  ◄── Renders KPI widgets
  │           │   │
  │           │   └─ [Individual metric cards]
  │           │       • OFR Metric
  │           │       • WFR Metric
  │           │       • GFR Metric
  │           │       • Last Refresh
  │           │
  │           ├─ FlowRateCharts.tsx  ◄── Renders line charts
  │           │   │
  │           │   └─ [Individual charts]
  │           │       • OFR Chart
  │           │       • WFR Chart
  │           │       • GFR Chart
  │           │
  │           ├─ FractionsChart.tsx  ◄── Renders fractions
  │           │
  │           ├─ GVFWLRCharts.tsx  ◄── Renders donut charts
  │           │
  │           └─ ProductionMap.tsx  ◄── Renders map
  │
  └─ [Other routes]
```

### Widget Configuration Mapping

```
Database                          Frontend Component
────────────────────────────────────────────────────────
widget_type: "kpi"           →    MetricsCards.tsx
component_name: "MetricsCard"

widget_type: "line_chart"    →    FlowRateCharts.tsx
component_name: "FlowRateChart"

widget_type: "fractions_chart"→   FractionsChart.tsx
component_name: "FractionsChart"

widget_type: "donut_chart"   →    GVFWLRCharts.tsx
component_name: "GVFWLRChart"

widget_type: "map"           →    ProductionMap.tsx
component_name: "ProductionMap"
```

## 🔐 Authentication Flow

```
User Login
    │
    ▼
Generate JWT Token
    │
    ▼
Store in localStorage
    │
    ▼
Include in API calls
  Authorization: Bearer <token>
    │
    ▼
Backend: Verify token (protect middleware)
    │
    ├─ Valid → Continue to handler
    │
    └─ Invalid → Return 401 Unauthorized
```

## 📡 API Architecture

### Current Implementation (✅ Working)

```
┌──────────────────────────────────────────────────────────┐
│                     Widget APIs                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Dashboards:                                             │
│  • GET    /api/widgets/dashboards                        │
│  • POST   /api/widgets/dashboards                        │
│  • GET    /api/widgets/dashboard/:id                     │
│                                                          │
│  Layouts:                                                │
│  • POST   /api/widgets/dashboard/:id/layout              │
│  • POST   /api/widgets/dashboard/:id/widget              │
│  • DELETE /api/widgets/dashboard/:id/layout/:layoutId    │
│                                                          │
│  Definitions:                                            │
│  • GET    /api/widgets/definitions                       │
│  • POST   /api/widgets/definitions                       │
│  • PUT    /api/widgets/definitions/:id                   │
│                                                          │
│  Types:                                                  │
│  • GET    /api/widgets/types                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 🎨 Current vs. Future Rendering

### Current Implementation (Static Grid)

```css
/* Hardcoded Tailwind classes */
.grid-cols-4   ←  Always 4 columns
.grid-cols-3   ←  Always 3 columns

┌─────────────────────────────────────────┐
│ [OFR]  [WFR]  [GFR]  [Refresh]         │  ← Row 1 (Fixed)
│                                         │
│ [OFR────Chart]  [WFR────Chart]  [GFR]  │  ← Row 2 (Fixed)
│                                         │
│ [Fractions───Chart─────]  [GVF/WLR──]  │  ← Row 3 (Fixed)
│                                         │
│ [Production──────────Map────────────]   │  ← Row 4 (Fixed)
└─────────────────────────────────────────┘
```

**Problem:**
- Positions are hardcoded in JSX/CSS
- Changing database layout_config has no effect
- Cannot drag-drop or resize

### Future Implementation (Dynamic Grid)

```javascript
// Uses layout_config from database
layout: [
  { i: '1', x: 0, y: 0, w: 3, h: 1 },  // OFR
  { i: '2', x: 3, y: 0, w: 3, h: 1 },  // WFR
  { i: '3', x: 6, y: 0, w: 3, h: 1 },  // GFR
  // ... from database
]

┌─────────────────────────────────────────┐
│ [OFR]  [WFR]  [GFR]  [Refresh]         │  ← From DB
│                                         │
│ [Drag me!]  [Resize me!]  [Move me!]   │  ← Dynamic
│                                         │
│ [Any────Layout───Possible─────────]    │  ← Flexible
│                                         │
│ [Admin──────Configures──────────────]   │  ← Per Domain
└─────────────────────────────────────────┘
```

**Solution:**
- Positions from database layout_config
- react-grid-layout applies them
- Drag-drop changes saved to DB
- Each company gets custom layout

## 🔧 Admin Feature Architecture (Future)

```
Admin Login
    │
    ▼
Admin Dashboard View
    │
    ├─ Device Type Selector
    │   • MPFM
    │   • Level Sensor
    │   • Temperature Sensor
    │   • Heat Sensor
    │   └─ ... more devices
    │
    ├─ Widget Picker (Sidebar)
    │   │
    │   └─ Available Widgets (from DB)
    │       • GET /api/widgets/definitions
    │       • Filter by device type
    │       • Show: name, icon, description
    │
    ├─ Dashboard Grid (Center)
    │   │
    │   └─ react-grid-layout
    │       • Drag widgets from picker
    │       • Resize widgets
    │       • Rearrange widgets
    │       • See live preview
    │
    └─ Control Panel (Top)
        │
        ├─ Grid Settings
        │   • Columns (12)
        │   • Row height (100px)
        │   • Margins
        │
        ├─ Save Button
        │   • POST /api/widgets/dashboard/:id/layout
        │   • Save all positions to DB
        │
        └─ Publish Button
            • Make dashboard active for domain
            • All domain users see this layout
```

## 📊 Data Config vs. Layout Config

### data_source_config (✅ Working)

```json
{
  "metric": "ofr",          // Which data to show
  "unit": "l/min",          // How to display it
  "title": "Oil Flow Rate", // Widget label
  "icon": "/oildark.png",   // Icon path
  "colorDark": "#4D3DF7",   // Theme colors
  "colorLight": "#F56C44"
}
```

**Affects:** Widget content, labels, styling
**Stored in:** `widget_definitions` table
**Updated via:** `PUT /api/widgets/definitions/:id`
**Reflects:** ✅ Immediately in frontend

### layout_config (❌ Not Applied)

```json
{
  "x": 0,        // Grid column (0-11)
  "y": 0,        // Grid row
  "w": 3,        // Width in grid units
  "h": 1,        // Height in grid units
  "minW": 2,     // Minimum width
  "minH": 1,     // Minimum height
  "static": false // Can be moved?
}
```

**Affects:** Widget position, size
**Stored in:** `dashboard_layouts` table
**Updated via:** `POST /api/widgets/dashboard/:id/layout`
**Reflects:** ❌ Not yet (needs react-grid-layout)

## 🔍 Logging Architecture

### Backend Logging

```javascript
// In routes/widgets.js
console.log(`[WIDGET SYSTEM] Loaded dashboard ${id} with ${count} widgets`);
console.log(`  [${index}] ${name} (${component}) - Layout: x=${x}, y=${y}, w=${w}, h=${h}`);
```

**Output:**
```
[WIDGET SYSTEM] Loaded dashboard abc-123 with 10 widgets from database
  [1] OFR Metric (MetricsCard) - Layout: x=0, y=0, w=3, h=1
  [2] WFR Metric (MetricsCard) - Layout: x=3, y=0, w=3, h=1
  ...
```

### Frontend Logging

```javascript
// In DashboardContent.tsx
console.log(`[WIDGET SYSTEM FRONTEND] Loaded ${count} widgets from database`);
console.log(`  [${index}] ${name} (${component})`);
console.log(`      Layout: x=${x}, y=${y}, w=${w}, h=${h}`);
console.log(`      Data: metric=${metric}, unit=${unit}`);
```

**Output:**
```
[WIDGET SYSTEM FRONTEND] Loading dashboard: MPFM Production Dashboard (abc-123)
[WIDGET SYSTEM FRONTEND] Loaded 10 widgets from database
  [1] OFR Metric (MetricsCard)
      Layout: x=0, y=0, w=3, h=1
      Data: metric=ofr, unit=l/min
  ...
[WIDGET SYSTEM FRONTEND] ✓ Widgets loaded and state updated
```

## 🎯 Summary Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Database                Backend              Frontend        │
│  ─────────               ────────             ────────         │
│                                                                │
│  widget_types  ──────►   APIs      ──────►   Load data   ✅   │
│  widget_defs   ──────►   + Log     ──────►   + Log       ✅   │
│  dashboards    ──────►   + Auth    ──────►   Display     ✅   │
│  layouts       ──────►   ✅ Done   ──────►   ❌ Ignore    ✗   │
│                                                                │
│  Data config:  ✅ WORKING   ✅ WORKING      ✅ WORKING         │
│  Layout config:✅ STORED    ✅ LOADED       ❌ NOT APPLIED     │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    FUTURE STATE                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Database                Backend              Frontend        │
│  ─────────               ────────             ────────         │
│                                                                │
│  widget_types  ──────►   APIs      ──────►   Load data   ✅   │
│  widget_defs   ──────►   + Log     ──────►   + Log       ✅   │
│  dashboards    ──────►   + Auth    ──────►   Display     ✅   │
│  layouts       ──────►   ✅ Done   ──────►   ✅ APPLY     ✅   │
│                                              react-grid        │
│                                              -layout           │
│  Data config:  ✅ WORKING   ✅ WORKING      ✅ WORKING         │
│  Layout config:✅ STORED    ✅ LOADED       ✅ APPLIED         │
│                                                                │
│  + Admin UI:   Create custom dashboards per company           │
│  + Drag-drop:  Position and resize widgets                    │
│  + Multi-user: Each domain sees their dashboard               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 📚 Related Documentation

- **Implementation Details:** See `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **API Reference:** See `WIDGET_MANAGEMENT_API_DOCS.md`
- **Testing Guide:** See `WIDGET_SYSTEM_TESTING_QUERIES.sql`
- **Quick Reference:** See `QUICK_REFERENCE.md`
- **System Status:** See `WIDGET_SYSTEM_STATUS_REPORT.md`
