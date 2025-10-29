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
    const userCompanyId = req.user.company_id;

    const dashboardQuery = `
      SELECT d.*
      FROM dashboards d
      WHERE d.id = $1
        AND (d.company_id = $2 OR d.is_active = true)
    `;

    const dashboardResult = await database.query(dashboardQuery, [dashboardId, userCompanyId]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found or access denied'
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

    console.log(`[WIDGET SYSTEM] Loaded dashboard ${dashboardId} with ${widgetsResult.rows.length} widgets from database`);
    widgetsResult.rows.forEach((w, idx) => {
      console.log(`  [${idx + 1}] ${w.widget_name} (${w.component_name}) - Layout: x=${w.layout_config?.x}, y=${w.layout_config?.y}, w=${w.layout_config?.w}, h=${w.layout_config?.h}`);
    });

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

// GET /api/widgets/default-dashboard
// Get the default dashboard for the user's company
router.get('/default-dashboard', protect, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id;

    const query = `
      SELECT
        d.*,
        COUNT(dl.id) as widget_count
      FROM dashboards d
      LEFT JOIN dashboard_layouts dl ON d.id = dl.dashboard_id
      WHERE d.company_id = $1 AND d.is_active = true
      GROUP BY d.id
      ORDER BY d.created_at ASC
      LIMIT 1
    `;

    const result = await database.query(query, [userCompanyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No default dashboard found for your company'
      });
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        description: result.rows[0].description,
        version: result.rows[0].version,
        isActive: result.rows[0].is_active,
        widgetCount: parseInt(result.rows[0].widget_count, 10),
        createdAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Error fetching default dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default dashboard',
      error: error.message
    });
  }
});

// GET /api/widgets/dashboards
router.get('/dashboards', protect, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id;

    const query = `
      SELECT
        d.*,
        COUNT(dl.id) as widget_count
      FROM dashboards d
      LEFT JOIN dashboard_layouts dl ON d.id = dl.dashboard_id
      WHERE d.company_id = $1 OR (d.is_active = true AND d.company_id IS NULL)
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    const result = await database.query(query, [userCompanyId]);

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

// POST /api/widgets/dashboard/:dashboardId/layout
// Update widget layout for a dashboard
router.post('/dashboard/:dashboardId/layout', protect, async (req, res) => {
  const client = await database.pool.connect();
  try {
    const { dashboardId } = req.params;
    const { layouts } = req.body; // Array of { layoutId, layoutConfig: { x, y, w, h, minW, minH, static } }

    if (!Array.isArray(layouts)) {
      return res.status(400).json({
        success: false,
        message: 'layouts must be an array'
      });
    }

    await client.query('BEGIN');

    console.log(`[WIDGET SYSTEM] Updating ${layouts.length} widget layouts for dashboard ${dashboardId}`);

    for (const layout of layouts) {
      const { layoutId, layoutConfig } = layout;

      const result = await client.query(`
        UPDATE dashboard_layouts
        SET layout_config = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND dashboard_id = $3
        RETURNING id
      `, [JSON.stringify(layoutConfig), layoutId, dashboardId]);

      if (result.rows.length > 0) {
        console.log(`  Updated layout ${layoutId}: x=${layoutConfig.x}, y=${layoutConfig.y}, w=${layoutConfig.w}, h=${layoutConfig.h}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Widget layouts updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating widget layouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update widget layouts',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/widgets/dashboard/:dashboardId/widget
// Add a new widget to a dashboard
router.post('/dashboard/:dashboardId/widget', protect, async (req, res) => {
  const client = await database.pool.connect();
  try {
    const { dashboardId } = req.params;
    const { widgetDefinitionId, layoutConfig, instanceConfig, displayOrder } = req.body;

    if (!widgetDefinitionId) {
      return res.status(400).json({
        success: false,
        message: 'widgetDefinitionId is required'
      });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO dashboard_layouts (
        dashboard_id,
        widget_definition_id,
        layout_config,
        instance_config,
        display_order
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      dashboardId,
      widgetDefinitionId,
      JSON.stringify(layoutConfig || { x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1, static: false }),
      JSON.stringify(instanceConfig || {}),
      displayOrder || 0
    ]);

    await client.query('COMMIT');

    console.log(`[WIDGET SYSTEM] Added widget ${widgetDefinitionId} to dashboard ${dashboardId}`);

    res.json({
      success: true,
      data: {
        layoutId: result.rows[0].id
      },
      message: 'Widget added successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add widget',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// DELETE /api/widgets/dashboard/:dashboardId/layout/:layoutId
// Remove a widget from a dashboard
router.delete('/dashboard/:dashboardId/layout/:layoutId', protect, async (req, res) => {
  try {
    const { dashboardId, layoutId } = req.params;

    const result = await database.query(`
      DELETE FROM dashboard_layouts
      WHERE id = $1 AND dashboard_id = $2
      RETURNING id
    `, [layoutId, dashboardId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Widget layout not found'
      });
    }

    console.log(`[WIDGET SYSTEM] Removed widget layout ${layoutId} from dashboard ${dashboardId}`);

    res.json({
      success: true,
      message: 'Widget removed successfully'
    });
  } catch (error) {
    console.error('Error removing widget:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove widget',
      error: error.message
    });
  }
});

// GET /api/widgets/definitions
// Get all available widget definitions
router.get('/definitions', protect, async (req, res) => {
  try {
    const query = `
      SELECT
        wd.id,
        wd.name,
        wd.description,
        wd.data_source_config,
        wt.name as widget_type,
        wt.component_name,
        wt.default_config
      FROM widget_definitions wd
      INNER JOIN widget_types wt ON wd.widget_type_id = wt.id
      ORDER BY wd.name
    `;

    const result = await database.query(query);

    res.json({
      success: true,
      data: result.rows.map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        dataSourceConfig: def.data_source_config,
        widgetType: def.widget_type,
        componentName: def.component_name,
        defaultConfig: def.default_config
      }))
    });
  } catch (error) {
    console.error('Error fetching widget definitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch widget definitions',
      error: error.message
    });
  }
});

