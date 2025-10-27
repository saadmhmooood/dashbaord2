# Dynamic Widget System - Implementation Documentation

## Overview

The dashboard has been successfully transformed from a static, hardcoded layout into a **dynamic widget system** backed by PostgreSQL. All widgets (metrics cards, flow rate charts, fractions chart, GVF/WLR charts, and production map) are now loaded from the database, making the system fully configurable and ready for future enhancements like drag-and-drop dashboard builders.

---

## Database Schema

### Tables Created

#### 1. `widget_types`
Catalog of available widget types.

```sql
CREATE TABLE widget_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  component_name VARCHAR(100) NOT NULL,
  default_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Seeded Data:**
- `kpi` → MetricsCard (OFR, WFR, GFR, Last Refresh)
- `line_chart` → FlowRateChart (OFR/WFR/GFR line charts)
- `fractions_chart` → FractionsChart (GVF/WLR fractions)
- `donut_chart` → GVFWLRChart (GVF/WLR donut charts)
- `map` → ProductionMap (Device locations)

#### 2. `widget_definitions`
Individual widget configurations.

```sql
CREATE TABLE widget_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  widget_type_id UUID NOT NULL REFERENCES widget_types(id),
  data_source_config JSONB NOT NULL DEFAULT '{}',
  layout_config JSONB NOT NULL DEFAULT '{}',
  created_by BIGINT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seeded Widgets (10 total):**
1. OFR Metric
2. WFR Metric
3. GFR Metric
4. Last Refresh
5. OFR Chart
6. WFR Chart
7. GFR Chart
8. Fractions Chart
9. GVF/WLR Donut Charts
10. Production Map

#### 3. `dashboards`
Dashboard containers.

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  grid_config JSONB NOT NULL DEFAULT '{"cols": 12, ...}',
  created_by BIGINT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `dashboard_layouts`
Connects widgets to dashboards with positioning.

```sql
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id),
  widget_definition_id UUID NOT NULL REFERENCES widget_definitions(id),
  layout_config JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 2, ...}',
  instance_config JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dashboard_id, widget_definition_id)
);
```

#### 5. `dashboard_shares`
Dashboard sharing permissions (for future multi-user features).

```sql
CREATE TABLE dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id),
  user_id BIGINT NOT NULL REFERENCES "user"(id),
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
  shared_by BIGINT NOT NULL REFERENCES "user"(id),
  shared_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(dashboard_id, user_id)
);
```

---

## Backend Implementation

### Files Modified/Created

#### 1. `backend/config/database.js`
Added widget system tables to schema initialization.

#### 2. `backend/scripts/seedWidgets.js`
Seeds all widget types, definitions, dashboard, and layouts.

```javascript
const seedWidgets = async () => {
  // Creates 5 widget types
  // Creates 10 widget definitions
  // Creates 1 dashboard with layout
  // Assigns all 10 widgets to dashboard with positions
};
```

#### 3. `backend/scripts/seed.js`
Updated to include widget seeding step.

#### 4. `backend/routes/widgets.js`
New API routes for widget management:

**Endpoints:**
- `GET /api/widgets/dashboard/:dashboardId` - Get dashboard with all widgets
- `GET /api/widgets/dashboards` - List all dashboards
- `GET /api/widgets/types` - List all widget types

#### 5. `backend/server.js`
Added widgets route: `app.use('/api/widgets', widgetsRoutes);`

---

## Widget Configuration Examples

### OFR Chart Widget Configuration

```json
{
  "layoutId": "abc-123",
  "widgetId": "def-456",
  "name": "OFR Chart",
  "description": "Oil Flow Rate Line Chart",
  "type": "line_chart",
  "component": "FlowRateChart",
  "layoutConfig": {
    "x": 0,
    "y": 1,
    "w": 4,
    "h": 2,
    "minW": 2,
    "minH": 1,
    "static": false
  },
  "dataSourceConfig": {
    "metric": "ofr",
    "unit": "l/min",
    "title": "OFR",
    "dataKey": "ofr"
  },
  "displayOrder": 5
}
```

### OFR Metric Card Configuration

```json
{
  "name": "OFR Metric",
  "type": "kpi",
  "component": "MetricsCard",
  "layoutConfig": {
    "x": 0,
    "y": 0,
    "w": 3,
    "h": 1
  },
  "dataSourceConfig": {
    "metric": "ofr",
    "unit": "l/min",
    "title": "Oil flow rate",
    "shortTitle": "OFR",
    "icon": "/oildark.png",
    "colorDark": "#4D3DF7",
    "colorLight": "#F56C44"
  },
  "displayOrder": 1
}
```

---

