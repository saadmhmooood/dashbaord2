-- Widget System Testing SQL Queries
-- Use these queries to verify and test the widget system directly in PostgreSQL

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check all tables exist
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE tablename IN (
    'widget_types',
    'widget_definitions',
    'dashboards',
    'dashboard_layouts'
)
ORDER BY tablename;

-- 2. Count records in each table
SELECT 'widget_types' as table_name, COUNT(*) as count FROM widget_types
UNION ALL
SELECT 'widget_definitions', COUNT(*) FROM widget_definitions
UNION ALL
SELECT 'dashboards', COUNT(*) FROM dashboards
UNION ALL
SELECT 'dashboard_layouts', COUNT(*) FROM dashboard_layouts;

-- ============================================================================
-- VIEW CURRENT CONFIGURATION
-- ============================================================================

-- 3. View all widget types
SELECT
    id,
    name,
    component_name,
    default_config,
    created_at
FROM widget_types
ORDER BY name;

-- 4. View all widget definitions with their types
SELECT
    wd.id,
    wd.name,
    wd.description,
    wt.name as widget_type,
    wt.component_name,
    wd.data_source_config,
    wd.created_at
FROM widget_definitions wd
JOIN widget_types wt ON wd.widget_type_id = wt.id
ORDER BY wd.name;

-- 5. View all dashboards
SELECT
    id,
    name,
    description,
    version,
    is_active,
    grid_config,
    created_at
FROM dashboards
ORDER BY created_at DESC;

-- 6. View complete dashboard layout (THE MOST IMPORTANT QUERY)
SELECT
    d.name as dashboard_name,
    wd.name as widget_name,
    wt.component_name,
    dl.layout_config->>'x' as x_pos,
    dl.layout_config->>'y' as y_pos,
    dl.layout_config->>'w' as width,
    dl.layout_config->>'h' as height,
    wd.data_source_config->>'metric' as metric,
    wd.data_source_config->>'unit' as unit,
    wd.data_source_config->>'title' as title,
    dl.display_order,
    dl.id as layout_id,
    wd.id as widget_def_id
FROM dashboard_layouts dl
JOIN dashboards d ON dl.dashboard_id = d.id
JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
JOIN widget_types wt ON wd.widget_type_id = wt.id
ORDER BY d.name, dl.display_order;

-- ============================================================================
-- TESTING QUERIES - CHANGE WIDGET CONFIGURATION
-- ============================================================================