// POST /api/widgets/definitions
// Create a new widget definition
router.post('/definitions', protect, async (req, res) => {
  try {
    const { name, description, widgetTypeId, dataSourceConfig } = req.body;
    const userId = req.user.id;

    if (!name || !widgetTypeId || !dataSourceConfig) {
      return res.status(400).json({
        success: false,
        message: 'name, widgetTypeId, and dataSourceConfig are required'
      });
    }

    const result = await database.query(`
      INSERT INTO widget_definitions (
        name,
        description,
        widget_type_id,
        data_source_config,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      name,
      description || '',
      widgetTypeId,
      JSON.stringify(dataSourceConfig),
      userId
    ]);

    console.log(`[WIDGET SYSTEM] Created widget definition: ${name}`);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id
      },
      message: 'Widget definition created successfully'
    });
  } catch (error) {
    console.error('Error creating widget definition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create widget definition',
      error: error.message
    });
  }
});

// PUT /api/widgets/definitions/:id
// Update widget definition (for changing units, titles, etc.)
router.put('/definitions/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, dataSourceConfig } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (dataSourceConfig) {
      updates.push(`data_source_config = $${paramCount++}`);
      values.push(JSON.stringify(dataSourceConfig));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await database.query(`
      UPDATE widget_definitions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Widget definition not found'
      });
    }

    console.log(`[WIDGET SYSTEM] Updated widget definition ${id}`);

    res.json({
      success: true,
      message: 'Widget definition updated successfully'
    });
  } catch (error) {
    console.error('Error updating widget definition:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update widget definition',
      error: error.message
    });
  }
});

// POST /api/widgets/dashboards
// Create a new dashboard
router.post('/dashboards', protect, async (req, res) => {
  try {
    const { name, description, gridConfig } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }

    const result = await database.query(`
      INSERT INTO dashboards (name, description, grid_config, company_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      name,
      description || '',
      JSON.stringify(gridConfig || {
        cols: 12,
        rowHeight: 100,
        margin: [10, 10],
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
        containerPadding: [10, 10]
      }),
      companyId,
      userId
    ]);

    console.log(`[WIDGET SYSTEM] Created dashboard: ${name}`);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id
      },
      message: 'Dashboard created successfully'
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: error.message
    });
  }
});

module.exports = router;
