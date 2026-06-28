import { cn } from "@/lib/utils";

type WeightSliderProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function WeightSlider({ value, onChange, disabled }: WeightSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9A9A9A]">不重要</span>
        <span className="text-lg font-medium text-[#E8A87C] font-['ZCOOL_XiaoWei']">{value}</span>
        <span className="text-[#9A9A9A]">很重要</span>
      </div>
      <div className="relative">
        <div className="h-2 bg-[#F5E6C8] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${value}%`,
              background: "linear-gradient(90deg, #85DCB0 0%, #E8A87C 100%)",
            }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-[#E8A87C] shadow-md transition-all duration-200",
            "pointer-events-none"
          )}
          style={{ left: `calc(${value}% - 10px)` }}
        />
      </div>
    </div>
  );
}
