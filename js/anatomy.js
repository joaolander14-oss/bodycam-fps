// Anatomia dos tiros: onde a bala entra define órgão atingido, dano, sangramento, desmaio ou morte; e penetração em paredes por calibre.
(function () {
  const BC = window.BC;
  // resistência dos materiais (0..~1.2). Um tiro atravessa se a "potência" do calibre for maior.
  const RES = { wood: 0.25, glass: 0.12, snow: 0.1, sand: 0.6, dirt: 0.5, concrete: 0.9, metal: 0.85, rock: 1.1, brick: 0.8 };
  BC.penetrate = function (spec, tag, thick) {
    if (tag === 'water') return -1; const r = RES[tag] === undefined ? 0.8 : RES[tag], th = Math.max(0.05, thick === undefined ? 0.3 : thick);
    const power = BC.clamp((spec.dmg - 28) / 80, 0, 1.25) * (spec.pellets > 1 ? 0.25 : 1), need = r * Math.pow(th / 0.3, 0.8);
    return power >= need ? Math.max(0.05, r * th / 0.3) : -1;
  };
  // R: {n, mul, kill, bleed (hp/s), faint (prob.), fmin, fmax}
  const R = (n, mul, bleed, faint, kill, fmin, fmax) => ({ n, mul, bleed: (bleed || 0) * 0.6, faint: faint || 0, kill: !!kill, fmin: fmin || 12, fmax: fmax || 35 });
  BC.Anatomy = {
    hit(a, px, py, pz, zone, spec) {
      const h = a.h || 1.78, prone = (a.stn || 0) > 1.5, sy = Math.sin(a.yaw), cy = Math.cos(a.yaw);
      const lat = (px - a.x) * cy + (pz - a.z) * -sy, fwd = (px - a.x) * -sy + (pz - a.z) * -cy;
      let fy = (py - a.y) / h, front = fwd > 0, L = lat;
      if (prone) { // deitado: posição ao longo do corpo
        L = 0; front = true;
        if (zone === 'head') fy = 0.95; else if (zone === 'legs') fy = 0.2; else fy = fwd > 0.3 ? 0.72 : fwd > -0.05 ? 0.56 : 0.45;
        if (zone === 'body' && fwd > 0.15 && fwd < 0.32) fy = 0.69, L = -0.05;
      }
      const hm = spec.headMul || 2;
      if (zone === 'head' || fy > 0.88) {
        if (fy < 0.9 && zone !== 'head') return R('Pescoço (artéria carótida)', 1.6, 7, 0.5, false, 10, 30);
        if (fy > 0.97 || (front && fy > 0.92 && Math.abs(L) < 0.06)) return R('Crânio / cérebro', hm * 1.5, 3, 1, spec.dmg >= 40, 20, 60);
        return R('Cabeça (face / mandíbula)', hm, 4, 0.55, false, 15, 45);
      }
      if (fy > 0.8) return R('Pescoço / ombro', 1.4, 6, 0.4, false, 10, 28);
      if (fy > 0.62) { // tórax
        if (Math.abs(L) > 0.2) return R(L > 0 ? 'Braço direito' : 'Braço esquerdo', 0.55, 1.8, 0.08, false, 8, 18);
        if (!front && Math.abs(L) < 0.06) return R('Coluna vertebral', 1.2, 2, 0.8, spec.dmg >= 60, 30, 70);
        if (front && fy > 0.63 && fy < 0.77 && L > -0.13 && L < 0.03) return R('Coração', 3, 9, 1, true);
        return R(L < 0 ? 'Pulmão esquerdo' : 'Pulmão direito', 1.05, 4, 0.4, false, 18, 45);
      }
      if (fy > 0.5) { // abdome
        if (Math.abs(L) > 0.2) return R('Antebraço / mão', 0.5, 1.2, 0.05, false, 8, 16);
        if (L > 0.02 && front) return R('Fígado', 1.0, 6.5, 0.5, false, 15, 40);
        if (!front) return R('Rim', 1.0, 5.5, 0.5, false, 15, 40);
        return R('Estômago / intestino', 0.95, 4.5, 0.4, false, 15, 40);
      }
      if (fy > 0.4) return R('Pelve (artéria ilíaca)', 0.9, 5.5, 0.35, false, 12, 30);
      if (fy > 0.24) return R(spec.dmg >= 60 ? 'Fêmur (fratura)' : 'Coxa (artéria femoral)', 0.85, 5, spec.dmg >= 60 ? 0.5 : 0.25, false, 12, 30);
      return R('Panturrilha / pé', 0.65, 1.8, spec.dmg >= 60 ? 0.3 : 0.1, false, 10, 22);
    }
  };
})();
