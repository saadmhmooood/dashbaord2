const database = require('../config/database');

async function seedWidgetTypes() {
  try {
    console.log('Seeding widget types...');

    const widgetTypes = [
      {
        name: 'gauge',
        component_name: 'GaugeWidget',
        default_config: {
          min: 0,
          max: 100,
          unit: '',
          thresholds: {
            low: 30,
            medium: 70,
            high: 90
          },
          colors: {
            low: '#22c55e',
            medium: '#eab308',
            high: '#ef4444'
          }
        }
      },
      {
        name: 'line_chart',
        component_name: 'LineChartWidget',
        default_config: {
          timeRange: '24h',
          yAxisLabel: '',
          xAxisLabel: 'Time',
          showGrid: true,
          showLegend: true,
          curveType: 'smooth',
          colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
          showOil: true,
          showGas: true,
          showWater: true
        }
      },
      {
        name: 'bar_chart',
        component_name: 'BarChartWidget',
        default_config: {
          orientation: 'vertical',
          yAxisLabel: '',
          xAxisLabel: '',
          showGrid: true,
          showLegend: true,
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        }
      },
      {
        name: 'kpi',
        component_name: 'KPIWidget',
        default_config: {
          format: 'number',
          unit: '',
          showTrend: true,
          trendPeriod: '24h',
          icon: 'trending-up',
          size: 'medium'
        }
      },
      {
        name: 'table',
        component_name: 'TableWidget',
        default_config: {
          pageSize: 10,
          sortable: true,
          filterable: true,
          exportable: true,
          pagination: true
        }
      },
      {
        name: 'pie_chart',
        component_name: 'PieChartWidget',
        default_config: {
          showLegend: true,
          showLabels: true,
          innerRadius: 0,
          colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
        }
      },
      {
        name: 'map',
        component_name: 'MapWidget',
        default_config: {
          center: [0, 0],
          zoom: 5,
          markerType: 'default',
          clusterMarkers: true,
          showPopup: true
        }
      },
      {
        name: 'area_chart',
        component_name: 'AreaChartWidget',
        default_config: {
          timeRange: '24h',
          yAxisLabel: '',
          xAxisLabel: 'Time',
          showGrid: true,
          showLegend: true,
          fillOpacity: 0.3,
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        }
      },
      {
        name: 'donut_chart',
        component_name: 'DonutChartWidget',
        default_config: {
          showLegend: true,
          showLabels: true,
          innerRadius: 0.6,
          colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
        }
      },
      {
        name: 'stacked_bar',
        component_name: 'StackedBarWidget',
        default_config: {
          orientation: 'vertical',
          yAxisLabel: '',
          xAxisLabel: '',
          showGrid: true,
          showLegend: true,
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        }
      },
      {
        name: 'alarms_table',
        component_name: 'AlarmsTableWidget',
        default_config: {
          pageSize: 10,
          sortable: true,
          filterable: true,
          showSeverity: true,
          autoRefresh: true,
          refreshInterval: 30000
        }
      }
    ];

    for (const widgetType of widgetTypes) {
      const checkQuery = 'SELECT id FROM widget_types WHERE name = $1';
      const existingResult = await database.query(checkQuery, [widgetType.name]);

      if (existingResult.rows.length === 0) {
        const insertQuery = `
          INSERT INTO widget_types (name, component_name, default_config)
          VALUES ($1, $2, $3)
          RETURNING *
        `;

        const result = await database.query(insertQuery, [
          widgetType.name,
          widgetType.component_name,
          JSON.stringify(widgetType.default_config)
        ]);

        console.log(`✓ Created widget type: ${widgetType.name}`);
      } else {
        console.log(`○ Widget type already exists: ${widgetType.name}`);
      }
    }

    console.log('Widget types seeded successfully!');
  } catch (error) {
    console.error('Error seeding widget types:', error);
    throw error;
  }
}

if (require.main === module) {
  database.connect().then(async () => {
    try {
      await seedWidgetTypes();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  });
}

module.exports = seedWidgetTypes;
