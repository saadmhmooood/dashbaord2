require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const database = require('../config/database');

const seedWidgets = async () => {
  // Connect to database first
  await database.connect();
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');

    const adminResult = await client.query(`
      SELECT id FROM "user" WHERE email = 'admin@saherflow.com' LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      throw new Error('Admin user not found. Please run seedAdmin first.');
    }

    const adminId = adminResult.rows[0].id;

    await client.query(`DELETE FROM dashboard_layouts`);
    await client.query(`DELETE FROM dashboards`);
    await client.query(`DELETE FROM widget_definitions`);
    await client.query(`DELETE FROM widget_types`);

    const widgetTypes = [
      { name: 'kpi', component_name: 'MetricsCard', default_config: { refreshInterval: 5000 } },
      { name: 'line_chart', component_name: 'FlowRateChart', default_config: { refreshInterval: 5000 } },
      { name: 'fractions_chart', component_name: 'FractionsChart', default_config: { refreshInterval: 5000 } },
      { name: 'donut_chart', component_name: 'GVFWLRChart', default_config: { refreshInterval: 5000 } },
      { name: 'map', component_name: 'ProductionMap', default_config: { refreshInterval: 30000 } }
    ];

    const widgetTypeIds = {};
    for (const wt of widgetTypes) {
      const result = await client.query(`
        INSERT INTO widget_types (name, component_name, default_config)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [wt.name, wt.component_name, JSON.stringify(wt.default_config)]);
      widgetTypeIds[wt.name] = result.rows[0].id;
    }

    const kpiWidgets = [
      {
        name: 'OFR Metric',
        description: 'Oil Flow Rate KPI',
        widget_type_id: widgetTypeIds.kpi,
        data_source_config: {
          metric: 'ofr',
          unit: 'l/min',
          title: 'Oil flow rate',
          shortTitle: 'OFR',
          icon: '/oildark.png',
          colorDark: '#4D3DF7',
          colorLight: '#F56C44'
        }
      },
      {
        name: 'WFR Metric',
        description: 'Water Flow Rate KPI',
        widget_type_id: widgetTypeIds.kpi,
        data_source_config: {
          metric: 'wfr',
          unit: 'l/min',
          title: 'Water flow rate',
          shortTitle: 'WFR',
          icon: '/waterdark.png',
          colorDark: '#46B8E9',
          colorLight: '#F6CA58'
        }
      },
      {
        name: 'GFR Metric',
        description: 'Gas Flow Rate KPI',
        widget_type_id: widgetTypeIds.kpi,
        data_source_config: {
          metric: 'gfr',
          unit: 'l/min',
          title: 'Gas flow rate',
          shortTitle: 'GFR',
          icon: '/gasdark.png',
          colorDark: '#F35DCB',
          colorLight: '#38BF9D'
        }
      },
      {
        name: 'Last Refresh',
        description: 'System Last Refresh Time',
        widget_type_id: widgetTypeIds.kpi,
        data_source_config: {
          metric: 'last_refresh',
          title: 'Last Refresh',
          icon: 'clock',
          color: '#d82e75'
        }
      }
    ];

    const chartWidgets = [
      {
        name: 'OFR Chart',
        description: 'Oil Flow Rate Line Chart',
        widget_type_id: widgetTypeIds.line_chart,
        data_source_config: {
          metric: 'ofr',
          unit: 'l/min',
          title: 'OFR',
          dataKey: 'ofr'
        }
      },
      {
        name: 'WFR Chart',
        description: 'Water Flow Rate Line Chart',
        widget_type_id: widgetTypeIds.line_chart,
        data_source_config: {
          metric: 'wfr',
          unit: 'l/min',
          title: 'WFR',
          dataKey: 'wfr'
        }
      },
      {
        name: 'GFR Chart',
        description: 'Gas Flow Rate Line Chart',
        widget_type_id: widgetTypeIds.line_chart,
        data_source_config: {
          metric: 'gfr',
          unit: 'l/min',
          title: 'GFR',
          dataKey: 'gfr'
        }
      }
    ];

    const otherWidgets = [
      {
        name: 'Fractions Chart',
        description: 'GVF and WLR Fractions Chart',
        widget_type_id: widgetTypeIds.fractions_chart,
        data_source_config: {
          metrics: ['gvf', 'wlr'],
          title: 'Fractions'
        }
      },
      {
        name: 'GVF/WLR Donut Charts',
        description: 'GVF and WLR Donut Charts',
        widget_type_id: widgetTypeIds.donut_chart,
        data_source_config: {
          metrics: ['gvf', 'wlr'],
          title: 'GVF/WLR'
        }
      },
      {
        name: 'Production Map',
        description: 'Device Locations Map',
        widget_type_id: widgetTypeIds.map,
        data_source_config: {
          showDevices: true,
          showStatistics: true
        }
      }
    ];

    const allWidgets = [...kpiWidgets, ...chartWidgets, ...otherWidgets];
    const widgetDefIds = {};

    for (const widget of allWidgets) {
      const result = await client.query(`
        INSERT INTO widget_definitions (name, description, widget_type_id, data_source_config, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        widget.name,
        widget.description,
        widget.widget_type_id,
        JSON.stringify(widget.data_source_config),
        adminId
      ]);
      widgetDefIds[widget.name] = result.rows[0].id;
    }

    const companiesResult = await client.query(`
      SELECT id, name FROM company ORDER BY id
    `);

    if (companiesResult.rows.length === 0) {
      throw new Error('No companies found. Please run seedCompanies first.');
    }

    console.log(`  • Found ${companiesResult.rows.length} companies`);

    const dashboards = [];
    for (const company of companiesResult.rows) {
      const dashboardResult = await client.query(`
        INSERT INTO dashboards (name, description, company_id, created_by, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id
      `, [
        `${company.name} Production Dashboard`,
        `Main production dashboard for ${company.name}`,
        company.id,
        adminId
      ]);

      dashboards.push({
        id: dashboardResult.rows[0].id,
        companyId: company.id,
        companyName: company.name
      });

      console.log(`  • Created dashboard for ${company.name}`);
    }

    const layouts = [
      // Row 1: 4 Metric Cards (each takes 3 columns in a 12-column grid = 4 cards)
      { widget: 'OFR Metric', x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1, order: 1 },
      { widget: 'WFR Metric', x: 3, y: 0, w: 3, h: 1, minW: 2, minH: 1, order: 2 },
      { widget: 'GFR Metric', x: 6, y: 0, w: 3, h: 1, minW: 2, minH: 1, order: 3 },
      { widget: 'Last Refresh', x: 9, y: 0, w: 3, h: 1, minW: 2, minH: 1, order: 4 },

      // Row 2: 3 Line Charts (each takes 4 columns in a 12-column grid = 3 charts)
      { widget: 'OFR Chart', x: 0, y: 1, w: 4, h: 2, minW: 3, minH: 2, order: 5 },
      { widget: 'WFR Chart', x: 4, y: 1, w: 4, h: 2, minW: 3, minH: 2, order: 6 },
      { widget: 'GFR Chart', x: 8, y: 1, w: 4, h: 2, minW: 3, minH: 2, order: 7 },

      // Row 3: 2 Charts side by side (each takes 6 columns in a 12-column grid = 2 charts)
      { widget: 'Fractions Chart', x: 0, y: 3, w: 6, h: 3, minW: 4, minH: 2, order: 8 },
      { widget: 'GVF/WLR Donut Charts', x: 6, y: 3, w: 6, h: 3, minW: 4, minH: 2, order: 9 },

      // Row 4: Production Map (full width = 12 columns)
      { widget: 'Production Map', x: 0, y: 6, w: 12, h: 3, minW: 8, minH: 2, order: 10 }
    ];

    // Create layouts for each company dashboard
    for (const dashboard of dashboards) {
      for (const layout of layouts) {
        await client.query(`
          INSERT INTO dashboard_layouts (dashboard_id, widget_definition_id, layout_config, display_order)
          VALUES ($1, $2, $3, $4)
        `, [
          dashboard.id,
          widgetDefIds[layout.widget],
          JSON.stringify({
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
            minW: layout.minW,
            minH: layout.minH,
            static: false
          }),
          layout.order
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Widget system seeded successfully');
    console.log(`  • Created ${widgetTypes.length} widget types`);
    console.log(`  • Created ${allWidgets.length} widget definitions`);
    console.log(`  • Created ${dashboards.length} dashboards (one per company)`);
    console.log(`  • Each dashboard has ${layouts.length} widgets`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding widgets:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = seedWidgets;

// Execute if run directly
if (require.main === module) {
  seedWidgets()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