## OFR Chart Widget Lifecycle (Full Flow)

### 1. Database Initialization
```bash
npm run seed
```
- Creates widget tables
- Seeds 5 widget types
- Seeds 10 widget definitions
- Creates dashboard with layout

### 2. User Login & Dashboard Load

**Frontend:**
```javascript
// User logs in
const token = await loginUser(credentials);

// Dashboard component mounts
useEffect(() => {
  fetchDashboard();
}, []);
```

**API Call:**
```http
GET /api/widgets/dashboard/{dashboardId}
Authorization: Bearer <token>
```

### 3. Backend Processing

**Route Handler:** `backend/routes/widgets.js`
```javascript
router.get('/dashboard/:dashboardId', auth, async (req, res) => {
  // 1. Validate JWT token
  // 2. Query database for dashboard + widgets
  // 3. Return structured response
});
```

**SQL Query:**
```sql
SELECT
  dl.id as layout_id,
  dl.layout_config,
  dl.instance_config,
  dl.display_order,
  wd.id as widget_id,
  wd.name as widget_name,
  wd.data_source_config,
  wt.name as widget_type,
  wt.component_name
FROM dashboard_layouts dl
JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
JOIN widget_types wt ON wd.widget_type_id = wt.id
WHERE dl.dashboard_id = $1
ORDER BY dl.display_order
```

### 4. Response Structure

```json
{
  "success": true,
  "data": {
    "dashboard": {
      "id": "xyz-789",
      "name": "MPFM Production Dashboard",
      "gridConfig": { "cols": 12, "rowHeight": 100, ... }
    },
    "widgets": [
      {
        "layoutId": "...",
        "widgetId": "...",
        "name": "OFR Chart",
        "type": "line_chart",
        "component": "FlowRateChart",
        "layoutConfig": { "x": 0, "y": 1, "w": 4, "h": 2 },
        "dataSourceConfig": { "metric": "ofr", "unit": "l/min", ... },
        "displayOrder": 5
      },
      // ... 9 more widgets
    ]
  }
}
```

### 5. Frontend Rendering

```javascript
// Loop through widgets from API
widgets.map((widget) => {
  // Dynamically render based on component type
  switch(widget.component) {
    case 'FlowRateChart':
      return (
        <FlowRateChart
          key={widget.layoutId}
          title={widget.dataSourceConfig.title}
          unit={widget.dataSourceConfig.unit}
          dataKey={widget.dataSourceConfig.dataKey}
          chartData={chartData}
          timeRange={timeRange}
        />
      );
    // ... other widget types
  }
});
```

### 6. Data Fetching

```javascript
// Widget component fetches its data
useEffect(() => {
  const fetchData = async () => {
    const response = await apiService.getDeviceChartDataEnhanced(
      deviceId,
      timeRange,
      token
    );
    setChartData(response.data);
  };
  fetchData();
}, [deviceId, timeRange]);
```

### 7. Auto-Refresh

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## Verification Steps

### 1. Check Database (if accessible)

```sql
-- View all widget types
SELECT * FROM widget_types;

-- View all widget definitions
SELECT name, description FROM widget_definitions;

-- View dashboard layout
SELECT
  w.name,
  wt.component_name,
  dl.layout_config,
  dl.display_order
FROM dashboard_layouts dl
JOIN widget_definitions w ON dl.widget_definition_id = w.id
JOIN widget_types wt ON w.widget_type_id = wt.id
ORDER BY dl.display_order;
```

### 2. Check API Response

**Using curl:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/widgets/dashboard/<dashboardId>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": { ... },
    "widgets": [ ... 10 widgets ... ]
  }
}
```

### 3. Check Browser DevTools

**Network Tab:**
- Look for: `GET /api/widgets/dashboard/<id>`
- Status: 200 OK
- Response contains widget configurations

**Console Tab:**
Add logging in frontend:
```javascript
console.log('Widgets loaded from DB:', widgetsData);
```

### 4. Check Backend Logs

After running seed:
```
✅ Widget system seeded successfully
  • Created 5 widget types
  • Created 10 widget definitions
  • Created 1 dashboard with 10 widgets
```

---

## Widget Layout Structure

```
Dashboard Grid (12 columns):

Row 1 (Metrics Cards):
┌─────────┬─────────┬─────────┬─────────┐
│   OFR   │   WFR   │   GFR   │ Refresh │
│ Metric  │ Metric  │ Metric  │  Time   │
└─────────┴─────────┴─────────┴─────────┘

Row 2 (Line Charts):
┌──────────────┬──────────────┬──────────────┐
│  OFR Chart   │  WFR Chart   │  GFR Chart   │
│   (4 cols)   │   (4 cols)   │   (4 cols)   │
└──────────────┴──────────────┴──────────────┘

