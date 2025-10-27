interface StatProps {
  label: string;
  value: number;
  style?: React.CSSProperties;
}

export default function StatsCard({ label, value, style }: StatProps) {
  return (
    <div className="text-white text-sm flex justify-between items-center mb-2">
      <span>{label}</span>
      <div className="flex-1 mx-2 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, ...style }} // 👈 apply style here
        />
      </div>
      <span>{value}%</span>
    </div>
  );
}
