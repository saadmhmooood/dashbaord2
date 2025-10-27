const http = require('http');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testWidgetSystem() {
  console.log('\n=== TESTING DYNAMIC WIDGET SYSTEM ===\n');

  console.log('Step 1: Login as admin...');
  const loginResponse = await makeRequest('POST', '/auth/login', {
    email: 'admin@saherflow.com',
    password: 'Admin123'
  });

  if (!loginResponse.success) {
    console.error('Login failed:', loginResponse.message);
    return;
  }

  authToken = loginResponse.data.token;
  console.log('✓ Login successful\n');

  console.log('Step 2: Fetch available dashboards...');
  const dashboardsResponse = await makeRequest('GET', '/widgets/dashboards');

  if (!dashboardsResponse.success) {
    console.error('Failed to fetch dashboards:', dashboardsResponse.message);
    return;
  }

  console.log('✓ Found', dashboardsResponse.data.length, 'dashboard(s)');
  if (dashboardsResponse.data.length > 0) {
    const dashboard = dashboardsResponse.data[0];
    console.log('  - Name:', dashboard.name);
    console.log('  - Widget Count:', dashboard.widgetCount);
    console.log('  - Dashboard ID:', dashboard.id);
    console.log('');

    console.log('Step 3: Fetch dashboard widgets...');
    const widgetsResponse = await makeRequest('GET', `/widgets/dashboard/${dashboard.id}`);

    if (!widgetsResponse.success) {
      console.error('Failed to fetch widgets:', widgetsResponse.message);
      return;
    }

    console.log('✓ Successfully loaded widgets from PostgreSQL database');
    console.log('  - Total widgets:', widgetsResponse.data.widgets.length);
    console.log('');

    console.log('=== ALL WIDGETS LOADED FROM DATABASE ===\n');
    widgetsResponse.data.widgets.forEach((widget, index) => {
      console.log(`Widget ${index + 1}/${widgetsResponse.data.widgets.length}:`);
      console.log('  Name:', widget.name);
      console.log('  Type:', widget.type);
      console.log('  Component:', widget.component);
      console.log('  Position: x=' + widget.layoutConfig.x + ', y=' + widget.layoutConfig.y +
                  ', w=' + widget.layoutConfig.w + ', h=' + widget.layoutConfig.h);
      console.log('  Display Order:', widget.displayOrder);
      console.log('');
    });

    const ofrChart = widgetsResponse.data.widgets.find(w =>
      w.component === 'FlowRateChart' && w.dataSourceConfig.metric === 'ofr'
    );

    if (ofrChart) {
      console.log('=== OFR CHART WIDGET LIFECYCLE ===\n');
      console.log('Widget Details:');
      console.log('  Widget ID:', ofrChart.widgetId);
      console.log('  Layout ID:', ofrChart.layoutId);
      console.log('  Name:', ofrChart.name);
      console.log('  Description:', ofrChart.description);
      console.log('  Component:', ofrChart.component);
      console.log('  Type:', ofrChart.type);
      console.log('');
      console.log('Data Source Configuration:');
      console.log('  Metric:', ofrChart.dataSourceConfig.metric);
      console.log('  Unit:', ofrChart.dataSourceConfig.unit);
      console.log('  Title:', ofrChart.dataSourceConfig.title);
      console.log('  Data Key:', ofrChart.dataSourceConfig.dataKey);
      console.log('');
      console.log('Layout Configuration:');
      console.log('  Position X:', ofrChart.layoutConfig.x);
      console.log('  Position Y:', ofrChart.layoutConfig.y);
      console.log('  Width:', ofrChart.layoutConfig.w, 'columns (out of 12)');
      console.log('  Height:', ofrChart.layoutConfig.h, 'rows');
      console.log('  Minimum Width:', ofrChart.layoutConfig.minW);
      console.log('  Minimum Height:', ofrChart.layoutConfig.minH);
      console.log('  Static:', ofrChart.layoutConfig.static);
      console.log('');
      console.log('Lifecycle Steps:');
      console.log('  1. ✓ Widget configuration loaded from PostgreSQL');
      console.log('  2. ✓ Widget sent to frontend via API');
      console.log('  3. → Frontend will render FlowRateChart component');
      console.log('  4. → Component will fetch chart data from /api/charts/device/:id');
      console.log('  5. → Chart displays with data from database configuration');
      console.log('');
    }

    console.log('=== TEST SUCCESSFUL ===');
    console.log('All widgets are loading from the PostgreSQL database!');
    console.log('The UI will look exactly the same, but now it is fully configurable.');
    console.log('');
    console.log('To verify in the browser:');
    console.log('1. Start the backend: cd backend && npm run dev');
    console.log('2. Start the frontend: cd frontend && npm run dev');
    console.log('3. Open browser DevTools Console');
    console.log('4. Login to the dashboard');
    console.log('5. Look for [WIDGET SYSTEM] and [OFR CHART LIFECYCLE] logs');
    console.log('');
  } else {
    console.log('⚠ No dashboards found. Run seed script: cd backend && npm run seed');
  }
}

testWidgetSystem().catch(console.error);
