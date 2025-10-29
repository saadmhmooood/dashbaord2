# Backend Widget System - Complete Setup

## Summary

Your backend widget management system is now fully functional with company-specific dashboards.

## Key Changes Made

### 1. **Company-Specific Dashboards**
   - Each company (SaherFlow, Arabco, etc.) gets their own dashboard
   - Dashboards are isolated by company - users can only see their company's dashboards
   - Added `company_id` column to the `dashboards` table

### 2. **Seed Script Updates**
   - `seedWidgets.js` now creates a dashboard for EACH company
   - Each dashboard gets all 10 default widgets (4 KPIs, 3 line charts, fractions chart, donut chart, and production map)
   - Proper widget layout with responsive grid system

### 3. **API Endpoints**

#### New Endpoint
- `GET /api/widgets/default-dashboard` - Gets the default dashboard for the user's company

#### Updated Endpoints
All endpoints now filter by company_id:
- `GET /api/widgets/dashboard/:dashboardId` - Get specific dashboard (checks company access)
- `GET /api/widgets/dashboards` - List dashboards (filters by user's company)
- `POST /api/widgets/dashboards` - Create dashboard (assigns to user's company)

### 4. **Postman Collection**
Complete test suite with:
- **Auto token handling** - Automatically stores and uses JWT tokens
- **Test scripts** - Validates all responses and data structure
- **Multi-company testing** - Tests SaherFlow and Arabco isolation
- **Complete workflow** - Tests delete and re-add widget functionality
- **Variable management** - Auto-stores IDs, tokens, and dashboard info

## How It Works

### User Flow

1. **Login**
   - User logs in (e.g., admin@saherflow.com)
   - Token is saved for subsequent requests

2. **Get Default Dashboard**
   - Call `GET /api/widgets/default-dashboard`
   - Returns the dashboard for user's company (SaherFlow)
   - Frontend stores dashboard ID

3. **Load Widgets**
   - Call `GET /api/widgets/dashboard/{dashboardId}`
   - Returns all 10 widgets with:
     - Layout config (x, y, w, h positions)
     - Data source config (metric, unit, title, colors)
     - Widget type and component name
     - Display order

4. **Frontend Renders**
   - Frontend uses DynamicDashboard component
   - Renders each widget based on component name
   - Applies layout from database

### Widget Management

**Delete Widget:**
```http
DELETE /api/widgets/dashboard/{dashboardId}/layout/{layoutId}
```

**Re-add Widget:**
```http
POST /api/widgets/dashboard/{dashboardId}/widget
Body: {
  "widgetDefinitionId": "uuid",
  "layoutConfig": { x, y, w, h, minW, minH, static },
  "displayOrder": 5
}
```

## Database Schema

### Widget Tables

```
widget_types (5 rows)
- kpi, line_chart, fractions_chart, donut_chart, map

widget_definitions (10 rows)
- OFR Metric, WFR Metric, GFR Metric, Last Refresh
- OFR Chart, WFR Chart, GFR Chart
- Fractions Chart, GVF/WLR Donut Charts
- Production Map

dashboards (one per company)
- SaherFlow Production Dashboard
- Arabco Production Dashboard
- etc.

dashboard_layouts (10 per dashboard)
- Links widgets to dashboards with positioning
```

## Widget Layout Sizes

Based on seedWidgets.js:

- **KPI Cards**: `w: 3, h: 1` (4 cards in row = 12 columns)
- **Line Charts**: `w: 4, h: 2` (3 charts in row = 12 columns)
- **Fractions Chart**: `w: 6, h: 3` (half width)
- **Donut Charts**: `w: 6, h: 3` (half width)
- **Production Map**: `w: 12, h: 3` (full width)

## Running the System

### 1. Reset and Seed Database
```bash
cd backend
npm run seed
```

This will:
- Create all tables
- Seed companies (SaherFlow, Arabco)
- Create admin and test users
- Create hierarchy and devices
- **Create dashboards for EACH company**
- Assign all 10 widgets to each dashboard

### 2. Start Backend
```bash
npm run dev
```

### 3. Test with Postman

1. Import `backend/postman/10_Widget_Management.postman_collection.json`
2. Create environment with variable: `baseUrl = http://localhost:5000`
3. Run folder "0. Setup & Authentication" to login
4. Run other folders to test all functionality
5. All tests should pass with proper company isolation

## Frontend Integration

Your frontend should:

1. **On Dashboard Load:**
   ```typescript
   const response = await apiService.getDefaultDashboard(token);
   const dashboardId = response.data.id;
   ```

2. **Load Widgets:**
   ```typescript
   const dashboard = await apiService.getDashboardWidgets(dashboardId, token);
   const widgets = dashboard.data.widgets;
   ```

3. **Render with DynamicDashboard:**
   ```tsx
   <DynamicDashboard
     dashboardId={dashboardId}
     widgets={widgets}
     isEditable={false}
   >
     {(widget) => <WidgetRenderer widget={widget} />}
   </DynamicDashboard>
   ```

## Testing Checklist

- [x] Company isolation (SaherFlow users can't see Arabco dashboards)
- [x] Default dashboard API returns correct company dashboard
- [x] All 10 widgets load with correct layout
- [x] Widget deletion works
- [x] Widget re-adding works
- [x] Layout positions are correct (x, y, w, h)
- [x] Data source configs have all properties
- [x] Postman tests all pass

## Next Steps (Frontend)

Your backend is ready. For frontend:

1. Add API call to fetch default dashboard on login
2. Store dashboard ID in state
3. Load widgets using dashboard ID
4. Render using DynamicDashboard component
5. Implement WidgetRenderer to map component names to actual components

The backend will return all necessary data for each widget including metrics, units, colors, and layout positions.
