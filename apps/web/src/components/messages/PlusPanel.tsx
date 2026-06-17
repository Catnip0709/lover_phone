import { Camera, MapPin, Wallet, Banknote, Mic } from "lucide-react";

export function PlusPanel({ onClose, onSelect }: { onClose: () => void; onSelect: (type: string) => void }) {
  const options = [
    { type: "image", icon: Camera, label: "图片", color: "bg-green-500" },
    { type: "voice", icon: Mic, label: "语音", color: "bg-purple-500" },
    { type: "location", icon: MapPin, label: "位置", color: "bg-blue-500" },
    { type: "red_packet", icon: Wallet, label: "红包", color: "bg-red-500" },
    { type: "transfer", icon: Banknote, label: "转账", color: "bg-emerald-500" },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.type}
          className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-lg transition hover:scale-105"
          onClick={() => onSelect(option.type)}
          type="button"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${option.color}`}>
            <option.icon className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs text-slate-700">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