Row 3 (Fractions & Donuts):
┌─────────────────────────┬─────────────────────────┐
│   Fractions Chart       │   GVF/WLR Donuts        │
│   (GVF/WLR line)        │   (Donut charts)        │
│   (6 cols)              │   (6 cols)              │
└─────────────────────────┴─────────────────────────┘

Row 4 (Map):
┌───────────────────────────────────────────────────┐
│           Production Map                          │
│           (12 cols - full width)                  │
└───────────────────────────────────────────────────┘
```

---

## Before vs After Comparison

### Before (Static)
- ❌ Widget configuration hardcoded in React components
- ❌ Cannot be changed without code deployment
- ❌ No database involvement for widget structure
- ❌ Fixed layout that requires developer intervention
- ✅ Data fetching works (but structure is static)

### After (Dynamic)
- ✅ Widget configuration stored in PostgreSQL database
- ✅ Can be modified via database updates
- ✅ Dashboard loads widget structure from API
- ✅ Widget order, position, type all configurable
- ✅ Foundation for drag-and-drop dashboard builder
- ✅ Data fetching unchanged (same APIs)
- ✅ UI appearance identical (same components)

---

## Running the System

### 1. Setup Database

Make sure your `.env` file in backend directory has:
```env
DATABASE_URL=postgresql://postgres:saad@localhost:5432/saher-dashboard
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Run Seed Script

```bash
npm run seed
```

Expected output:
```
🚀 Starting database initialization and seeding...
🧱 Initializing database schema...
📋 Seeding companies...
👤 Creating admin user...
🏗️ Seeding hierarchy data...
🚨 Seeding alarms data...
📊 Seeding widgets and dashboard...
✅ Widget system seeded successfully
  • Created 5 widget types
  • Created 10 widget definitions
  • Created 1 dashboard with 10 widgets
✅ All database seeding completed successfully!
```

### 4. Start Backend

```bash
npm run dev
```

### 5. Test Widget API

```bash
# List all dashboards
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/widgets/dashboards

# Get dashboard with widgets
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/widgets/dashboard/<dashboardId>
```

---

## Future Enhancements

The system is now ready for:

1. **Admin Dashboard Builder**
   - Drag-and-drop widget positioning
   - Add/remove widgets from dashboard
   - Reorder widgets
   - Resize widgets

2. **Per-User Customization**
   - Each user can have their own dashboard layout
   - Save multiple dashboard configurations
   - Share dashboards with other users

3. **Widget Marketplace**
   - Create custom widget types
   - Install community widgets
   - Plugin architecture for extensibility

4. **Advanced Features**
   - Dashboard templates for different roles
   - Export/import dashboard configurations
   - Widget libraries for different device types
   - Real-time collaboration on dashboards

---

## Technical Notes

### Data Flow

```
User Login
    ↓
JWT Token
    ↓
GET /api/widgets/dashboard/:id (with token)
    ↓
Backend validates token
    ↓
Database query for widgets
    ↓
JSON response with widget configs
    ↓
Frontend parses widget data
    ↓
Dynamically renders components
    ↓
Each widget fetches its own data
    ↓
Display dashboard with live data
```

### Performance Considerations

- Widget configurations cached after first load
- Data fetching happens independently per widget
- `shouldSkipUpdate()` prevents unnecessary re-renders
- Auto-refresh optimized with timestamp comparisons

### Security

- All widget APIs protected with JWT authentication
- Dashboard access controlled via `created_by` or `is_active` flag
- Future: Row-level security for user-specific dashboards

---

## Troubleshooting

### Issue: "Dashboard not found"
**Solution:** Make sure you're using the correct dashboard ID from the database.

```sql
SELECT id, name FROM dashboards;
```

### Issue: "Widget configurations not loading"
**Solution:** Check backend logs for SQL errors. Verify tables exist:

```sql
\dt widget_types
\dt widget_definitions
\dt dashboards
\dt dashboard_layouts
```

### Issue: "UI looks the same as before"
**Solution:** That's expected! The UI appearance is intentionally unchanged. The difference is in WHERE the configuration comes from (database vs hardcoded).

---

## Conclusion

Your dashboard has been successfully transformed into a dynamic, database-driven widget system. The UI remains identical to ensure a seamless user experience, but the underlying architecture now supports full configurability and future enhancements like drag-and-drop dashboard builders.

All 10 widgets (4 metric cards, 3 line charts, 1 fractions chart, 1 GVF/WLR donut chart, and 1 production map) are now loaded from PostgreSQL with complete configuration including positioning, sizing, data sources, and display order.
