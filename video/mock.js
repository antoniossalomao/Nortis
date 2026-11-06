// Mock de window.nortis (substitui o preload do Electron) com dados de exemplo para captura.
(() => {
  const months = ["2026-06","2026-07","2026-08","2026-09","2026-10","2026-11"];
  let n = 0; const tx = [];
  const add = (type, desc, amount, category, date) => tx.push({ id: "t" + (++n), type, desc, amount, category, date });
  const varr = [0, 120, -80, 210, -40, 90];
  months.forEach((m, i) => {
    add("receita", "Salário", 5200, "Salário", m + "-05");
    if (i !== 1 && i !== 3) add("receita", "Projeto freelance", 900 + i * 150, "Freelance", m + "-18");
    add("gasto", "Aluguel", 1650, "Moradia", m + "-06");
    add("gasto", "Supermercado", 780 + varr[i], "Alimentação", m + "-04");
    add("gasto", "Restaurante", 210 + (i * 23) % 90, "Alimentação", m + "-02");
    add("gasto", "Combustível", 320 + (i * 17) % 60, "Transporte", m + "-03");
    add("gasto", "Streaming", 55.9, "Assinaturas", m + "-01");
    add("gasto", "Academia", 119.9, "Saúde", m + "-02");
    add("gasto", "Curso de inglês", 289, "Educação", m + "-04");
    if (i % 3 !== 1) add("gasto", "Cinema e jantar", 180 + i * 12, "Lazer", m + "-03");
  });
  const goals = [
    { id: "g1", name: "Reserva de emergência", target: 15000, current: 9600, targetDate: "2027-06-30" },
    { id: "g2", name: "Viagem para o Chile", target: 8000, current: 3150, targetDate: "2027-02-15" },
    { id: "g3", name: "Notebook novo", target: 6500, current: 5480, targetDate: "2026-12-20" },
  ];
  const ok = (v) => Promise.resolve(v);
  window.nortis = {
    auth: { register: ok, login: ok, logout: ok, me: () => ok({ name: "Marina Costa", email: "marina@exemplo.com" }) },
    bootstrap: () => ok({ transactions: tx.slice(), goals: goals.slice(), categories: [] }),
    transactions: { create: (d) => ok({ ...d, id: "x" + (++n) }), update: (id, d) => ok({ ...d, id }), remove: ok },
    goals: { create: (d) => ok({ ...d, id: "gx" }), update: (id, d) => ok({ ...d, id }), remove: ok,
      contribute: (id, d) => { const g = goals.find(x => x.id === id); g.current += d.amount; return ok({ ...g }); } },
    backup: { export: () => ok({}), import: ok },
  };
})();
