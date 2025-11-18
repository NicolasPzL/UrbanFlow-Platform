import { nc } from "../theme";

export function FooterSection() {
  return (
    <footer className="mt-8 border-t" style={{ borderColor: nc.border, background: '#04060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md" style={{ background: 'linear-gradient(135deg,#00E0FF,#3B82F6)' }} />
            <span className="text-sm" style={{ color: nc.textPrimary }}>
              © 2025 NOVACORE — Innovación digital para tu organización.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="inline-flex items-center gap-2 text-sm"
               style={{ color: nc.textPrimary }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.41-1.35-1.78-1.35-1.78-1.1-.76.08-.75.08-.75 1.22.09 1.86 1.25 1.86 1.25 1.08 1.86 2.83 1.33 3.52 1.02.11-.78.42-1.33.76-1.64-2.66-.3-5.47-1.33-5.47-5.9 0-1.3.47-2.36 1.24-3.2-.12-.3-.54-1.52.12-3.16 0 0 1-.32 3.29 1.22a11.4 11.4 0 0 1 5.99 0c2.29-1.54 3.29-1.22 3.29-1.22.66 1.64.24 2.86.12 3.16.77.84 1.24 1.9 1.24 3.2 0 4.58-2.81 5.6-5.49 5.9.43.37.81 1.1.81 2.23v3.3c0 .32.21.69.82.58A12 12 0 0 0 12 .5z"/></svg>
              GitHub
            </a>
            <a href="#" className="inline-flex items-center gap-2 text-sm"
               style={{ color: nc.textPrimary }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.14c-.96 0-1.75-.79-1.75-1.76s.79-1.76 1.75-1.76 1.75.79 1.75 1.76-.79 1.76-1.75 1.76zm13.5 11.14h-3v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96v5.7h-3v-10h2.88v1.37h.04c.4-.76 1.38-1.56 2.85-1.56 3.05 0 3.62 2.01 3.62 4.63v5.56z"/></svg>
              LinkedIn
            </a>
            <a href="#" className="inline-flex items-center gap-2 text-sm"
               style={{ color: nc.textPrimary }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8V7l-3 2-2-1-3 2-2-1-3 2-2-1-3 2v7h20V8zM1 6l3-2 2 1 3-2 2 1 3-2 2 1 3-2v4L1 10V6z"/></svg>
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