-- 7. Change OFR unit from l/min to m³/h
-- This should reflect immediately in the frontend
UPDATE widget_definitions
SET
    data_source_config = jsonb_set(
        data_source_config,
        '{unit}',
        '"m³/h"'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'OFR Metric';

-- Verify the change
SELECT
    name,
    data_source_config->>'unit' as unit,
    data_source_config->>'title' as title
FROM widget_definitions
WHERE name = 'OFR Metric';

-- 8. Change WFR color
UPDATE widget_definitions
SET
    data_source_config = data_source_config || '{"colorDark": "#00FF00", "colorLight": "#008800"}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'WFR Metric';

-- 9. Change GFR title
UPDATE widget_definitions
SET
    data_source_config = jsonb_set(
        data_source_config,
        '{title}',
        '"Gas Production Rate"'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'GFR Metric';

-- ============================================================================
-- TESTING QUERIES - CHANGE WIDGET LAYOUT
-- ============================================================================

-- 10. Move OFR widget from position (0,0) to position (6,0)
-- NOTE: This won't show in frontend yet (requires react-grid-layout integration)
UPDATE dashboard_layouts
SET
    layout_config = jsonb_set(
        layout_config,
        '{x}',
        '6'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE widget_definition_id = (
    SELECT id FROM widget_definitions WHERE name = 'OFR Metric'
);

-- 11. Make OFR widget wider (change width from 3 to 6)
UPDATE dashboard_layouts
SET
    layout_config = jsonb_set(
        layout_config,
        '{w}',
        '6'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE widget_definition_id = (
    SELECT id FROM widget_definitions WHERE name = 'OFR Metric'
);

-- 12. Verify layout changes
SELECT
    wd.name as widget_name,
    dl.layout_config->>'x' as x_pos,
    dl.layout_config->>'y' as y_pos,
    dl.layout_config->>'w' as width,
    dl.layout_config->>'h' as height,
    dl.display_order
FROM dashboard_layouts dl
JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
WHERE wd.name = 'OFR Metric';

-- ============================================================================
-- RESET QUERIES - RESTORE ORIGINAL CONFIGURATION
-- ============================================================================

-- 13. Reset OFR unit back to l/min
UPDATE widget_definitions
SET
    data_source_config = jsonb_set(
        data_source_config,
        '{unit}',
        '"l/min"'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'OFR Metric';

-- 14. Reset OFR widget layout to original position
UPDATE dashboard_layouts
SET
    layout_config = '{
        "x": 0,
        "y": 0,
        "w": 3,
        "h": 1,
        "minW": 2,
        "minH": 1,
        "static": false
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE widget_definition_id = (
    SELECT id FROM widget_definitions WHERE name = 'OFR Metric'
);

-- 15. Reset WFR color
UPDATE widget_definitions
SET
    data_source_config = data_source_config || '{"colorDark": "#46B8E9", "colorLight": "#F6CA58"}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'WFR Metric';

-- ============================================================================
-- ADVANCED QUERIES
-- ============================================================================

-- 16. Get dashboard with all widget details in JSON format (API response simulation)
SELECT jsonb_build_object(
    'dashboard', jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'gridConfig', d.grid_config,
        'version', d.version
    ),
    'widgets', jsonb_agg(
        jsonb_build_object(
            'layoutId', dl.id,
            'widgetId', wd.id,
            'name', wd.name,
            'description', wd.description,
            'type', wt.name,
            'component', wt.component_name,
            'layoutConfig', dl.layout_config,
            'dataSourceConfig', wd.data_source_config,
            'instanceConfig', dl.instance_config,
            'defaultConfig', wt.default_config,
            'displayOrder', dl.display_order
        ) ORDER BY dl.display_order
    )
) as dashboard_data
FROM dashboards d
LEFT JOIN dashboard_layouts dl ON d.id = dl.dashboard_id
LEFT JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
LEFT JOIN widget_types wt ON wd.widget_type_id = wt.id
WHERE d.is_active = true
GROUP BY d.id, d.name, d.description, d.grid_config, d.version
LIMIT 1;

-- 17. Find all widgets using a specific metric
SELECT
    wd.name,
    wd.data_source_config->>'metric' as metric,
    wd.data_source_config->>'unit' as unit,
    COUNT(dl.id) as dashboard_count
FROM widget_definitions wd
LEFT JOIN dashboard_layouts dl ON wd.id = dl.widget_definition_id
WHERE wd.data_source_config->>'metric' IS NOT NULL
GROUP BY wd.id, wd.name, wd.data_source_config
ORDER BY wd.name;

-- 18. Check for duplicate widgets in same dashboard
SELECT
    d.name as dashboard_name,
    wd.name as widget_name,
    COUNT(*) as count
FROM dashboard_layouts dl
JOIN dashboards d ON dl.dashboard_id = d.id
JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
GROUP BY d.name, wd.name
HAVING COUNT(*) > 1;

-- 19. Get widget statistics
SELECT
    wt.name as widget_type,
    COUNT(DISTINCT wd.id) as definition_count,
    COUNT(dl.id) as instance_count
FROM widget_types wt
LEFT JOIN widget_definitions wd ON wt.id = wd.widget_type_id
LEFT JOIN dashboard_layouts dl ON wd.id = dl.widget_definition_id
GROUP BY wt.name
ORDER BY wt.name;

-- ============================================================================
-- DEBUGGING QUERIES
-- ============================================================================

-- 20. Check for missing foreign key relationships
SELECT 'Orphaned dashboard_layouts (no dashboard)' as issue, COUNT(*)
FROM dashboard_layouts dl
WHERE NOT EXISTS (SELECT 1 FROM dashboards d WHERE d.id = dl.dashboard_id)
UNION ALL
SELECT 'Orphaned dashboard_layouts (no widget def)', COUNT(*)
FROM dashboard_layouts dl
WHERE NOT EXISTS (SELECT 1 FROM widget_definitions wd WHERE wd.id = dl.widget_definition_id)
UNION ALL
SELECT 'Orphaned widget_definitions (no widget type)', COUNT(*)
FROM widget_definitions wd
WHERE NOT EXISTS (SELECT 1 FROM widget_types wt WHERE wt.id = wd.widget_type_id);

-- 21. View recent updates
SELECT
    'dashboard_layouts' as table_name,
    id::text as record_id,
    updated_at
FROM dashboard_layouts
WHERE updated_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT
    'widget_definitions',
    id::text,
    updated_at
FROM widget_definitions
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- 22. Show widget layout as a grid visualization (12-column grid)
WITH grid_positions AS (
    SELECT
        wd.name,
        (dl.layout_config->>'x')::int as x,
        (dl.layout_config->>'y')::int as y,
        (dl.layout_config->>'w')::int as w,
        (dl.layout_config->>'h')::int as h,
        dl.display_order
    FROM dashboard_layouts dl
    JOIN widget_definitions wd ON dl.widget_definition_id = wd.id
    WHERE dl.dashboard_id = (SELECT id FROM dashboards WHERE is_active = true LIMIT 1)
)
SELECT
    name,
    'Row ' || y as row,
    'Col ' || x || '-' || (x + w - 1) as columns,
    'Width: ' || w || ', Height: ' || h as size,
    display_order
FROM grid_positions
ORDER BY y, x;

-- ============================================================================
-- TEST SCENARIO: CREATE NEW CUSTOM WIDGET
-- ============================================================================

-- 23. Create a new widget definition for pressure metric
DO $$
DECLARE
    v_widget_type_id UUID;
    v_widget_def_id UUID;
    v_dashboard_id UUID;
    v_admin_id INTEGER;
BEGIN
    -- Get KPI widget type
    SELECT id INTO v_widget_type_id FROM widget_types WHERE name = 'kpi' LIMIT 1;

    -- Get admin user
    SELECT id INTO v_admin_id FROM "user" WHERE email = 'admin@saherflow.com' LIMIT 1;

    -- Create new widget definition
    INSERT INTO widget_definitions (
        name,
        description,
        widget_type_id,
        data_source_config,
        created_by
    ) VALUES (
        'Pressure Metric',
        'Pressure sensor reading',
        v_widget_type_id,
        '{
            "metric": "pressure",
            "unit": "bar",
            "title": "Pressure",
            "shortTitle": "PSI",
            "icon": "/pressure.png",
            "colorDark": "#9C27B0",
            "colorLight": "#BA68C8"
        }'::jsonb,
        v_admin_id
    ) RETURNING id INTO v_widget_def_id;

    -- Get first active dashboard
    SELECT id INTO v_dashboard_id FROM dashboards WHERE is_active = true LIMIT 1;

    -- Add widget to dashboard
    INSERT INTO dashboard_layouts (
        dashboard_id,
        widget_definition_id,
        layout_config,
        display_order
    ) VALUES (
        v_dashboard_id,
        v_widget_def_id,
        '{
            "x": 9,
            "y": 0,
            "w": 3,
            "h": 1,
            "minW": 2,
            "minH": 1,
            "static": false
        }'::jsonb,
        11
    );

    RAISE NOTICE 'Created new pressure widget with ID: %', v_widget_def_id;
END $$;

-- 24. Remove the test pressure widget
DELETE FROM dashboard_layouts
WHERE widget_definition_id IN (
    SELECT id FROM widget_definitions WHERE name = 'Pressure Metric'
);

DELETE FROM widget_definitions WHERE name = 'Pressure Metric';

-- ============================================================================
-- PERFORMANCE QUERIES
-- ============================================================================

-- 25. Show query execution plan for dashboard loading
EXPLAIN ANALYZE
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
WHERE dl.dashboard_id = (SELECT id FROM dashboards WHERE is_active = true LIMIT 1)
ORDER BY dl.display_order ASC;

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- 26. Get widget system health summary
SELECT jsonb_build_object(
    'widget_types_count', (SELECT COUNT(*) FROM widget_types),
    'widget_definitions_count', (SELECT COUNT(*) FROM widget_definitions),
    'dashboards_count', (SELECT COUNT(*) FROM dashboards),
    'active_dashboards_count', (SELECT COUNT(*) FROM dashboards WHERE is_active = true),
    'total_widget_instances', (SELECT COUNT(*) FROM dashboard_layouts),
    'avg_widgets_per_dashboard', (
        SELECT ROUND(AVG(widget_count)::numeric, 2)
        FROM (
            SELECT COUNT(*) as widget_count
            FROM dashboard_layouts
            GROUP BY dashboard_id
        ) counts
    ),
    'last_widget_update', (
        SELECT MAX(updated_at) FROM widget_definitions
    ),
    'last_layout_update', (
        SELECT MAX(updated_at) FROM dashboard_layouts
    )
) as system_health;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
IMPORTANT NOTES:

1. DATA CONFIGURATION CHANGES (✅ Working):
   - Changes to widget_definitions.data_source_config reflect immediately
   - This includes: units, titles, icons, colors
   - Test with queries 7, 8, 9

2. LAYOUT CHANGES (❌ Not working yet in frontend):
   - Changes to dashboard_layouts.layout_config are stored in DB
   - Frontend loads these values but doesn't apply them to rendering
   - Test with queries 10, 11, 12
   - Requires react-grid-layout integration to work

3. VERIFICATION:
   - Use query 6 to see complete dashboard configuration
   - Check browser console for: [WIDGET SYSTEM FRONTEND] logs
   - Check backend logs for: [WIDGET SYSTEM] logs

4. TESTING WORKFLOW:
   a. Run query 6 to see current state
   b. Run query 7 to change OFR unit
   c. Refresh frontend - unit should change ✓
   d. Run query 10 to move OFR widget
   e. Refresh frontend - position won't change (yet)
   f. Run queries 13-15 to reset

5. ADMIN DASHBOARD FEATURE:
   - Use queries 23-24 to simulate adding custom widgets
   - All APIs are ready for drag-drop implementation
   - See WIDGET_MANAGEMENT_API_DOCS.md for API reference
*/
