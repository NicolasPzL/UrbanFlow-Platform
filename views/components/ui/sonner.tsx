import * as React from "react";

// Toaster básico sin dependencias externas
const Toaster = () => {
  return (
    <div 
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite" 
      aria-atomic="true"
    />
  );
};

// Función helper para mostrar toasts (puedes expandir esto)
export const toast = {
  success: (message: string) => {
    console.log("✅", message);
    // Aquí podrías agregar lógica para mostrar toasts en UI
  },
  error: (message: string) => {
    console.error("❌", message);
    // Aquí podrías agregar lógica para mostrar toasts en UI
  },
  info: (message: string) => {
    console.info("ℹ️", message);
    // Aquí podrías agregar lógica para mostrar toasts en UI
  }
};

export { Toaster };