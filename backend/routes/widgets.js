// routes/widgets.js
const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Import the protect middleware function (adjust if your middleware uses a different name)
const { protect } = require('../middleware/auth');

// Runtime sanity check (temporary; safe to keep)
if (typeof protect !== 'function') {
  console.error('ERROR: protect middleware is not a function. Check ../middleware/auth.js export.');
  throw new Error('Auth middleware not found (protect)');
}

// GET /api/widgets/dashboard/:dashboardId
router.get('/dashboard/:dashboardId', protect, async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;

    const dashboardQuery = `
      SELECT d.*
      FROM dashboards d
      WHERE d.id = $1
        AND (d.created_by = $2 OR d.is_active = true)
    `;

    const dashboardResult = await database.query(dashboardQuery, [dashboardId, userId]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    const dashboard = dashboardResult.rows[0];

    const widgetsQuery = `
      SELECT
        dl.id as layout_id,
        dl.layout_config,
        dl.instance_config,
        dl.display_order,
        wd.id as widget_id,
        wd.name as widget_name,
        wd.description as widget_description,
        wd.data_source_config,
        wt.name as widget_type,
        wt.component_name,
        wt.default_config as widget_default_config
      FROM dashboard_layouts dl
      INNER JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
      INNER JOIN widget_types wt ON wd.widget_type_id = wt.id
      WHERE dl.dashboard_id = $1
      ORDER BY dl.display_order ASC
    `;

    const widgetsResult = await database.query(widgetsQuery, [dashboardId]);

    res.json({
      success: true,
      data: {
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description,
          gridConfig: dashboard.grid_config,
          version: dashboard.version
        },
        widgets: widgetsResult.rows.map(widget => ({
          layoutId: widget.layout_id,
          widgetId: widget.widget_id,
          name: widget.widget_name,
          description: widget.widget_description,
          type: widget.widget_type,
          component: widget.component_name,
          layoutConfig: widget.layout_config,
          dataSourceConfig: widget.data_source_config,
          instanceConfig: widget.instance_config,
          defaultConfig: widget.widget_default_config,
          displayOrder: widget.display_order
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard',
      error: error.message
    });
  }
});

// GET /api/widgets/dashboards
router.get('/dashboards', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT
        d.*,
        COUNT(dl.id) as widget_count
      FROM dashboards d
      LEFT JOIN dashboard_layouts dl ON d.id = dl.dashboard_id
      WHERE d.created_by = $1 OR d.is_active = true
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    const result = await database.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows.map(dashboard => ({
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        version: dashboard.version,
        isActive: dashboard.is_active,
        widgetCount: parseInt(dashboard.widget_count, 10),
        createdAt: dashboard.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboards',
      error: error.message
    });
  }
});

// GET /api/widgets/types
router.get('/types', protect, async (req, res) => {
  try {
    const query = 'SELECT * FROM widget_types ORDER BY name';
    const result = await database.query(query);

    res.json({
      success: true,
      data: result.rows.map(type => ({
        id: type.id,
        name: type.name,
        componentName: type.component_name,
        defaultConfig: type.default_config
      }))
    });
  } catch (error) {
    console.error('Error fetching widget types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch widget types',
      error: error.message
    });
  }
});

module.exports = router;
