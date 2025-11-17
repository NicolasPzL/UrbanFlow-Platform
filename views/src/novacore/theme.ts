export const nc = {
  bg: '#05070B',
  card: '#0B0F1A',
  textPrimary: '#E6E6E6',
  textSecondary: '#A0A0A0',
  cyan: '#00E0FF',
  cyanAlt: '#00CFFF',
  blue: '#3B82F6',
  border: 'rgba(160,160,160,0.12)',
};

/**
 * Utilidades CSS inyectadas vía clase para animaciones suaves y microinteracciones
 * (sin dependencias externas).
 *
 * - .nc-reveal: estado inicial (opacity/translate)
 * - .nc-revealed: estado final (visible)
 * - .nc-card: base de tarjeta con transición
 * - .nc-card-hover: hover con elevación + borde cian glow
 * - .nc-float: animación de flotación sutil
 * - .nc-glow: halo cian muy suave
 */
export const ncStyles = `
.nc-reveal{opacity:.0;transform:translateY(16px);transition:opacity .45s ease,transform .45s ease}
.nc-revealed{opacity:1;transform:none}
.nc-card{transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease}
.nc-card-hover:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,224,255,.08),0 4px 8px rgba(0,0,0,.35);border-color:rgba(0,224,255,.35)}
.nc-float{animation:nc-float 6s ease-in-out infinite}
@keyframes nc-float{0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}}
.nc-glow{box-shadow:0 0 0 0 rgba(0,224,255,.0)}
.nc-glow:hover{box-shadow:0 0 24px rgba(0,224,255,.18)}
.nc-btn-gradient{position:relative;overflow:hidden}
.nc-btn-gradient::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#00E0FF,#3B82F6);opacity:.12;transition:opacity .25s ease}
.nc-btn-gradient:hover::before{opacity:.35}
`;


