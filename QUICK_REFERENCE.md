# Widget System - Quick Reference

## 🎯 Quick Status

✅ **Working:** Widget data (units, titles, colors) from database
✅ **Working:** Backend APIs for dashboard management
✅ **Working:** Logging and verification
❌ **Not Working:** Widget positioning (x, y, w, h) in frontend

**Why positioning doesn't work:** Frontend uses fixed CSS grid, needs react-grid-layout.

---

## 🔍 Quick Verification

### Check Logs

**Backend (server console):**
```
[WIDGET SYSTEM] Loaded dashboard <id> with 10 widgets from database
  [1] OFR Metric (MetricsCard) - Layout: x=0, y=0, w=3, h=1
```

**Frontend (browser console):**
```
[WIDGET SYSTEM FRONTEND] Loaded 10 widgets from database
  [1] OFR Metric (MetricsCard)
      Layout: x=0, y=0, w=3, h=1
      Data: metric=ofr, unit=l/min
```

### Test Widget Data Change (Works ✅)

```sql
-- Change OFR unit
UPDATE widget_definitions
SET data_source_config = jsonb_set(data_source_config, '{unit}', '"m³/h"')
WHERE name = 'OFR Metric';
```
Refresh frontend → Unit changes ✓

### Test Layout Change (Doesn't work yet ❌)

```sql
-- Move OFR widget
UPDATE dashboard_layouts
SET layout_config = jsonb_set(layout_config, '{x}', '6')
WHERE widget_definition_id = (SELECT id FROM widget_definitions WHERE name = 'OFR Metric');
```
Refresh frontend → Position doesn't change ✗

---

## 📡 API Quick Reference

**Base URL:** `http://localhost:5000/api/widgets`

### List Dashboards
```bash
GET /dashboards
Authorization: Bearer <token>
```

### Get Dashboard Widgets
```bash
GET /dashboard/:dashboardId
Authorization: Bearer <token>
```

### Create Dashboard
```bash
POST /dashboards
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Dashboard",
  "description": "Custom dashboard"
}
```

### Update Widget Layouts (Drag-Drop)
```bash
POST /dashboard/:dashboardId/layout
Authorization: Bearer <token>
Content-Type: application/json

{
  "layouts": [
    {
      "layoutId": "uuid",
      "layoutConfig": { "x": 0, "y": 0, "w": 6, "h": 2 }
    }
  ]
}
```

### Add Widget to Dashboard
```bash
POST /dashboard/:dashboardId/widget
Authorization: Bearer <token>
Content-Type: application/json

{
  "widgetDefinitionId": "uuid",
  "layoutConfig": { "x": 0, "y": 0, "w": 4, "h": 2 }
}
```

### Update Widget Definition (Units, Titles)
```bash
PUT /definitions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "dataSourceConfig": {
    "metric": "ofr",
    "unit": "m³/h",
    "title": "Oil Flow Rate"
  }
}
```

---

## 🗄️ Database Quick Queries

### View All Widgets with Layouts
```sql
SELECT
    wd.name,
    dl.layout_config->>'x' as x,
    dl.layout_config->>'y' as y,
    dl.layout_config->>'w' as width,
    dl.layout_config->>'h' as height,
    wd.data_source_config->>'unit' as unit
FROM dashboard_layouts dl
JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
ORDER BY dl.display_order;
```

### Change Widget Unit
```sql
UPDATE widget_definitions
SET data_source_config = jsonb_set(
    data_source_config,
    '{unit}',
    '"m³/h"'
)
WHERE name = 'OFR Metric';
```

### Move Widget Position
```sql
UPDATE dashboard_layouts
SET layout_config = jsonb_set(
    layout_config,
    '{x}',
    '6'
)
WHERE widget_definition_id = (
    SELECT id FROM widget_definitions WHERE name = 'OFR Metric'
);
```

---

## 🔧 To Fix Layout Positioning

### Install react-grid-layout
```bash
cd frontend
npm install react-grid-layout
npm install @types/react-grid-layout --save-dev
```

### Basic Implementation
```tsx
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizable.css';

const DynamicDashboard = ({ widgets }) => {
  const layout = widgets.map(w => ({
    i: w.layoutId,
    x: w.layoutConfig.x,
    y: w.layoutConfig.y,
    w: w.layoutConfig.w,
    h: w.layoutConfig.h
  }));

  return (
    <GridLayout
      layout={layout}
      cols={12}
      rowHeight={100}
      width={1200}
    >
      {widgets.map(widget => (
        <div key={widget.layoutId}>
          {/* Render widget */}
        </div>
      ))}
    </GridLayout>
  );
};
```

---

## 📚 Full Documentation

- **Complete Status:** `WIDGET_SYSTEM_STATUS_REPORT.md`
- **API Documentation:** `WIDGET_MANAGEMENT_API_DOCS.md`
- **SQL Testing:** `WIDGET_SYSTEM_TESTING_QUERIES.sql`
- **Implementation Summary:** `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Postman Collection:** `backend/postman/10_Widget_Management.postman_collection.json`

---

## 🎯 Admin Dashboard Feature

**Current Status:** Backend ready, frontend needs UI

**What's Ready:**
- ✅ Database schema
- ✅ All APIs
- ✅ Widget definitions per device type
- ✅ Layout persistence
- ✅ Multi-dashboard support

**What's Needed:**
- ❌ Admin UI
- ❌ Device type selector
- ❌ Widget picker
- ❌ Drag-drop interface
- ❌ Domain-based loading

**Implementation Path:**
1. Add react-grid-layout
2. Create AdminDashboard component
3. Add widget picker UI
4. Connect to existing APIs
5. Test and deploy

---

## 🆘 Troubleshooting

### Widgets not loading?
Check browser console for: `[WIDGET SYSTEM FRONTEND] Loaded X widgets`

### Unit changes not showing?
1. Verify SQL update was successful
2. Hard refresh browser (Ctrl+Shift+R)
3. Check browser console for updated unit value

### Position changes not showing?
Expected behavior - frontend doesn't apply positions yet. Needs react-grid-layout.

### API returns 401 Unauthorized?
Check JWT token is valid and included in Authorization header.

### No logs appearing?
1. Backend logs → Check server console (terminal)
2. Frontend logs → Check browser console (F12)

---

## 📞 Key Files

| File | Purpose |
|------|---------|
| `backend/routes/widgets.js` | All widget APIs |
| `frontend/src/components/Dashboard/DashboardContent.tsx` | Widget loading & display |
| `backend/scripts/seedWidgets.js` | Database seeding |
| `backend/config/database.js` | Database connection |

---

## ✅ Checklist: Is Everything Working?

- [ ] Backend server running
- [ ] Frontend running
- [ ] Database seeded (10 widgets)
- [ ] Backend logs show: `[WIDGET SYSTEM] Loaded dashboard...`
- [ ] Frontend logs show: `[WIDGET SYSTEM FRONTEND] Loaded X widgets`
- [ ] Can change widget unit in DB and see it in frontend
- [ ] APIs return 200 OK with valid token
- [ ] Postman collection imports successfully

If all checked, your widget system is working correctly. Only layout positioning needs react-grid-layout integration.
