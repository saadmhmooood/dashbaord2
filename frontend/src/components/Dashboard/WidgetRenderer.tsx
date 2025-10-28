import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { DeviceChartData, HierarchyChartData } from '../../services/api';
import StatsCard from '../Charts/StatsCard';
import OfrChart from '../Charts/OfrChart';
import WfrChart from '../Charts/WfrChart';
import GfrChart from '../Charts/GfrChart';
import FractionsChart from './FractionsChart';
import GVFWLRCharts from './GVFWLRCharts';
import ProductionMap from './ProductionMap';

interface WidgetConfig {
  layoutId: string;
  widgetId: string;
  name: string;
  description: string;
  type: string;
  component: string;
  layoutConfig: any;
  dataSourceConfig: any;
  instanceConfig: any;
  defaultConfig: any;
  displayOrder: number;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  chartData?: DeviceChartData | null;
  hierarchyChartData?: HierarchyChartData | null;
  timeRange?: '1day' | '7days' | '1month';
  lastRefresh?: Date;
  isDeviceOffline?: boolean;
  selectedDevice?: any;
  selectedHierarchy?: any;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  chartData,
  hierarchyChartData,
  timeRange = '1day',
  lastRefresh,
  isDeviceOffline = false,
  selectedDevice,
  selectedHierarchy,
}) => {
  const { theme } = useTheme();
  const dsConfig = widget.dataSourceConfig || {};

  // Helper to get metric value
  const getMetricValue = (metric: string) => {
    let value = 0;

    if (hierarchyChartData?.chartData && hierarchyChartData.chartData.length > 0) {
      const latest = hierarchyChartData.chartData[hierarchyChartData.chartData.length - 1];
      switch (metric) {
        case 'ofr':
          value = latest.totalOfr || 0;
          break;
        case 'wfr':
          value = latest.totalWfr || 0;
          break;
        case 'gfr':
          value = latest.totalGfr || 0;
          break;
      }
    } else if (chartData?.chartData && chartData.chartData.length > 0) {
      const latest = chartData.chartData[chartData.chartData.length - 1];
      switch (metric) {
        case 'ofr':
          value = latest.ofr || 0;
          break;
        case 'wfr':
          value = latest.wfr || 0;
          break;
        case 'gfr':
          value = latest.gfr || 0;
          break;
      }
    }

    return value;
  };

  // Render based on component type
  switch (widget.component) {
    case 'MetricsCard':
      if (dsConfig.metric === 'last_refresh') {
        const formattedTime = lastRefresh
          ? new Date(lastRefresh).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
          : '--:--:--';

        return (
          <div className="h-full">
            <StatsCard
              icon={dsConfig.icon || 'clock'}
              title={dsConfig.title || 'Last Refresh'}
              value={formattedTime}
              unit=""
              color={dsConfig.color || '#d82e75'}
              isOffline={isDeviceOffline}
            />
          </div>
        );
      }

      const value = getMetricValue(dsConfig.metric);
      return (
        <div className="h-full">
          <StatsCard
            icon={dsConfig.icon || '/oildark.png'}
            title={dsConfig.title || 'Metric'}
            value={value.toFixed(2)}
            unit={dsConfig.unit || 'l/min'}
            color={theme === 'dark' ? (dsConfig.colorDark || '#4D3DF7') : (dsConfig.colorLight || '#F56C44')}
            isOffline={isDeviceOffline}
          />
        </div>
      );

    case 'FlowRateChart':
      const ChartComponent = dsConfig.metric === 'ofr' ? OfrChart : dsConfig.metric === 'wfr' ? WfrChart : GfrChart;
      return (
        <div className={`h-full rounded-lg p-4 ${
          theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
        }`}>
          <ChartComponent
            chartData={chartData}
            hierarchyChartData={hierarchyChartData}
            timeRange={timeRange}
            isDeviceOffline={isDeviceOffline}
            unit={dsConfig.unit || 'l/min'}
          />
        </div>
      );

    case 'FractionsChart':
      return (
        <div className="h-full">
          <FractionsChart
            chartData={chartData}
            hierarchyChartData={hierarchyChartData}
            isDeviceOffline={isDeviceOffline}
            widgetConfig={widget}
          />
        </div>
      );

    case 'GVFWLRChart':
      return (
        <div className={`h-full rounded-lg p-2 ${
          theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
        }`}>
          <GVFWLRCharts
            chartData={chartData}
            hierarchyChartData={hierarchyChartData}
            isDeviceOffline={isDeviceOffline}
            widgetConfig={widget}
          />
        </div>
      );

    case 'ProductionMap':
      return (
        <div className="h-full">
          <ProductionMap
            selectedHierarchy={selectedHierarchy}
            selectedDevice={selectedDevice}
            widgetConfig={widget}
          />
        </div>
      );

    default:
      return (
        <div className={`h-full rounded-lg p-4 flex items-center justify-center ${
          theme === 'dark' ? 'bg-[#162345] text-white' : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <div className="text-center">
            <p className="text-sm opacity-50">Unknown widget type:</p>
            <p className="font-semibold">{widget.component}</p>
          </div>
        </div>
      );
  }
};

export default WidgetRenderer;
