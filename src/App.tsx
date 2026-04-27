import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Menu, X, BarChart3, Users, DollarSign, Download, Settings, Edit2, AlertCircle, CheckCircle, Cloud, Loader, Grid } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STORAGE_KEY = "monteo_data_v2";

export default function GestorVendas() {
  const [sidebarAberto, setSidebarAberto] = useState(true);
  const [abaSelecionada, setAbaSelecionada] = useState("dashboard");
  const [anoSelecionado, setAnoSelecionado] = useState(2026);
  const [notificacao, setNotificacao] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  const [grupos, setGrupos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [configuracoes, setConfiguracoes] = useState({
    usuario: "Kaio",
    metas: { 2026: 150000, 2027: 180000, 2028: 200000, 2029: 220000, 2030: 250000 },
    tiposComissao: [
      { id: 1, nome: "Lead", percentual: 0.7 },
      { id: 2, nome: "Relacional", percentual: 1.5 },
    ],
  });

  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [mostrarFormGrupo, setMostrarFormGrupo] = useState(false);
  const [editandoGrupo, setEditandoGrupo] = useState(null);

  const clienteVazio = { nome: "", email: "", telefone: "", tipo: "Lead", admin: "Âncora", valor: "", dataAquisicao: "", dataPrimeiraParcela: "", dataSegundaParcela: "", parcelasComissao: 5, gruposCotas: [] };
  const [novoCliente, setNovoCliente] = useState(clienteVazio);
  const [novoGrupo, setNovoGrupo] = useState({ numeroGrupo: "", admin: "Âncora", observacoes: "" });
  const [novaConfiguracaoComissao, setNovaConfiguracaoComissao] = useState({ nome: "", percentual: "" });

  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [adminFiltro, setAdminFiltro] = useState("");
  const [mesRelatorio, setMesRelatorio] = useState(new Date().getMonth() + 1);
  const [grupoFiltrado, setGrupoFiltrado] = useState(1);
  const [mesCarteira, setMesCarteira] = useState(new Date().getMonth() + 1);

  const mostrarNotificacao = (msg, tipo = "success") => {
    setNotificacao({ msg, tipo });
    setTimeout(() => setNotificacao(null), 3000);
  };

  const salvarDados = useCallback((g, cl, co, conf) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      grupos: g, clientes: cl, comissoes: co, configuracoes: conf,
      ultimaSincronizacao: new Date().toISOString(),
    }));
  }, []);

  const inicializarDados = useCallback((conf) => {
    const g = [
      { id: 1, numeroGrupo: "708", admin: "Âncora", observacoes: "Consórcio residencial" },
      { id: 2, numeroGrupo: "707", admin: "Magalu", observacoes: "Consórcio de veículo" },
    ];
    const cl = [
      { id: 1, nome: "João Silva", email: "joao@email.com", telefone: "11999999999", tipo: "Lead", admin: "Âncora", valor: 50000, dataAquisicao: "2026-01-15", dataPrimeiraParcela: "2026-01-20", dataSegundaParcela: "2026-02-20", parcelasComissao: 5, status: "Ativo", gruposCotas: [{ grupoId: 1, numeroGrupo: "708", quantidadeCotas: 5, cotas: [1,2,3,4,5] }] },
      { id: 2, nome: "Maria Santos", email: "maria@email.com", telefone: "11988888888", tipo: "Relacional", admin: "Magalu", valor: 80000, dataAquisicao: "2026-02-01", dataPrimeiraParcela: "2026-02-05", dataSegundaParcela: "2026-03-05", parcelasComissao: 10, status: "Ativo", gruposCotas: [{ grupoId: 2, numeroGrupo: "707", quantidadeCotas: 8, cotas: [1,2,3,4,5,6,7,8] }] },
    ];
    const co = [
      { id: 1, clienteId: 1, cliente: "João Silva", tipo: "Lead", admin: "Âncora", valor: 50000, comissaoPercentual: 0.7, comissaoTotal: 350, parcelas: 5, parcelas_detalhes: [
        { numero: 1, valor: 70, data: "2026-01-20", status: "Recebido", dataRecebimento: "2026-01-22" },
        { numero: 2, valor: 70, data: "2026-02-20", status: "Recebido", dataRecebimento: "2026-02-25" },
        { numero: 3, valor: 70, data: "2026-03-20", status: "Pendente", dataRecebimento: null },
        { numero: 4, valor: 70, data: "2026-04-20", status: "Pendente", dataRecebimento: null },
        { numero: 5, valor: 70, data: "2026-05-20", status: "Pendente", dataRecebimento: null },
      ]},
      { id: 2, clienteId: 2, cliente: "Maria Santos", tipo: "Relacional", admin: "Magalu", valor: 80000, comissaoPercentual: 1.5, comissaoTotal: 1200, parcelas: 10, parcelas_detalhes: [
        { numero: 1, valor: 120, data: "2026-02-05", status: "Recebido", dataRecebimento: "2026-02-08" },
        { numero: 2, valor: 120, data: "2026-03-05", status: "Recebido", dataRecebimento: "2026-03-10" },
        { numero: 3, valor: 120, data: "2026-04-05", status: "Recebido", dataRecebimento: "2026-04-08" },
        { numero: 4, valor: 120, data: "2026-05-05", status: "Pendente", dataRecebimento: null },
        { numero: 5, valor: 120, data: "2026-06-05", status: "Pendente", dataRecebimento: null },
        { numero: 6, valor: 120, data: "2026-07-05", status: "Pendente", dataRecebimento: null },
        { numero: 7, valor: 120, data: "2026-08-05", status: "Pendente", dataRecebimento: null },
        { numero: 8, valor: 120, data: "2026-09-05", status: "Pendente", dataRecebimento: null },
        { numero: 9, valor: 120, data: "2026-10-05", status: "Pendente", dataRecebimento: null },
        { numero: 10, valor: 120, data: "2026-11-05", status: "Pendente", dataRecebimento: null },
      ]},
    ];
    setGrupos(g); setClientes(cl); setComissoes(co); setGrupoFiltrado(1);
    salvarDados(g, cl, co, conf);
    mostrarNotificacao("✅ Dados iniciais carregados");
  }, [salvarDados]);

  useEffect(() => {
    const dados = localStorage.getItem(STORAGE_KEY);
    if (dados) {
      try {
        const p = JSON.parse(dados);
        setGrupos(p.grupos || []);
        setClientes(p.clientes || []);
        setComissoes(p.comissoes || []);
        if (p.configuracoes) setConfiguracoes(p.configuracoes);
        if (p.grupos?.length > 0) setGrupoFiltrado(p.grupos[0].id);
        mostrarNotificacao("✅ Dados carregados");
      } catch { inicializarDados(configuracoes); }
    } else { inicializarDados(configuracoes); }
  }, []);

  const formatarMoeda = (val) => "R$ " + (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const obterPercentualComissao = (tipo) => configuracoes.tiposComissao.find(tc => tc.nome === tipo)?.percentual || 0;
  const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // ── Gerar parcelas com lógica 1ª / 2ª / demais ──
  const gerarParcelas = (dadosCliente, comissaoTotal) => {
    const numParcelas = parseInt(dadosCliente.parcelasComissao);
    const valorParcela = comissaoTotal / numParcelas;
    const parcelas = [];

    const d1 = new Date(dadosCliente.dataPrimeiraParcela + "T12:00:00");
    parcelas.push({ numero: 1, valor: valorParcela, data: dadosCliente.dataPrimeiraParcela, status: "Pendente", dataRecebimento: null });

    if (numParcelas >= 2) {
      parcelas.push({ numero: 2, valor: valorParcela, data: dadosCliente.dataSegundaParcela, status: "Pendente", dataRecebimento: null });
    }

    // demais: mensalmente a partir da 2ª
    let base = new Date(dadosCliente.dataSegundaParcela + "T12:00:00");
    for (let i = 3; i <= numParcelas; i++) {
      base = new Date(base);
      base.setMonth(base.getMonth() + 1);
      parcelas.push({ numero: i, valor: valorParcela, data: base.toISOString().split("T")[0], status: "Pendente", dataRecebimento: null });
    }
    return parcelas;
  };

  const metaAtual = configuracoes.metas[anoSelecionado] || 150000;

  const faturado = useMemo(() => comissoes.reduce((sum, c) => {
    const cl = clientes.find(cl => cl.id === c.clienteId);
    if (cl?.status === "Cancelado") return sum;
    return sum + c.parcelas_detalhes.filter(p => p.status === "Recebido").reduce((s, p) => s + p.valor, 0);
  }, 0), [comissoes, clientes]);

  const totalComissoes = useMemo(() => comissoes.reduce((sum, c) => {
    const cl = clientes.find(cl => cl.id === c.clienteId);
    if (cl?.status === "Cancelado") return sum;
    return sum + c.comissaoTotal;
  }, 0), [comissoes, clientes]);

  const comissoesPendentes = totalComissoes - faturado;
  const percentualMeta = Math.round((faturado / metaAtual) * 100);
  const faltando = Math.max(0, metaAtual - faturado);
  const clientesAtivos = useMemo(() => clientes.filter(c => c.status === "Ativo").length, [clientes]);
  const totalCotas = useMemo(() => clientes.filter(c => c.status !== "Cancelado").reduce((sum, c) => sum + c.gruposCotas.reduce((s, gc) => s + gc.quantidadeCotas, 0), 0), [clientes]);
  const totalValorVendido = useMemo(() => clientes.filter(c => c.status !== "Cancelado").reduce((sum, c) => sum + parseFloat(c.valor || 0), 0), [clientes]);

  // Vendido no mês selecionado na carteira
  const vendidoNoMes = useMemo(() => clientes.filter(c => {
    if (c.status === "Cancelado") return false;
    const mes = new Date(c.dataAquisicao + "T12:00:00").getMonth() + 1;
    return mes === mesCarteira;
  }).reduce((sum, c) => sum + parseFloat(c.valor || 0), 0), [clientes, mesCarteira]);

  const dadosAdministradora = useMemo(() => [
    { name: "Âncora", value: clientes.filter(c => c.admin === "Âncora" && c.status !== "Cancelado").reduce((s, c) => s + parseFloat(c.valor || 0), 0) },
    { name: "Magalu", value: clientes.filter(c => c.admin === "Magalu" && c.status !== "Cancelado").reduce((s, c) => s + parseFloat(c.valor || 0), 0) },
  ], [clientes]);

  const dadosRelatorio = useMemo(() => {
    return mesesNomes.map((mes, idx) => {
      const recebido = comissoes.reduce((sum, c) => {
        if (clientes.find(cl => cl.id === c.clienteId)?.status === "Cancelado") return sum;
        return sum + c.parcelas_detalhes.filter(p => p.status === "Recebido" && p.dataRecebimento && new Date(p.dataRecebimento).getMonth() === idx).reduce((s, p) => s + p.valor, 0);
      }, 0);
      const provisao = comissoes.reduce((sum, c) => {
        if (clientes.find(cl => cl.id === c.clienteId)?.status === "Cancelado") return sum;
        return sum + c.parcelas_detalhes.filter(p => p.status === "Pendente" && new Date(p.data).getMonth() === idx).reduce((s, p) => s + p.valor, 0);
      }, 0);
      return { mes: mes.slice(0,3), recebido, provisao };
    });
  }, [comissoes, clientes]);

  const CORES = ["#1F4E78","#70AD47","#FFC000","#FED8B1"];

  // ── CRUD Clientes ──
  const abrirEdicaoCliente = (cliente) => {
    setEditandoCliente(cliente);
    setNovoCliente({
      nome: cliente.nome, email: cliente.email, telefone: cliente.telefone,
      tipo: cliente.tipo, admin: cliente.admin, valor: cliente.valor,
      dataAquisicao: cliente.dataAquisicao, dataPrimeiraParcela: cliente.dataPrimeiraParcela,
      dataSegundaParcela: cliente.dataSegundaParcela || "", parcelasComissao: cliente.parcelasComissao,
      gruposCotas: cliente.gruposCotas,
    });
    setMostrarFormCliente(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const salvarCliente = () => {
    if (!novoCliente.nome || !novoCliente.valor || !novoCliente.dataPrimeiraParcela || !novoCliente.dataSegundaParcela || novoCliente.gruposCotas.length === 0) {
      mostrarNotificacao("Preencha todos os campos obrigatórios!", "error"); return;
    }
    const todasAlocadas = novoCliente.gruposCotas.every(gc => gc.cotas.length === gc.quantidadeCotas && gc.cotas.every(c => c !== ""));
    if (!todasAlocadas) { mostrarNotificacao("Preencha todas as cotas!", "error"); return; }

    const comissaoPercentual = obterPercentualComissao(novoCliente.tipo);
    const comissaoTotal = parseFloat(novoCliente.valor) * (comissaoPercentual / 100);
    const parcelas_detalhes = gerarParcelas(novoCliente, comissaoTotal);

    const clienteData = {
      id: editandoCliente ? editandoCliente.id : Math.max(0, ...clientes.map(c => c.id)) + 1,
      nome: novoCliente.nome, email: novoCliente.email, telefone: novoCliente.telefone,
      tipo: novoCliente.tipo, admin: novoCliente.admin, valor: parseFloat(novoCliente.valor),
      dataAquisicao: novoCliente.dataAquisicao, dataPrimeiraParcela: novoCliente.dataPrimeiraParcela,
      dataSegundaParcela: novoCliente.dataSegundaParcela, parcelasComissao: parseInt(novoCliente.parcelasComissao),
      status: editandoCliente ? editandoCliente.status : "Ativo", gruposCotas: novoCliente.gruposCotas,
    };

    const comissaoData = {
      id: editandoCliente ? (comissoes.find(c => c.clienteId === editandoCliente.id)?.id || Math.max(0, ...comissoes.map(c => c.id)) + 1) : Math.max(0, ...comissoes.map(c => c.id)) + 1,
      clienteId: clienteData.id, cliente: novoCliente.nome, tipo: novoCliente.tipo,
      admin: novoCliente.admin, valor: parseFloat(novoCliente.valor),
      comissaoPercentual, comissaoTotal, parcelas: parseInt(novoCliente.parcelasComissao), parcelas_detalhes,
    };

    const novosClientes = editandoCliente ? clientes.map(c => c.id === editandoCliente.id ? clienteData : c) : [...clientes, clienteData];
    const novasComissoes = editandoCliente ? comissoes.map(c => c.clienteId === editandoCliente.id ? comissaoData : c) : [...comissoes, comissaoData];

    setClientes(novosClientes); setComissoes(novasComissoes);
    salvarDados(grupos, novosClientes, novasComissoes, configuracoes);
    setNovoCliente(clienteVazio); setMostrarFormCliente(false); setEditandoCliente(null);
    mostrarNotificacao(editandoCliente ? "✅ Cliente atualizado!" : "✅ Cliente adicionado!");
  };

  const atualizarStatusCliente = (id, novoStatus) => {
    const novosClientes = clientes.map(c => c.id === id ? { ...c, status: novoStatus } : c);
    let novasComissoes = comissoes;
    if (novoStatus === "Cancelado") {
      const now = new Date();
      novasComissoes = comissoes.map(c => c.clienteId !== id ? c : { ...c, parcelas_detalhes: c.parcelas_detalhes.map(p => new Date(p.data) > now ? { ...p, status: "Cancelado" } : p) });
    }
    setClientes(novosClientes); setComissoes(novasComissoes);
    salvarDados(grupos, novosClientes, novasComissoes, configuracoes);
  };

  const deletarCliente = (id) => {
    const novosClientes = clientes.filter(c => c.id !== id);
    const novasComissoes = comissoes.filter(c => c.clienteId !== id);
    setClientes(novosClientes); setComissoes(novasComissoes);
    salvarDados(grupos, novosClientes, novasComissoes, configuracoes);
    mostrarNotificacao("Cliente removido");
  };

  // ── CRUD Grupos ──
  const adicionarGrupo = () => {
    if (!novoGrupo.numeroGrupo) return;
    const novosGrupos = editandoGrupo
      ? grupos.map(g => g.id === editandoGrupo.id ? { ...editandoGrupo, ...novoGrupo } : g)
      : [...grupos, { id: Math.max(0, ...grupos.map(g => g.id)) + 1, ...novoGrupo }];
    setGrupos(novosGrupos); setEditandoGrupo(null);
    salvarDados(novosGrupos, clientes, comissoes, configuracoes);
    setNovoGrupo({ numeroGrupo: "", admin: "Âncora", observacoes: "" });
    setMostrarFormGrupo(false);
    mostrarNotificacao(editandoGrupo ? "Grupo atualizado" : "Grupo criado");
  };

  const deletarGrupo = (id) => {
    const novosGrupos = grupos.filter(g => g.id !== id);
    setGrupos(novosGrupos); salvarDados(novosGrupos, clientes, comissoes, configuracoes);
    mostrarNotificacao("Grupo removido");
  };

  // ── Comissões ──
  const marcarParcelaRecebida = (cId, num, data) => {
    const novasComissoes = comissoes.map(c => c.id !== cId ? c : { ...c, parcelas_detalhes: c.parcelas_detalhes.map(p => p.numero === num ? { ...p, status: "Recebido", dataRecebimento: data } : p) });
    setComissoes(novasComissoes); salvarDados(grupos, clientes, novasComissoes, configuracoes);
  };
  const marcarParcelaPendente = (cId, num) => {
    const novasComissoes = comissoes.map(c => c.id !== cId ? c : { ...c, parcelas_detalhes: c.parcelas_detalhes.map(p => p.numero === num ? { ...p, status: "Pendente", dataRecebimento: null } : p) });
    setComissoes(novasComissoes); salvarDados(grupos, clientes, novasComissoes, configuracoes);
  };
  const deletarComissao = (id) => {
    const novasComissoes = comissoes.filter(c => c.id !== id);
    setComissoes(novasComissoes); salvarDados(grupos, clientes, novasComissoes, configuracoes);
  };

  const atualizarConfiguracoes = (novasConf) => { setConfiguracoes(novasConf); salvarDados(grupos, clientes, comissoes, novasConf); };

  const comissoesFiltradas = useMemo(() => comissoes.filter(c => {
    if (clientes.find(cl => cl.id === c.clienteId)?.status === "Cancelado") return false;
    return c.parcelas_detalhes.some(p => new Date(p.data).getMonth() + 1 === mesFiltro)
      && (!clienteFiltro || c.clienteId === parseInt(clienteFiltro))
      && (!adminFiltro || c.admin === adminFiltro);
  }), [comissoes, clientes, mesFiltro, clienteFiltro, adminFiltro]);

  const exportarBackup = () => {
    setSincronizando(true);
    const blob = new Blob([JSON.stringify({ grupos, clientes, comissoes, configuracoes, dataExportacao: new Date().toLocaleString("pt-BR") }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `monteo_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setSincronizando(false); mostrarNotificacao("✅ Backup baixado!");
  };

  const importarDados = (arquivo) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        setGrupos(d.grupos || []); setClientes(d.clientes || []); setComissoes(d.comissoes || []);
        if (d.configuracoes) setConfiguracoes(d.configuracoes);
        salvarDados(d.grupos || [], d.clientes || [], d.comissoes || [], d.configuracoes || configuracoes);
        mostrarNotificacao("✅ Dados importados!");
      } catch { mostrarNotificacao("❌ Erro ao importar", "error"); }
    };
    reader.readAsText(arquivo);
  };

  // ════════════════════════════════════════
  // RENDER DASHBOARD
  // ════════════════════════════════════════
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Meta ${anoSelecionado}`, valor: metaAtual, cor: "from-slate-800 to-slate-900 border-slate-700", tc: "text-slate-400", extra: null },
          { label: "Faturado", valor: faturado, cor: "from-emerald-900 to-emerald-950 border-emerald-700", tc: "text-emerald-400", extra: `${percentualMeta}% da meta` },
          { label: "Pendentes", valor: comissoesPendentes, cor: "from-violet-900 to-violet-950 border-violet-700", tc: "text-violet-400", extra: null },
          { label: "Faltando", valor: faltando, cor: "from-orange-900 to-orange-950 border-orange-700", tc: "text-orange-400", extra: null },
        ].map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.cor} p-5 rounded-xl border shadow-lg`}>
            <p className={`${card.tc} text-xs font-semibold`}>{card.label}</p>
            <p className="text-xl font-bold text-white mt-1">{formatarMoeda(card.valor)}</p>
            {card.extra && <p className={`text-xs ${card.tc} mt-1`}>{card.extra}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CARTEIRA com filtro de mês */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white">Carteira</h3>
            <select value={mesCarteira} onChange={e => setMesCarteira(parseInt(e.target.value))} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none">
              {mesesNomes.map((m, i) => <option key={i} value={i + 1}>{m.slice(0,3)}</option>)}
            </select>
          </div>
          {[
            ["Ativos", clientesAtivos, "text-white"],
            ["Cotas", totalCotas, "text-white"],
            ["Total vendido", formatarMoeda(totalValorVendido), "text-emerald-400"],
            [`Vendido em ${mesesNomes[mesCarteira-1].slice(0,3)}`, formatarMoeda(vendidoNoMes), "text-blue-400"],
          ].map(([l, v, c], i, arr) => (
            <div key={i} className={`flex justify-between ${i < arr.length - 1 ? "pb-3 mb-3 border-b border-slate-600" : ""}`}>
              <span className="text-slate-400 text-sm">{l}</span>
              <span className={`font-bold ${c} text-sm`}>{v}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Distribuição</h3>
          {[["Leads", clientes.filter(c => c.tipo === "Lead" && c.status !== "Cancelado").length],["Relacionais", clientes.filter(c => c.tipo === "Relacional" && c.status !== "Cancelado").length]].map(([l, v], i) => (
            <div key={i} className={`flex justify-between ${i === 0 ? "pb-3 mb-3 border-b border-slate-600" : ""}`}>
              <span className="text-slate-400 text-sm">{l}</span><span className="font-bold text-white">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Comissões</h3>
          {[["Total", formatarMoeda(totalComissoes), "text-white"],["Recebidas", formatarMoeda(faturado), "text-emerald-400"],["Pendentes", formatarMoeda(comissoesPendentes), "text-orange-400"]].map(([l, v, c], i) => (
            <div key={i} className={`flex justify-between ${i < 2 ? "pb-3 mb-3 border-b border-slate-600" : ""}`}>
              <span className="text-slate-400 text-sm">{l}</span><span className={`font-bold ${c} text-sm`}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Meta vs Faturado</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={[{ name: "Faturado", value: Math.max(faturado, 1) }, { name: "Falta", value: Math.max(faltando, 1) }]} cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                <Cell fill="#10b981" /><Cell fill="#f97316" />
              </Pie>
              <Tooltip formatter={v => formatarMoeda(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Por Administradora</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={dadosAdministradora} cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                {dadosAdministradora.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatarMoeda(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-4">Previsão {anoSelecionado}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dadosRelatorio}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="mes" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
            <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => formatarMoeda(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#e2e8f0" }} />
            <Legend />
            <Line type="monotone" dataKey="recebido" stroke="#10b981" name="Recebidos" strokeWidth={2} dot={{ fill: "#10b981" }} />
            <Line type="monotone" dataKey="provisao" stroke="#f97316" name="Provisões" strokeWidth={2} dot={{ fill: "#f97316" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // RENDER CLIENTES
  // ════════════════════════════════════════
  const renderClientes = () => (
    <div className="space-y-4">
      <button onClick={() => { setEditandoCliente(null); setNovoCliente(clienteVazio); setMostrarFormCliente(!mostrarFormCliente); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
        <Plus className="w-4 h-4" /> Novo Cliente
      </button>

      {mostrarFormCliente && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-5 text-base">{editandoCliente ? "✏️ Editar Cliente" : "Cadastrar Cliente"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { label: "Nome *", field: "nome", type: "text", placeholder: "João da Silva" },
              { label: "Email", field: "email", type: "email", placeholder: "joao@email.com" },
              { label: "Telefone", field: "telefone", type: "text", placeholder: "11999999999" },
              { label: "Data Aquisição", field: "dataAquisicao", type: "date", placeholder: "" },
              { label: "Valor (R$) *", field: "valor", type: "number", placeholder: "50000" },
              { label: "Data 1ª Parcela *", field: "dataPrimeiraParcela", type: "date", placeholder: "" },
              { label: "Data 2ª Parcela *", field: "dataSegundaParcela", type: "date", placeholder: "" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={novoCliente[field]} onChange={e => setNovoCliente({ ...novoCliente, [field]: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo *</label>
              <select value={novoCliente.tipo} onChange={e => setNovoCliente({ ...novoCliente, tipo: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">
                {configuracoes.tiposComissao.map(tc => <option key={tc.id} value={tc.nome}>{tc.nome} ({tc.percentual}%)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Administradora *</label>
              <select value={novoCliente.admin} onChange={e => setNovoCliente({ ...novoCliente, admin: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">
                <option>Âncora</option><option>Magalu</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Parcelas *</label>
              <select value={novoCliente.parcelasComissao} onChange={e => setNovoCliente({ ...novoCliente, parcelasComissao: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">
                {[3,4,5,6,7,8,9,10,12].map(n => <option key={n} value={n}>{n} parcelas</option>)}
              </select>
            </div>
          </div>

          {novoCliente.valor && novoCliente.tipo && (
            <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-600 mb-4 text-sm flex gap-4">
              <span className="text-slate-400">Comissão total: <span className="font-bold text-emerald-400">{formatarMoeda(parseFloat(novoCliente.valor || 0) * (obterPercentualComissao(novoCliente.tipo) / 100))}</span></span>
              <span className="text-slate-400">Por parcela: <span className="font-bold text-emerald-300">{formatarMoeda(parseFloat(novoCliente.valor || 0) * (obterPercentualComissao(novoCliente.tipo) / 100) / novoCliente.parcelasComissao)}</span></span>
            </div>
          )}

          <div className="border-t border-slate-600 pt-4 mb-4">
            <h4 className="font-semibold text-white mb-3 text-sm">Alocar em Grupos *</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {grupos.map(grupo => {
                const ga = novoCliente.gruposCotas.find(gc => gc.grupoId === grupo.id);
                return (
                  <div key={grupo.id} className="bg-slate-900 p-3 rounded-lg border border-slate-600">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={!!ga} onChange={e => {
                        if (e.target.checked) setNovoCliente({ ...novoCliente, gruposCotas: [...novoCliente.gruposCotas, { grupoId: grupo.id, numeroGrupo: grupo.numeroGrupo, quantidadeCotas: 0, cotas: [] }] });
                        else setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.filter(gc => gc.grupoId !== grupo.id) });
                      }} className="w-4 h-4 accent-emerald-500" />
                      <span className="text-sm font-semibold text-slate-300">Grupo {grupo.numeroGrupo} <span className="text-slate-500 font-normal">({grupo.admin})</span></span>
                    </label>
                    {ga && (
                      <div className="ml-6 space-y-2">
                        <input placeholder="Qtd cotas" type="number" min="1" value={ga.quantidadeCotas || ""} onChange={e => {
                          const qtd = parseInt(e.target.value) || 0;
                          setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map(gc => gc.grupoId === grupo.id ? { ...gc, quantidadeCotas: qtd, cotas: Array(qtd).fill("") } : gc) });
                        }} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none" />
                        {ga.quantidadeCotas > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: ga.quantidadeCotas }).map((_, idx) => (
                              <input key={idx} placeholder={`Cota ${idx+1}`} type="number" value={ga.cotas[idx] || ""} onChange={e => {
                                setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map(gc => {
                                  if (gc.grupoId !== grupo.id) return gc;
                                  const nc = [...gc.cotas]; nc[idx] = parseInt(e.target.value) || ""; return { ...gc, cotas: nc };
                                }) });
                              }} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {grupos.length === 0 && <p className="text-slate-400 text-sm">Nenhum grupo. Adicione em Configurações.</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={salvarCliente} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors">{editandoCliente ? "Salvar Alterações" : "Salvar"}</button>
            <button onClick={() => { setMostrarFormCliente(false); setEditandoCliente(null); setNovoCliente(clienteVazio); }} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>{["Cliente","Tipo","Admin","Valor","Status","1ª Parcela","Ações"].map(h => <th key={h} className="px-4 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {clientes.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum cliente cadastrado</td></tr>
              ) : clientes.map(c => (
                <tr key={c.id} className="hover:bg-slate-700 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{c.nome}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${c.tipo === "Lead" ? "bg-blue-900 text-blue-300" : "bg-emerald-900 text-emerald-300"}`}>{c.tipo}</span></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.admin}</td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatarMoeda(parseFloat(c.valor || 0))}</td>
                  <td className="px-4 py-3">
                    <select value={c.status} onChange={e => atualizarStatusCliente(c.id, e.target.value)} className={`px-2 py-1 rounded text-xs font-semibold border focus:outline-none cursor-pointer ${c.status === "Ativo" ? "bg-emerald-900 border-emerald-700 text-emerald-200" : c.status === "Cancelado" ? "bg-red-900 border-red-700 text-red-200" : "bg-orange-900 border-orange-700 text-orange-200"}`}>
                      <option value="Ativo">Ativo</option><option value="Cancelado">Cancelado</option><option value="Inadimplente">Inadimplente</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(c.dataPrimeiraParcela + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <button onClick={() => abrirEdicaoCliente(c)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deletarCliente(c.id)} className="text-red-500 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // RENDER COTAS
  // ════════════════════════════════════════
  const renderCotas = () => {
    const grupoAtual = grupos.find(g => g.id === grupoFiltrado);
    if (!grupoAtual) return <div className="text-center py-8 text-slate-400">Selecione um grupo</div>;
    const cotasAlocadas = {};
    clientes.forEach(c => {
      if (c.status === "Cancelado") return;
      c.gruposCotas?.find(gc => gc.grupoId === grupoAtual.id)?.cotas?.forEach(num => { if (num) cotasAlocadas[num] = c.nome; });
    });
    const cotasOrdenadas = Object.keys(cotasAlocadas).map(Number).sort((a, b) => a - b);
    return (
      <div className="space-y-4">
        <div>
          <label className="block font-semibold text-white mb-2 text-sm">Filtrar Grupo:</label>
          <select value={grupoFiltrado} onChange={e => setGrupoFiltrado(parseInt(e.target.value))} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-semibold focus:border-emerald-500 focus:outline-none">
            {grupos.map(g => <option key={g.id} value={g.id}>Grupo {g.numeroGrupo} ({g.admin})</option>)}
          </select>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white">{grupoAtual.admin} — Grupo {grupoAtual.numeroGrupo}</h3>
          {grupoAtual.observacoes && <p className="text-xs text-slate-400 mb-2">{grupoAtual.observacoes}</p>}
          <div className="inline-block bg-slate-900 px-4 py-2 rounded-lg border border-slate-600 mb-4">
            <span className="text-slate-400 text-sm">Cotas alocadas: </span>
            <span className="text-2xl font-bold text-emerald-400">{cotasOrdenadas.length}</span>
          </div>
          {cotasOrdenadas.length > 0 ? (
            <>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
                {cotasOrdenadas.map(num => (
                  <div key={num} className="relative group p-2 rounded text-center font-bold text-sm bg-emerald-900 text-emerald-300 border border-emerald-700 hover:bg-emerald-800 cursor-default transition-colors">
                    {num}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">{cotasAlocadas[num]}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                <h4 className="font-bold text-white mb-3 text-sm">Por Cliente:</h4>
                {[...new Set(Object.values(cotasAlocadas))].map(nome => (
                  <div key={nome} className="p-2 bg-slate-800 rounded border border-slate-600 mb-2">
                    <p className="font-bold text-sm text-slate-300">{nome}</p>
                    <p className="text-xs text-slate-400">Cotas: {cotasOrdenadas.filter(c => cotasAlocadas[c] === nome).join(", ")}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="bg-slate-900 p-6 rounded text-center border border-slate-600"><p className="text-slate-400 font-semibold">Nenhuma cota alocada</p></div>}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════
  // RENDER COMISSÕES
  // ════════════════════════════════════════
  const renderComissoes = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-3">
        {[
          { label: "Mês", val: mesFiltro, set: v => setMesFiltro(parseInt(v)), opts: mesesNomes.map((m, i) => ({ v: i+1, l: m })) },
          { label: "Cliente", val: clienteFiltro, set: v => setClienteFiltro(v), opts: [{ v: "", l: "Todos" }, ...clientes.filter(c => c.status !== "Cancelado").map(c => ({ v: c.id, l: c.nome }))] },
          { label: "Admin", val: adminFiltro, set: v => setAdminFiltro(v), opts: [{ v: "", l: "Todas" }, { v: "Âncora", l: "Âncora" }, { v: "Magalu", l: "Magalu" }] },
        ].map(({ label, val, set, opts }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
            <select value={val} onChange={e => set(e.target.value)} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none">
              {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}
      </div>
      {comissoesFiltradas.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-xl text-center border border-slate-700"><p className="text-slate-400 font-semibold">Nenhuma comissão para o período</p></div>
      ) : comissoesFiltradas.map(comissao => (
        <div key={comissao.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-bold text-white">{comissao.cliente}</h4>
              <p className="text-xs text-slate-400">{comissao.tipo} • {comissao.admin} • Total: {formatarMoeda(comissao.comissaoTotal)}</p>
            </div>
            <button onClick={() => deletarComissao(comissao.id)} className="text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {comissao.parcelas_detalhes.filter(p => new Date(p.data).getMonth() + 1 === mesFiltro).map(p => (
              <div key={p.numero} className={`p-3 rounded text-center text-xs border ${p.status === "Recebido" ? "bg-emerald-900 border-emerald-700" : p.status === "Cancelado" ? "bg-slate-700 border-slate-600 opacity-50" : "bg-orange-900 border-orange-700"}`}>
                <p className="font-semibold text-slate-300">{p.numero}ª parcela</p>
                <p className="font-bold text-white text-sm my-0.5">{formatarMoeda(p.valor)}</p>
                <p className="text-slate-400 text-xs mb-1">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                {p.status === "Cancelado" ? <span className="text-xs text-slate-500">Cancelado</span>
                  : p.status === "Recebido" ? <button onClick={() => marcarParcelaPendente(comissao.id, p.numero)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded w-full font-semibold transition-colors">Desfazer</button>
                  : <input type="date" onChange={e => e.target.value && marcarParcelaRecebida(comissao.id, p.numero, e.target.value)} className="text-xs w-full px-1 py-1 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════
  // RENDER RELATÓRIO
  // ════════════════════════════════════════
  const renderRelatorio = () => {
    const comissoesDoMes = comissoes.reduce((t, c) => {
      if (clientes.find(cl => cl.id === c.clienteId)?.status === "Cancelado") return t;
      return t + c.parcelas_detalhes.filter(p => new Date(p.data).getMonth() + 1 === mesRelatorio).reduce((s, p) => s + p.valor, 0);
    }, 0);
    return (
      <div className="space-y-5">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <label className="block font-semibold text-white mb-2 text-sm">Selecione um Mês:</label>
          <select value={mesRelatorio} onChange={e => setMesRelatorio(parseInt(e.target.value))} className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:border-emerald-500 focus:outline-none text-sm">
            {mesesNomes.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-600">
          <p className="text-slate-400 text-sm font-semibold">Comissões em {mesesNomes[mesRelatorio-1]}</p>
          <p className="text-4xl font-bold text-white mt-1">{formatarMoeda(comissoesDoMes)}</p>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Previsão {anoSelecionado}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dadosRelatorio}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="mes" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
              <YAxis stroke="#cbd5e1" tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => formatarMoeda(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#e2e8f0" }} />
              <Legend />
              <Line type="monotone" dataKey="recebido" stroke="#10b981" name="Recebidos" strokeWidth={2} />
              <Line type="monotone" dataKey="provisao" stroke="#f97316" name="Provisões" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4">Detalhamento Anual</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>{["Mês","Recebidos","Provisões","Total"].map(h => <th key={h} className="px-4 py-2 text-left text-slate-300 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {dadosRelatorio.map((linha, idx) => (
                  <tr key={idx} className={`${mesRelatorio === idx+1 ? "bg-slate-700" : "hover:bg-slate-700"} transition-colors`}>
                    <td className="px-4 py-2 font-semibold text-slate-300">{linha.mes}</td>
                    <td className="px-4 py-2 text-emerald-400">{formatarMoeda(linha.recebido)}</td>
                    <td className="px-4 py-2 text-orange-400">{formatarMoeda(linha.provisao)}</td>
                    <td className="px-4 py-2 font-bold text-white">{formatarMoeda(linha.recebido + linha.provisao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════
  // RENDER CONFIGURAÇÕES
  // ════════════════════════════════════════
  const renderConfiguracoes = () => (
    <div className="space-y-5">
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 flex items-start gap-3">
        <Cloud className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-200 font-semibold mb-1">💾 Backup — Google Drive</p>
          <p className="text-blue-300 text-sm mb-3">Dados salvos automaticamente. Exporte um backup regularmente.</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportarBackup} disabled={sincronizando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
              {sincronizando ? <><Loader className="w-4 h-4 animate-spin" /> Exportando...</> : <><Download className="w-4 h-4" /> Baixar Backup (JSON)</>}
            </button>
            <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-colors">
              <Plus className="w-4 h-4" /> Importar JSON
              <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importarDados(e.target.files[0])} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Dados do Usuário</h3>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Nome</label>
        <input value={configuracoes.usuario} onChange={e => atualizarConfiguracoes({ ...configuracoes, usuario: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm" />
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-4">Metas Anuais</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(configuracoes.metas).map(([ano, meta]) => (
            <div key={ano}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{ano}</label>
              <input type="number" value={meta} onChange={e => atualizarConfiguracoes({ ...configuracoes, metas: { ...configuracoes.metas, [ano]: parseFloat(e.target.value) || 0 } })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-4">Tipos de Comissão</h3>
        <div className="space-y-2 mb-4">
          {configuracoes.tiposComissao.map(tipo => (
            <div key={tipo.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600">
              <div><p className="font-semibold text-white text-sm">{tipo.nome}</p><p className="text-xs text-slate-400">{tipo.percentual}%</p></div>
              <button onClick={() => atualizarConfiguracoes({ ...configuracoes, tiposComissao: configuracoes.tiposComissao.filter(tc => tc.id !== tipo.id) })} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-600 pt-4">
          <h4 className="font-semibold text-white mb-3 text-sm">Adicionar Tipo</h4>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <input placeholder="Nome (ex: Premium)" value={novaConfiguracaoComissao.nome} onChange={e => setNovaConfiguracaoComissao({ ...novaConfiguracaoComissao, nome: e.target.value })} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
            <input placeholder="Percentual (ex: 2.5)" type="number" step="0.1" value={novaConfiguracaoComissao.percentual} onChange={e => setNovaConfiguracaoComissao({ ...novaConfiguracaoComissao, percentual: e.target.value })} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
          </div>
          <button onClick={() => {
            if (!novaConfiguracaoComissao.nome || !novaConfiguracaoComissao.percentual) return;
            atualizarConfiguracoes({ ...configuracoes, tiposComissao: [...configuracoes.tiposComissao, { id: Math.max(0, ...configuracoes.tiposComissao.map(tc => tc.id)) + 1, nome: novaConfiguracaoComissao.nome, percentual: parseFloat(novaConfiguracaoComissao.percentual) }] });
            setNovaConfiguracaoComissao({ nome: "", percentual: "" });
            mostrarNotificacao("Tipo adicionado");
          }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white">Grupos</h3>
          <button onClick={() => { setNovoGrupo({ numeroGrupo: "", admin: "Âncora", observacoes: "" }); setEditandoGrupo(null); setMostrarFormGrupo(!mostrarFormGrupo); }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
        {mostrarFormGrupo && (
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-600 mb-4">
            <h4 className="text-white font-semibold mb-3 text-sm">{editandoGrupo ? "Editar" : "Criar"} Grupo</h4>
            <div className="space-y-2 mb-3">
              <input placeholder="Número do grupo" value={novoGrupo.numeroGrupo} onChange={e => setNovoGrupo({ ...novoGrupo, numeroGrupo: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
              <select value={novoGrupo.admin} onChange={e => setNovoGrupo({ ...novoGrupo, admin: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">
                <option>Âncora</option><option>Magalu</option>
              </select>
              <input placeholder="Observações" value={novoGrupo.observacoes} onChange={e => setNovoGrupo({ ...novoGrupo, observacoes: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={adicionarGrupo} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">{editandoGrupo ? "Salvar" : "Criar"}</button>
              <button onClick={() => setMostrarFormGrupo(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {grupos.map(g => (
            <div key={g.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600">
              <div><p className="font-semibold text-white text-sm">Grupo {g.numeroGrupo}</p><p className="text-xs text-slate-400">{g.admin}{g.observacoes ? ` • ${g.observacoes}` : ""}</p></div>
              <div className="flex gap-2">
                <button onClick={() => { setNovoGrupo({ numeroGrupo: g.numeroGrupo, admin: g.admin, observacoes: g.observacoes }); setEditandoGrupo(g); setMostrarFormGrupo(true); }} className="text-blue-400 hover:text-blue-300 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deletarGrupo(g.id)} className="text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════
  // LAYOUT PRINCIPAL
  // ════════════════════════════════════════
  const navItems = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "clientes", icon: Users, label: "Clientes" },
    { id: "cotas", icon: Grid, label: "Cotas" },
    { id: "comissoes", icon: DollarSign, label: "Comissões" },
    { id: "relatorio", icon: Download, label: "Relatório" },
    { id: "configuracoes", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <div className={`${sidebarAberto ? "w-56" : "w-0"} bg-gradient-to-b from-slate-900 to-black text-white transition-all duration-300 overflow-hidden shadow-2xl border-r border-slate-800 flex-shrink-0`}>
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wide">Monteo</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestor 2.0</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setAbaSelecionada(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${abaSelecionada === item.id ? "bg-emerald-600 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800"}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
          <button onClick={() => setSidebarAberto(!sidebarAberto)} className="text-slate-400 hover:text-white transition-colors">
            {sidebarAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <select value={anoSelecionado} onChange={e => setAnoSelecionado(parseInt(e.target.value))} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm focus:border-emerald-500 focus:outline-none">
              {Object.keys(configuracoes.metas).map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
            <div className="text-right border-l border-slate-700 pl-3">
              <p className="text-xs text-slate-400">Consultor</p>
              <p className="font-bold text-white text-sm">{configuracoes.usuario}</p>
            </div>
          </div>
        </div>

        {notificacao && (
          <div className={`px-4 py-2 flex items-center gap-2 text-sm flex-shrink-0 ${notificacao.tipo === "success" ? "bg-emerald-900 text-emerald-200" : notificacao.tipo === "error" ? "bg-red-900 text-red-200" : "bg-blue-900 text-blue-200"}`}>
            {notificacao.tipo === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notificacao.msg}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {abaSelecionada === "dashboard" && renderDashboard()}
            {abaSelecionada === "clientes" && renderClientes()}
            {abaSelecionada === "cotas" && renderCotas()}
            {abaSelecionada === "comissoes" && renderComissoes()}
            {abaSelecionada === "relatorio" && renderRelatorio()}
            {abaSelecionada === "configuracoes" && renderConfiguracoes()}
          </div>
        </div>
      </div>
    </div>
  );
}
