interface StatCardProps {
  icon: string;
  iconBg: string;
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ icon, iconBg, value, label, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm p-[17px_18px]">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[18px] ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
              trendUp
                ? 'bg-green-100 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="font-poppins text-[26px] font-black text-navy-dark tracking-tight leading-none">
        {value}
      </div>
      <div className="text-[12px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
