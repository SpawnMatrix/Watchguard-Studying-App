import { Layers } from "lucide-react";
import { Lab } from "../../data/labs";

interface LabCatalogProps {
  labs: Lab[];
  selectedLabId: number | null;
  onSelectLab: (id: number) => void;
}

export default function LabCatalog({ labs, selectedLabId, onSelectLab }: LabCatalogProps) {
  return (
    <div className="lg:col-span-4 bg-watchguard-gray border border-watchguard-border rounded-xl p-4 shadow-xl flex flex-col h-full ">
      <h3 className="font-display font-semibold text-white border-b border-watchguard-border pb-3 mb-4 flex items-center space-x-2">
        <Layers className="w-4 h-4 text-watchguard-orange" />
        <span>NSE Lab Catalog</span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2.5">
        {labs.map((lab) => {
          const isSelected = lab.id === selectedLabId;
          return (
            <button
              key={lab.id}
              onClick={() => onSelectLab(lab.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-sans select-none flex items-start space-x-3 ${
                isSelected
                  ? "bg-watchguard-orange/10 border-watchguard-orange text-white"
                  : "bg-watchguard-dark/40 border-watchguard-border text-gray-400 hover:border-watchguard-border hover:bg-watchguard-lightgray/30"
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[10px] ${
                isSelected ? "bg-watchguard-orange text-white border-watchguard-orange" : "bg-watchguard-lightgray border-watchguard-border text-gray-400"
              }`}>
                {lab.id}
              </div>
              <div className="flex-1 space-y-1">
                <h4 className={`font-semibold ${isSelected ? "text-watchguard-orange" : "text-gray-200"}`}>{lab.name}</h4>
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{lab.objectives}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
