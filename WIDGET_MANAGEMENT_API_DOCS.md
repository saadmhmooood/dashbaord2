# Widget Management API Documentation

Complete API reference for the dynamic dashboard widget system.

## Table of Contents
- [Authentication](#authentication)
- [Dashboard APIs](#dashboard-apis)
- [Widget Layout APIs](#widget-layout-apis)
- [Widget Definition APIs](#widget-definition-apis)
- [Widget Type APIs](#widget-type-apis)

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Dashboard APIs

### 1. List All Dashboards

Get all dashboards accessible to the current user.

**Endpoint:** `GET /api/widgets/dashboards`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "MPFM Production Dashboard",
      "description": "Main production dashboard for MPFM devices",
      "version": 1,
      "isActive": true,
      "widgetCount": 10,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 2. Get Dashboard Widgets

Get all widgets configured for a specific dashboard.

**Endpoint:** `GET /api/widgets/dashboard/:dashboardId`

**Parameters:**
- `dashboardId` (path) - UUID of the dashboard

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "id": "uuid",
      "name": "MPFM Production Dashboard",
      "description": "Main production dashboard",
      "gridConfig": {
        "cols": 12,
        "rowHeight": 100,
        "margin": [10, 10],
        "breakpoints": {
          "lg": 1200,
          "md": 996,
          "sm": 768,
          "xs": 480,
          "xxs": 0
        },
        "containerPadding": [10, 10]
      },
      "version": 1
    },
    "widgets": [
      {
        "layoutId": "uuid",
        "widgetId": "uuid",
        "name": "OFR Metric",
        "description": "Oil Flow Rate KPI",
        "type": "kpi",
        "component": "MetricsCard",
        "layoutConfig": {
          "x": 0,
          "y": 0,
          "w": 3,
          "h": 1,
          "minW": 2,
          "minH": 1,
          "static": false
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
        "instanceConfig": {},
        "defaultConfig": {
          "refreshInterval": 5000
        },
        "displayOrder": 1
      }
    ]
  }
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Loaded dashboard <uuid> with 10 widgets from database
  [1] OFR Metric (MetricsCard) - Layout: x=0, y=0, w=3, h=1
  [2] WFR Metric (MetricsCard) - Layout: x=3, y=0, w=3, h=1
  ...
```

---

### 3. Create Dashboard

Create a new dashboard.

**Endpoint:** `POST /api/widgets/dashboards`

**Request Body:**
```json
{
  "name": "Custom Dashboard",
  "description": "My custom production dashboard",
  "gridConfig": {
    "cols": 12,
    "rowHeight": 100,
    "margin": [10, 10]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-dashboard-uuid"
  },
  "message": "Dashboard created successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Created dashboard: Custom Dashboard
```

---

## Widget Layout APIs

### 4. Update Widget Layouts

Update positions and sizes of multiple widgets in a dashboard.

**Endpoint:** `POST /api/widgets/dashboard/:dashboardId/layout`

**Parameters:**
- `dashboardId` (path) - UUID of the dashboard

**Request Body:**
```json
{
  "layouts": [
    {
      "layoutId": "layout-uuid-1",
      "layoutConfig": {
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 2,
        "minW": 2,
        "minH": 1,
        "static": false
      }
    },
    {
      "layoutId": "layout-uuid-2",
      "layoutConfig": {
        "x": 6,
        "y": 0,
        "w": 6,
        "h": 2,
        "minW": 2,
        "minH": 1,
        "static": false
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Widget layouts updated successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Updating 2 widget layouts for dashboard <uuid>
  Updated layout <uuid-1>: x=0, y=0, w=6, h=2
  Updated layout <uuid-2>: x=6, y=0, w=6, h=2
```

**Use Case:**
- Admin drags widgets to new positions
- Frontend calls this endpoint to persist layout changes
- All domain users see the updated layout

---

### 5. Add Widget to Dashboard

Add a new widget instance to a dashboard.

**Endpoint:** `POST /api/widgets/dashboard/:dashboardId/widget`

**Parameters:**
- `dashboardId` (path) - UUID of the dashboard

**Request Body:**
```json
{
  "widgetDefinitionId": "widget-def-uuid",
  "layoutConfig": {
    "x": 0,
    "y": 3,
    "w": 4,
    "h": 2,
    "minW": 2,
    "minH": 1,
    "static": false
  },
  "instanceConfig": {
    "customSetting": "value"
  },
  "displayOrder": 11
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "layoutId": "new-layout-uuid"
  },
  "message": "Widget added successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Added widget <widget-def-uuid> to dashboard <dashboard-uuid>
```

**Use Case:**
- Admin selects a widget from available definitions
- Admin drags it to desired position on dashboard
- Widget appears for all domain users

---

### 6. Remove Widget from Dashboard

Remove a widget instance from a dashboard.

**Endpoint:** `DELETE /api/widgets/dashboard/:dashboardId/layout/:layoutId`

**Parameters:**
- `dashboardId` (path) - UUID of the dashboard
- `layoutId` (path) - UUID of the layout to remove

**Response:**
```json
{
  "success": true,
  "message": "Widget removed successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Removed widget layout <layout-uuid> from dashboard <dashboard-uuid>
```

---

## Widget Definition APIs

### 7. List Widget Definitions

Get all available widget definitions that can be added to dashboards.

**Endpoint:** `GET /api/widgets/definitions`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "OFR Metric",
      "description": "Oil Flow Rate KPI",
      "dataSourceConfig": {
        "metric": "ofr",
        "unit": "l/min",
        "title": "Oil flow rate",
        "shortTitle": "OFR",
        "icon": "/oildark.png"
      },
      "widgetType": "kpi",
      "componentName": "MetricsCard",
      "defaultConfig": {
        "refreshInterval": 5000
      }
    }
  ]
}
```

**Use Case:**
- Admin opens "Add Widget" dialog
- System shows list of available widgets
- Admin selects widget to add to dashboard

---

### 8. Create Widget Definition

Create a new widget definition.

**Endpoint:** `POST /api/widgets/definitions`

**Request Body:**
```json
{
  "name": "Temperature Metric",
  "description": "Temperature sensor reading",
  "widgetTypeId": "widget-type-uuid",
  "dataSourceConfig": {
    "metric": "temperature",
    "unit": "°C",
    "title": "Temperature",
    "icon": "/temperature.png",
    "colorDark": "#FF6B6B",
    "colorLight": "#FFA07A"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-widget-def-uuid"
  },
  "message": "Widget definition created successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Created widget definition: Temperature Metric
```

**Use Case:**
- Admin creates custom widget for new device type
- Widget becomes available to add to any dashboard

---

### 9. Update Widget Definition

Update widget configuration (units, titles, colors, etc.).

**Endpoint:** `PUT /api/widgets/definitions/:id`

**Parameters:**
- `id` (path) - UUID of the widget definition

**Request Body:**
```json
{
  "name": "Oil Flow Rate (Updated)",
  "description": "Updated description",
  "dataSourceConfig": {
    "metric": "ofr",
    "unit": "m³/h",
    "title": "Oil Flow Rate",
    "shortTitle": "OFR",
    "icon": "/oildark.png",
    "colorDark": "#4D3DF7",
    "colorLight": "#F56C44"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Widget definition updated successfully"
}
```

**Backend Logging:**
```
[WIDGET SYSTEM] Updated widget definition <uuid>
```

**Use Case:**
- Admin changes unit from l/min to m³/h
- All dashboards using this widget show updated unit
- Changes reflect immediately

---

## Widget Type APIs

### 10. List Widget Types

Get all available widget types (kpi, line_chart, map, etc.).

**Endpoint:** `GET /api/widgets/types`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "kpi",
      "componentName": "MetricsCard",
      "defaultConfig": {
        "refreshInterval": 5000
      }
    },
    {
      "id": "uuid",
      "name": "line_chart",
      "componentName": "FlowRateChart",
      "defaultConfig": {
        "refreshInterval": 5000
      }
    }
  ]
}
```

**Use Case:**
- Admin selects widget type when creating new widget definition
- System shows available component types

---

## Complete Workflow Example

### Admin Configures Dashboard for Company

1. **Admin logs in** (gets JWT token)

2. **Create new dashboard:**
```bash
curl -X POST http://localhost:5000/api/widgets/dashboards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Dashboard - Acme Corp",
    "description": "Custom dashboard for Acme Corporation"
  }'
# Returns: { "data": { "id": "dashboard-uuid" } }
```

3. **List available widgets:**
```bash
curl -X GET http://localhost:5000/api/widgets/definitions \
  -H "Authorization: Bearer <token>"
# Returns list of all available widgets
```

4. **Add OFR widget:**
```bash
curl -X POST http://localhost:5000/api/widgets/dashboard/dashboard-uuid/widget \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetDefinitionId": "ofr-widget-uuid",
    "layoutConfig": { "x": 0, "y": 0, "w": 3, "h": 1 },
    "displayOrder": 1
  }'
```

5. **Add WFR widget:**
```bash
curl -X POST http://localhost:5000/api/widgets/dashboard/dashboard-uuid/widget \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetDefinitionId": "wfr-widget-uuid",
    "layoutConfig": { "x": 3, "y": 0, "w": 3, "h": 1 },
    "displayOrder": 2
  }'
```

6. **Admin drags widgets to new positions:**
```bash
curl -X POST http://localhost:5000/api/widgets/dashboard/dashboard-uuid/layout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "layouts": [
      {
        "layoutId": "ofr-layout-uuid",
        "layoutConfig": { "x": 6, "y": 0, "w": 3, "h": 1 }
      },
      {
        "layoutId": "wfr-layout-uuid",
        "layoutConfig": { "x": 0, "y": 0, "w": 3, "h": 1 }
      }
    ]
  }'
```

7. **Domain users login** and see the configured dashboard automatically

---

## Frontend Integration

### Loading Dashboard Widgets

```typescript
// In DashboardContent.tsx (already implemented)
const loadDashboardWidgets = async () => {
  const dashboardsResponse = await apiService.getDashboards(token);
  const firstDashboard = dashboardsResponse.data[0];

  const widgetsResponse = await apiService.getDashboardWidgets(
    firstDashboard.id,
    token
  );

  setWidgets(widgetsResponse.data.widgets);
  setDashboardConfig(widgetsResponse.data.dashboard);
};
```

### Console Output (Verification)

When dashboard loads, check browser console:
```
[WIDGET SYSTEM FRONTEND] Loading dashboard: MPFM Production Dashboard (uuid)
[WIDGET SYSTEM FRONTEND] Loaded 10 widgets from database
  [1] OFR Metric (MetricsCard)
      Layout: x=0, y=0, w=3, h=1
      Data: metric=ofr, unit=l/min
  [2] WFR Metric (MetricsCard)
      Layout: x=3, y=0, w=3, h=1
      Data: metric=wfr, unit=l/min
  ...
[WIDGET SYSTEM FRONTEND] ✓ Widgets loaded and state updated
```

---

## Database Schema Reference

### dashboard_layouts Table
```sql
CREATE TABLE dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id),
    widget_definition_id UUID NOT NULL REFERENCES widget_definitions(id),

    -- Position and size (x, y, w, h)
    layout_config JSONB NOT NULL DEFAULT '{}',

    -- Widget-specific overrides
    instance_config JSONB NOT NULL DEFAULT '{}',

    -- Display order
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### widget_definitions Table
```sql
CREATE TABLE widget_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    widget_type_id UUID NOT NULL REFERENCES widget_types(id),

    -- Data configuration (metric, unit, title, etc.)
    data_source_config JSONB NOT NULL DEFAULT '{}',

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Testing APIs with Postman

Import the following Postman collections from `/backend/postman/`:
- `10_Widget_Management.postman_collection.json` (create this collection)

Or use curl commands from this documentation.

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not found (dashboard/widget doesn't exist)
- `500` - Server error

---

## Notes

1. **Current Limitation:** Frontend doesn't apply layoutConfig for positioning (uses fixed CSS grid)
2. **Data Config Works:** Units, titles, colors from database are applied ✓
3. **All APIs Ready:** Backend fully supports drag-drop dashboard system
4. **Next Step:** Integrate `react-grid-layout` for true dynamic positioning
