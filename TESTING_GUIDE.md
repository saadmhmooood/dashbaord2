# Widget System Testing Guide

## Prerequisites

1. PostgreSQL database running
2. `.env` file configured with correct `DATABASE_URL`
3. Backend dependencies installed (`npm install` in backend folder)

## Step-by-Step Testing

### 1. Reset and Seed Database

```bash
cd backend
npm run seed
```

**Expected Output:**
```
🚀 Starting database initialization and seeding...
Connected to PostgreSQL
🧱 Initializing database schema...
📋 Seeding companies...
  • Created company: Saher Flow Solutions
  • Created company: Arabco
👤 Creating admin user...
  • Created admin user: admin@saherflow.com
🏗️ Seeding hierarchy data...
  • Created hierarchy for Saher Flow Solutions
  • Created hierarchy for Arabco
🚨 Seeding alarms data...
📊 Seeding widgets and dashboard...
  • Found 2 companies
  • Created dashboard for Saher Flow Solutions
  • Created dashboard for Arabco
  • Created 5 widget types
  • Created 10 widget definitions
  • Created 2 dashboards (one per company)
  • Each dashboard has 10 widgets
✅ All database seeding completed successfully!
```

### 2. Start Backend Server

```bash
npm run dev
```

Server should start on port 5000.

### 3. Test with Postman

#### Import Collection
1. Open Postman
2. Import `backend/postman/10_Widget_Management.postman_collection.json`
3. Create a new environment with variable:
   - `baseUrl`: `http://localhost:5000`

#### Run Tests

**Test 1: Login as SaherFlow Admin**
- Folder: `0. Setup & Authentication`
- Request: `Login as SaherFlow Admin`
- Expected:
  - Status 200
  - Token stored in environment
  - Company ID stored

**Test 2: Get Default Dashboard**
- Folder: `1. Dashboard Discovery`
- Request: `Get Default Dashboard`
- Expected:
  - Status 200
  - Dashboard name includes "Saher Flow Solutions"
  - Widget count = 10
  - Dashboard ID stored

**Test 3: Load All Widgets**
- Folder: `2. Widget Loading`
- Request: `Get Dashboard with Widgets`
- Expected:
  - Status 200
  - 10 widgets returned
  - All widgets have layoutConfig, dataSourceConfig
  - Layout positions are correct

**Test 4: Widget Management**
- Folder: `4. Widget Management`
- Run all 4 requests in sequence:
  1. Delete OFR Chart Widget (Status 200)
  2. Verify Widget Deleted (9 widgets remaining)
  3. Re-add OFR Chart Widget (Status 200, new layoutId returned)
  4. Verify Widget Restored (10 widgets again)

**Test 5: Multi-Company Testing**
- Folder: `5. Multi-Company Testing`
- Run all 3 requests:
  1. Switch to Arabco User (loads Arabco dashboard)
  2. Verify Arabco Dashboard Isolation (10 widgets, different dashboard ID)
  3. Switch Back to SaherFlow Admin

#### Expected Results

All tests should pass with green checkmarks. Key verifications:

- ✅ SaherFlow admin sees SaherFlow dashboard
- ✅ Arabco user sees Arabco dashboard
- ✅ Dashboards are isolated (different IDs)
- ✅ All widgets load correctly
- ✅ Widget deletion works
- ✅ Widget re-adding works
- ✅ Layout configs are preserved

### 4. Manual API Testing (cURL)

#### Get Default Dashboard
```bash
# First login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@saherflow.com","password":"Admin123"}'

# Copy the token from response, then:
curl http://localhost:5000/api/widgets/default-dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Saher Flow Solutions Production Dashboard",
    "description": "Main production dashboard for Saher Flow Solutions",
    "version": 1,
    "isActive": true,
    "widgetCount": 10,
    "createdAt": "2025-10-29T..."
  }
}
```

#### Load Dashboard Widgets
```bash
curl http://localhost:5000/api/widgets/dashboard/{DASHBOARD_ID} \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: 10 widgets with all properties.

## Troubleshooting

### Issue: "Admin user not found"
**Solution:** Run seedAdmin first or run full `npm run seed`

### Issue: "No companies found"
**Solution:** Run seedCompanies first or run full `npm run seed`

### Issue: "Dashboard not found"
**Solution:**
1. Verify token is valid
2. Check that dashboard was created for your company
3. Run seed script again

### Issue: "Column 'company_id' does not exist"
**Solution:**
1. Drop the dashboards table
2. Run seed script again (it will recreate with company_id)

```sql
DROP TABLE IF EXISTS dashboard_layouts CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
```

Then run `npm run seed`.

## Database Verification

Check data in PostgreSQL:

```sql
-- Check companies
SELECT id, name FROM company;

-- Check dashboards (should be one per company)
SELECT id, name, company_id FROM dashboards;

-- Check dashboard widgets count
SELECT
  d.name,
  c.name as company_name,
  COUNT(dl.id) as widget_count
FROM dashboards d
JOIN company c ON d.company_id = c.id
LEFT JOIN dashboard_layouts dl ON d.id = dl.dashboard_id
GROUP BY d.id, d.name, c.name;
```

Expected output:
```
name                                      | company_name             | widget_count
------------------------------------------+--------------------------+-------------
Saher Flow Solutions Production Dashboard | Saher Flow Solutions    | 10
Arabco Production Dashboard                | Arabco                  | 10
```

## Widget Data Structure

Each widget should have:

```json
{
  "layoutId": "uuid",
  "widgetId": "uuid",
  "name": "OFR Chart",
  "description": "Oil Flow Rate Line Chart",
  "type": "line_chart",
  "component": "FlowRateChart",
  "layoutConfig": {
    "x": 0,
    "y": 1,
    "w": 4,
    "h": 2,
    "minW": 3,
    "minH": 2,
    "static": false
  },
  "dataSourceConfig": {
    "metric": "ofr",
    "unit": "l/min",
    "title": "OFR",
    "dataKey": "ofr"
  },
  "instanceConfig": {},
  "defaultConfig": {
    "refreshInterval": 5000
  },
  "displayOrder": 5
}
```

## Success Criteria

- ✅ Each company has their own dashboard
- ✅ Each dashboard has 10 widgets
- ✅ All widgets have proper layout config (x, y, w, h)
- ✅ All widgets have data source config
- ✅ Widget deletion works
- ✅ Widget re-adding works
- ✅ Company isolation is enforced
- ✅ Postman tests all pass

## Next: Frontend Integration

Once backend tests pass, integrate with frontend:

1. Call `apiService.getDefaultDashboard(token)` on login
2. Store dashboard ID
3. Call `apiService.getDashboardWidgets(dashboardId, token)`
4. Render widgets using DynamicDashboard component

See `BACKEND_SETUP_COMPLETE.md` for frontend integration details.
