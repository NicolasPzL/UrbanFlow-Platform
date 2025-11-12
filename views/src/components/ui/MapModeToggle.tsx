import { Layers, Box } from "lucide-react";
import { Button } from "./button";
import type { MapMode } from "../../types";

interface MapModeToggleProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

export function MapModeToggle({ mode, onModeChange }: MapModeToggleProps) {
  const is3D = mode === "3d";
  const nextMode: MapMode = is3D ? "2d" : "3d";
  const Icon = is3D ? Box : Layers;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onModeChange(nextMode)}
      aria-pressed={is3D}
      aria-label={`Cambiar a vista ${nextMode.toUpperCase()}`}
      className="flex items-center gap-2 rounded-full px-3 py-2 text-xs sm:text-sm"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">
        {is3D ? "Vista 3D activa" : "Vista 2D activa"}
      </span>
      <span className="sm:hidden font-semibold uppercase">{mode}</span>
    </Button>
  );
}

