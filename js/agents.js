// 25 agentes (soldados): papel, cobertura de cabeça, colete, mochila, extras e aparência.
(function () {
  const BC = window.BC;
  // [nome, papel, cabeça, colete, mochila, extras, pele, óculos, barba, pintura, largura, altura, cor da boina]
  const L = [
    ['Fuzileiro', 'Infantaria de linha', 'helmet', 'plate', 'assault', [], 0, 1, 0, 0, 1, 1],
    ['Granadeiro', 'Apoio de fogo', 'helmetnvg', 'plate', 'assault', [], 1, 1, 0, 0, 1.04, 1],
    ['Médico de Combate', 'Socorrista', 'helmet', 'light', 'medic', ['medic'], 3, 0, 0, 0, 0.98, 1],
    ['Operador de Rádio', 'Comunicações', 'headset', 'plate', 'radio', [], 2, 1, 0, 0, 1, 1],
    ['Metralhador', 'Arma de apoio', 'helmet', 'heavy', 'assault', ['ammo'], 4, 1, 1, 0, 1.1, 1.02],
    ['Atirador de Elite', 'Precisão', 'boonie', 'light', 'ruck', [], 0, 0, 0, 1, 0.96, 1],
    ['Observador', 'Reconhecimento', 'boonie', 'chest', 'ruck', [], 1, 1, 0, 0, 0.98, 0.99],
    ['Oficial', 'Comando', 'beret', 'chest', 'none', ['rank'], 3, 1, 0, 0, 1, 1.01, 0x6a1f22],
    ['Sargento', 'Liderança de pelotão', 'cap', 'plate', 'assault', ['rank'], 4, 1, 1, 0, 1.06, 1.02],
    ['Engenheiro', 'Demolições', 'helmet', 'plate', 'ruck', [], 2, 1, 0, 0, 1.02, 1],
    ['Batedor', 'Vanguarda', 'cap', 'light', 'assault', [], 5, 0, 0, 1, 0.96, 0.99],
    ['Operador Especial', 'Forças especiais', 'helmetnvg', 'plate', 'none', [], 1, 1, 1, 0, 1.03, 1.02],
    ['Infiltrador', 'Operações discretas', 'balaclava', 'chest', 'assault', [], 0, 1, 0, 0, 0.97, 1],
    ['Demolidor', 'Arrombamento', 'helmet', 'heavy', 'ruck', [], 6, 1, 0, 0, 1.12, 1.03],
    ['Paraquedista', 'Infantaria aeroterrestre', 'helmet', 'plate', 'ruck', [], 3, 1, 0, 0, 1, 1],
    ['Guarda de Fronteira', 'Patrulha', 'cap', 'light', 'none', [], 2, 0, 1, 0, 1, 1],
    ['Veterano', 'Combatente experiente', 'helmet', 'plate', 'assault', ['rank'], 4, 0, 1, 0, 1.05, 1],
    ['Recruta', 'Infantaria jovem', 'helmet', 'light', 'assault', [], 1, 0, 0, 0, 0.94, 0.98],
    ['Fuzileiro Naval', 'Assalto anfíbio', 'boonie', 'plate', 'assault', [], 2, 1, 0, 0, 1.02, 1],
    ['Comando', 'Assalto', 'balaclava', 'heavy', 'none', [], 6, 1, 0, 0, 1.05, 1.03],
    ['Operador de Drone', 'Guerra eletrônica', 'headset', 'chest', 'radio', [], 5, 0, 0, 0, 0.96, 0.99],
    ['Montanhista', 'Infantaria de montanha', 'beanie', 'light', 'ruck', [], 3, 0, 1, 0, 1, 1],
    ['Mensageiro', 'Ligação', 'beret', 'light', 'none', [], 1, 1, 0, 0, 0.95, 0.98, 0x2f3b4a],
    ['Franco-atirador Nômade', 'Atirador de emboscada', 'boonie', 'chest', 'assault', [], 5, 0, 1, 1, 1, 1.01],
    ['Capitão', 'Comando de companhia', 'beret', 'plate', 'none', ['rank'], 0, 1, 1, 0, 1.03, 1.02, 0x2a3f2a]
  ];
  BC.AGENTS = L.map((r, i) => ({ id: i, name: r[0], role: r[1], head: r[2], vest: r[3], pack: r[4], extras: r[5], skin: r[6], glasses: !!r[7], beard: !!r[8], paint: !!r[9], sw: r[10], sh: r[11], beret: r[12] }));
})();
