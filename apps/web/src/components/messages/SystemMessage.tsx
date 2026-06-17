import { Info } from "lucide-react";
import type { MessageView } from "@myphone/shared";

export function SystemMessage({ message }: { message: MessageView }) {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-2 rounded-full bg-slate-100/80 px-4 py-2 text-xs text-slate-500 backdrop-blur">
        <Info className="h-3.5 w-3.5" />
        {message.content || "系统提示"}
      </div>
    </div>
  );
}
