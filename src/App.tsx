import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Menu, X, BarChart3, Users, DollarSign, Download, Settings, Edit2, AlertCircle, CheckCircle, Cloud, Loader, Grid, LogOut, Upload, AlertTriangle } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Login from "./Login";

function calcularSimilaridade(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const s2 = str2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const palavras1 = s1.split(' ');
  const palavras2 = s2.split(' ');
  let matches = 0;
  for (const p1 of palavras1) {
    for (const p2 of palavras2) {
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) { matches++; break; }
    }
  }
  return matches / Math.max(palavras1.length, palavras2.length);
}

export default function GestorVendas() {
  const [usuario, setUsuario] = useState<any>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [sidebarAberto, setSidebarAberto] = useState(true);
  const [abaSelecionada, setAbaSelecionada] = useState("dashboard");
  const [anoSelecionado, setAnoSelecionado] = useState(2026);
  const [notificacao, setNotificacao] = useState<any>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const [grupos, setGrupos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState({
    usuario: "",
    metas: { 2026: 150000, 2027: 180000, 2028: 200000, 2029: 220000, 2030: 250000 },
    tiposComissao: [
      { id: 1, nome: "Lead", percentual: 0.7 },
      { id: 2, nome: "Relacional", percentual: 1.5 },
    ],
  });

  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState<any>(null);
  const [mostrarFormGrupo, setMostrarFormGrupo] = useState(false);
  const [editandoGrupo, setEditandoGrupo] = useState<any>(null);
  const [mostrarFormTipoComissao, setMostrarFormTipoComissao] = useState(false);
  const [editandoTipoComissao, setEditandoTipoComissao] = useState<any>(null);

  const [validacaoPDF, setValidacaoPDF] = useState<any>(null);
  const [processandoPDF, setProcessandoPDF] = useState(false);
  const [importacaoClientes, setImportacaoClientes] = useState<any>(null);
  const [processandoImportacao, setProcessandoImportacao] = useState(false);

  // Modal de data de recebimento
  const [modalRecebimento, setModalRecebimento] = useState<{comissaoId: number, numeroParcela: number} | null>(null);
  const [dataRecebimentoInput, setDataRecebimentoInput] = useState("");

  const clienteVazio = { nomeCompleto: "", email: "", telefone: "", tipo: "Lead", admin: "Ancova", valor: "", dataAquisicao: "", dataPrimeiraParcela: "", dataSegundaParcela: "", parcelasComissao: 5, gruposCotas: [] };
  const clienteVazioReal = { nomeCompleto: "", email: "", telefone: "", tipo: "Lead", admin: "Âncora", valor: "", dataAquisicao: "", dataPrimeiraParcela: "", dataSegundaParcela: "", parcelasComissao: 5, gruposCotas: [] };
  const [novoCliente, setNovoCliente] = useState(clienteVazioReal);
  const [novoGrupo, setNovoGrupo] = useState({ numeroGrupo: "", admin: "Âncora", observacoes: "" });
  const [novoTipoComissao, setNovoTipoComissao] = useState({ nome: "", percentual: "" });

  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [mesRelatorio, setMesRelatorio] = useState(new Date().getMonth() + 1);
  const [grupoFiltrado, setGrupoFiltrado] = useState(1);
  const [mesCarteira, setMesCarteira] = useState(new Date().getMonth() + 1);

  const mostrarNotificacao = (msg: string, tipo = "success") => {
    setNotificacao({ msg, tipo });
    setTimeout(() => setNotificacao(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregandoAuth(false);
      if (user) carregarDadosFirebase(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const carregarDadosFirebase = async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setGrupos(dados.grupos || []);
        setClientes(dados.clientes || []);
        setComissoes(dados.comissoes || []);
        if (dados.configuracoes) setConfiguracoes(dados.configuracoes);
        if (dados.grupos?.length > 0) setGrupoFiltrado(dados.grupos[0].id);
        mostrarNotificacao("✅ Dados carregados");
      } else {
        inicializarDados(userId);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao carregar", "error");
    }
  };

  const salvarDados = useCallback(async (g: any, cl: any, co: any, conf: any, uid?: string) => {
    const userId = uid || usuario?.uid;
    if (!userId) return;
    setSincronizando(true);
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, { grupos: g, clientes: cl, comissoes: co, configuracoes: conf, ultimaSincronizacao: new Date().toISOString() });
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao salvar", "error");
    } finally {
      setSincronizando(false);
    }
  }, [usuario]);

  const inicializarDados = useCallback((uid: string) => {
    setGrupos([]); setClientes([]); setComissoes([]); setGrupoFiltrado(0);
    salvarDados([], [], [], configuracoes, uid);
    mostrarNotificacao("✅ Bem-vindo! Configure seus grupos em Configuracoes.");
  }, [salvarDados, configuracoes]);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null); setGrupos([]); setClientes([]); setComissoes([]);
  };

  const formatarMoeda = (val: number) => "R$ " + (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const obterPercentualComissao = (tipo: string) => configuracoes.tiposComissao.find(tc => tc.nome === tipo)?.percentual || 0;
  const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const gerarParcelas = (dadosCliente: any, comissaoTotal: number) => {
    const numParcelas = parseInt(dadosCliente.parcelasComissao);
    const valorParcela = comissaoTotal / numParcelas;
    const parcelas = [];
    parcelas.push({ numero: 1, valor: valorParcela, data: dadosCliente.dataPrimeiraParcela, status: "Pendente", dataRecebimento: null });
    if (numParcelas >= 2) parcelas.push({ numero: 2, valor: valorParcela, data: dadosCliente.dataSegundaParcela, status: "Pendente", dataRecebimento: null });
    if (numParcelas > 2) {
      const d2 = new Date(dadosCliente.dataSegundaParcela + "T12:00:00");
      for (let i = 3; i <= numParcelas; i++) {
        const dataProxima = new Date(d2);
        dataProxima.setMonth(dataProxima.getMonth() + (i - 2));
        parcelas.push({ numero: i, valor: valorParcela, data: `${dataProxima.getFullYear()}-${String(dataProxima.getMonth()+1).padStart(2,'0')}-${String(dataProxima.getDate()).padStart(2,'0')}`, status: "Pendente", dataRecebimento: null });
      }
    }
    return parcelas;
  };

  const salvarCliente = () => {
    if (!novoCliente.nomeCompleto || !novoCliente.valor || !novoCliente.dataAquisicao || !novoCliente.dataPrimeiraParcela || !novoCliente.dataSegundaParcela) {
      mostrarNotificacao("Preencha todos os campos obrigatórios", "error"); return;
    }
    const valorNumerico = parseFloat(novoCliente.valor);
    const percentualComissao = obterPercentualComissao(novoCliente.tipo);
    const comissaoTotal = (valorNumerico * percentualComissao) / 100;
    const parcelasDetalhadas = gerarParcelas(novoCliente, comissaoTotal);
    if (editandoCliente) {
      const clientesAtualizados = clientes.map(c => c.id === editandoCliente.id ? { ...novoCliente, id: c.id, valor: valorNumerico, status: c.status } : c);
      const comissoesAtualizadas = comissoes.map(com => com.clienteId === editandoCliente.id ? { ...com, cliente: novoCliente.nomeCompleto, tipo: novoCliente.tipo, admin: novoCliente.admin, valor: valorNumerico, comissaoPercentual: percentualComissao, comissaoTotal, parcelas: parseInt(novoCliente.parcelasComissao), parcelas_detalhes: parcelasDetalhadas } : com);
      setClientes(clientesAtualizados); setComissoes(comissoesAtualizadas);
      salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
      mostrarNotificacao("Cliente atualizado");
    } else {
      const novoId = Math.max(0, ...clientes.map(c => c.id)) + 1;
      const clienteCompleto = { ...novoCliente, id: novoId, valor: valorNumerico, status: "Ativo" };
      const novaComissao = { id: Math.max(0, ...comissoes.map(c => c.id)) + 1, clienteId: novoId, cliente: novoCliente.nomeCompleto, tipo: novoCliente.tipo, admin: novoCliente.admin, valor: valorNumerico, comissaoPercentual: percentualComissao, comissaoTotal, parcelas: parseInt(novoCliente.parcelasComissao), parcelas_detalhes: parcelasDetalhadas };
      const clientesAtualizados = [...clientes, clienteCompleto];
      const comissoesAtualizadas = [...comissoes, novaComissao];
      setClientes(clientesAtualizados); setComissoes(comissoesAtualizadas);
      salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
      mostrarNotificacao("Cliente adicionado");
    }
    setNovoCliente(clienteVazioReal); setEditandoCliente(null); setMostrarFormCliente(false);
  };

  const deletarCliente = (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este cliente?")) return;
    const clientesAtualizados = clientes.filter(c => c.id !== id);
    const comissoesAtualizadas = comissoes.filter(c => c.clienteId !== id);
    setClientes(clientesAtualizados); setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
    mostrarNotificacao("Cliente deletado");
  };

  const atualizarStatusCliente = (id: number, status: string) => {
    const clientesAtualizados = clientes.map(c => c.id === id ? {...c, status} : c);
    setClientes(clientesAtualizados);
    salvarDados(grupos, clientesAtualizados, comissoes, configuracoes);
    mostrarNotificacao("Status atualizado");
  };

  const abrirEdicaoCliente = (cliente: any) => { setNovoCliente(cliente); setEditandoCliente(cliente); setMostrarFormCliente(true); };

  const adicionarGrupo = () => {
    if (!novoGrupo.numeroGrupo) return;
    if (editandoGrupo) {
      const gruposAtualizados = grupos.map(g => g.id === editandoGrupo.id ? { ...novoGrupo, id: g.id } : g);
      setGrupos(gruposAtualizados); salvarDados(gruposAtualizados, clientes, comissoes, configuracoes); mostrarNotificacao("Grupo atualizado");
    } else {
      const gruposAtualizados = [...grupos, { ...novoGrupo, id: Math.max(0, ...grupos.map(g => g.id)) + 1 }];
      setGrupos(gruposAtualizados); salvarDados(gruposAtualizados, clientes, comissoes, configuracoes); mostrarNotificacao("Grupo adicionado");
    }
    setNovoGrupo({ numeroGrupo: "", admin: "Âncora", observacoes: "" }); setEditandoGrupo(null); setMostrarFormGrupo(false);
  };

  const deletarGrupo = (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este grupo?")) return;
    const gruposAtualizados = grupos.filter(g => g.id !== id);
    setGrupos(gruposAtualizados); salvarDados(gruposAtualizados, clientes, comissoes, configuracoes); mostrarNotificacao("Grupo deletado");
  };

  const adicionarTipoComissao = () => {
    if (!novoTipoComissao.nome || !novoTipoComissao.percentual) { mostrarNotificacao("Preencha nome e percentual", "error"); return; }
    if (editandoTipoComissao) {
      const tiposAtualizados = configuracoes.tiposComissao.map(tc => tc.id === editandoTipoComissao.id ? { ...tc, nome: novoTipoComissao.nome, percentual: parseFloat(novoTipoComissao.percentual) } : tc);
      const novasConfig = { ...configuracoes, tiposComissao: tiposAtualizados };
      setConfiguracoes(novasConfig); salvarDados(grupos, clientes, comissoes, novasConfig); mostrarNotificacao("Tipo de comissão atualizado");
    } else {
      const novasConfig = { ...configuracoes, tiposComissao: [...configuracoes.tiposComissao, { id: Math.max(0, ...configuracoes.tiposComissao.map(tc => tc.id)) + 1, nome: novoTipoComissao.nome, percentual: parseFloat(novoTipoComissao.percentual) }] };
      setConfiguracoes(novasConfig); salvarDados(grupos, clientes, comissoes, novasConfig); mostrarNotificacao("Tipo de comissão adicionado");
    }
    setNovoTipoComissao({ nome: "", percentual: "" }); setEditandoTipoComissao(null); setMostrarFormTipoComissao(false);
  };

  const deletarTipoComissao = (id: number) => {
    if (configuracoes.tiposComissao.length <= 1) { mostrarNotificacao("Não é possível deletar. Deve ter pelo menos 1 tipo", "error"); return; }
    if (!confirm("Tem certeza que deseja deletar este tipo de comissão?")) return;
    const novasConfig = { ...configuracoes, tiposComissao: configuracoes.tiposComissao.filter(tc => tc.id !== id) };
    setConfiguracoes(novasConfig); salvarDados(grupos, clientes, comissoes, novasConfig); mostrarNotificacao("Tipo de comissão deletado");
  };

  // Abre modal para escolher data de recebimento
  const abrirModalRecebimento = (comissaoId: number, numeroParcela: number) => {
    setModalRecebimento({ comissaoId, numeroParcela });
    setDataRecebimentoInput(new Date().toISOString().split('T')[0]);
  };

  // Confirma com a data escolhida
  const confirmarRecebimento = () => {
    if (!modalRecebimento || !dataRecebimentoInput) return;
    const { comissaoId, numeroParcela } = modalRecebimento;
    const comissoesAtualizadas = comissoes.map(com => {
      if (com.id !== comissaoId) return com;
      return { ...com, parcelas_detalhes: com.parcelas_detalhes.map((p: any) => p.numero === numeroParcela ? { ...p, status: "Recebido", dataRecebimento: dataRecebimentoInput } : p) };
    });
    setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientes, comissoesAtualizadas, configuracoes);
    setModalRecebimento(null);
    mostrarNotificacao("✅ Parcela marcada como recebida");
  };

  // Desfaz recebimento sem modal
  const desmarcarRecebimento = (comissaoId: number, numeroParcela: number) => {
    const comissoesAtualizadas = comissoes.map(com => {
      if (com.id !== comissaoId) return com;
      return { ...com, parcelas_detalhes: com.parcelas_detalhes.map((p: any) => p.numero === numeroParcela ? { ...p, status: "Pendente", dataRecebimento: null } : p) };
    });
    setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientes, comissoesAtualizadas, configuracoes);
    mostrarNotificacao("Parcela desmarcada");
  };

  const atualizarConfiguracoes = (novasConfig: any) => {
    setConfiguracoes(novasConfig); salvarDados(grupos, clientes, comissoes, novasConfig); mostrarNotificacao("Configurações salvas");
  };

  const detectarDuplicata = (clienteImport: any): { duplicado: boolean; motivo: string } => {
    for (const ce of clientes) {
      if (calcularSimilaridade(clienteImport.nome, ce.nomeCompleto) >= 0.85)
        return { duplicado: true, motivo: `Nome similar ao cliente já cadastrado: "${ce.nomeCompleto}"` };
    }
    for (const cota of clienteImport.cotas) {
      for (const ce of clientes) {
        if (ce.status === "Cancelado") continue;
        for (const gc of (ce.gruposCotas || [])) {
          if (gc.numeroGrupo === clienteImport.grupo && gc.cotas?.includes(parseInt(cota)))
            return { duplicado: true, motivo: `Cota ${cota} do grupo ${clienteImport.grupo} já alocada para: "${ce.nomeCompleto}"` };
        }
      }
    }
    return { duplicado: false, motivo: "" };
  };

  const aplicarEstornos = () => {
    if (!importacaoClientes?.estornos?.length) return;
    let clientesAtualizados = [...clientes];
    let comissoesAtualizadas = [...comissoes];
    let totalEstornados = 0;
    for (const estorno of importacaoClientes.estornos) {
      let melhorCliente: any = null; let melhorSim = 0;
      for (const cliente of clientesAtualizados) {
        const sim = calcularSimilaridade(estorno.nome, cliente.nomeCompleto);
        if (sim > melhorSim && sim >= 0.6) { melhorSim = sim; melhorCliente = cliente; }
      }
      if (!melhorCliente) continue;
      clientesAtualizados = clientesAtualizados.map(c => c.id === melhorCliente.id ? { ...c, status: "Cancelado" } : c);
      comissoesAtualizadas = comissoesAtualizadas.map(com => {
        if (com.clienteId !== melhorCliente.id) return com;
        return { ...com, parcelas_detalhes: com.parcelas_detalhes.map((p: any) => p.status === "Pendente" ? { ...p, status: "Estornado", dataRecebimento: null } : p) };
      });
      totalEstornados++;
    }
    setClientes(clientesAtualizados); setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
    setImportacaoClientes({ ...importacaoClientes, estornosAplicados: true });
    mostrarNotificacao(`✅ ${totalEstornados} estorno(s) aplicado(s) — clientes marcados como Cancelado`);
  };

  const processarPDF = async (arquivo: File) => {
    setProcessandoPDF(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const arrayBuffer = await arquivo.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textoCompleto += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      const comissoesPDF: any[] = [];
      const padraoCliente = /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+?)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,]+)\s+(\d+)\s+(\d{5,6})\s+(\d{4})\s+([\d,]+)\s+([\d,]+)/g;
      const inicioEstornos = textoCompleto.indexOf('Estornos');
      const fimPP = inicioEstornos > 0 ? inicioEstornos : textoCompleto.indexOf('Recibos de Adiantamento');
      const secaoPP = textoCompleto.substring(textoCompleto.indexOf('Parcelas Pagas'), fimPP > 0 ? fimPP : textoCompleto.length);
      let match;
      const clientesMap = new Map();
      while ((match = padraoCliente.exec(secaoPP)) !== null) {
        const nome = match[1].trim(); const val = parseFloat(match[8].replace(',', '.'));
        clientesMap.has(nome) ? clientesMap.set(nome, clientesMap.get(nome) + val) : clientesMap.set(nome, val);
      }
      for (const [nome, valor] of clientesMap.entries()) comissoesPDF.push({ nome, valor });
      const validacao: any[] = [];
      comissoesMes.forEach(com => {
        const cliente = clientes.find(c => c.id === com.clienteId);
        if (!cliente) return;
        const totalMes = com.parcelas_detalhes.filter((p: any) => new Date(p.data).getMonth()+1===mesFiltro && new Date(p.data).getFullYear()===anoSelecionado).reduce((sum: number, p: any) => sum+p.valor, 0);
        let melhorMatch: any = null; let melhorSim = 0;
        for (const item of comissoesPDF) { const sim = calcularSimilaridade(cliente.nomeCompleto, item.nome); if (sim > melhorSim && sim >= 0.6) { melhorSim = sim; melhorMatch = item; } }
        if (!melhorMatch) validacao.push({ cliente: cliente.nomeCompleto, valorCadastrado: totalMes, valorPDF: null, status: 'faltando' });
        else validacao.push({ cliente: cliente.nomeCompleto, valorCadastrado: totalMes, valorPDF: melhorMatch.valor, status: Math.abs(totalMes-melhorMatch.valor) < 0.01 ? 'ok' : 'divergente' });
      });
      setValidacaoPDF(validacao); mostrarNotificacao("✅ PDF processado com sucesso!");
    } catch (error) { console.error("Erro ao processar PDF:", error); mostrarNotificacao("❌ Erro ao processar PDF", "error"); }
    finally { setProcessandoPDF(false); }
  };

  const handleUploadPDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && arquivo.type === 'application/pdf') processarPDF(arquivo);
    else mostrarNotificacao("Selecione um arquivo PDF válido", "error");
  };

  const importarClientesPDF = async (arquivo: File) => {
    setProcessandoImportacao(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const arrayBuffer = await arquivo.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textoCompleto += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      const clientesExtraidos: any[] = []; const estornosExtraidos: any[] = [];
      const padraoCliente = /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+?)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,]+)\s+(\d+)\s+(\d{5,6})\s+(\d{4})\s+([\d,]+)\s+([\d,]+)/g;
      const inicioEstornos = textoCompleto.indexOf('Estornos');
      const fimPP = inicioEstornos > 0 ? inicioEstornos : textoCompleto.indexOf('Recibos de Adiantamento');
      const secaoPP = textoCompleto.substring(textoCompleto.indexOf('Parcelas Pagas'), fimPP > 0 ? fimPP : textoCompleto.length);
      let match;
      while ((match = padraoCliente.exec(secaoPP)) !== null) clientesExtraidos.push({ nome: match[1].trim(), dataVenda: match[2], valorCredito: parseFloat(match[3].replace('.','').replace(',','.')), parcela: parseInt(match[4]), grupo: match[5], cota: match[6], percentual: parseFloat(match[7].replace(',','.')), valorComissao: parseFloat(match[8].replace(',','.')) });
      if (inicioEstornos > 0) {
        const secaoE = textoCompleto.substring(inicioEstornos, textoCompleto.indexOf('Recibos de Adiantamento') > 0 ? textoCompleto.indexOf('Recibos de Adiantamento') : textoCompleto.length);
        padraoCliente.lastIndex = 0;
        while ((match = padraoCliente.exec(secaoE)) !== null) estornosExtraidos.push({ nome: match[1].trim(), dataVenda: match[2], valorCredito: parseFloat(match[3].replace('.','').replace(',','.')), parcela: parseInt(match[4]), grupo: match[5], cota: match[6], percentual: parseFloat(match[7].replace(',','.')), valorComissao: parseFloat(match[8].replace(',','.')) });
      }
      const clientesAgrupados = new Map();
      for (const item of clientesExtraidos) {
        if (!clientesAgrupados.has(item.nome)) clientesAgrupados.set(item.nome, { nome: item.nome, dataVenda: item.dataVenda, valorCredito: item.valorCredito, parcela: item.parcela, grupo: item.grupo, percentual: item.percentual, cotas: [item.cota], valorTotal: item.valorComissao, tipo: item.percentual === 0.07 ? 'Lead' : 'Relacional', admin: item.grupo.startsWith('006') ? 'Magalu' : 'Âncora', selecionado: true });
        else { const ce = clientesAgrupados.get(item.nome); ce.cotas.push(item.cota); ce.valorTotal += item.valorComissao; }
      }
      const listaClientes = Array.from(clientesAgrupados.values()).map((c: any) => { const { duplicado, motivo } = detectarDuplicata(c); return { ...c, selecionado: !duplicado, duplicado, motivoDuplicata: motivo }; });
      setImportacaoClientes({ clientes: listaClientes, estornos: estornosExtraidos, estornosAplicados: false });
      const duplicatas = listaClientes.filter((c: any) => c.duplicado).length;
      if (duplicatas > 0) mostrarNotificacao(`⚠️ ${listaClientes.length} clientes encontrados — ${duplicatas} possível(is) duplicata(s) detectada(s)`, "error");
      else mostrarNotificacao(`✅ ${listaClientes.length} clientes encontrados!`);
    } catch (error) { console.error("Erro:", error); mostrarNotificacao("❌ Erro ao processar PDF", "error"); }
    finally { setProcessandoImportacao(false); }
  };

  const handleUploadImportacao = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && arquivo.type === 'application/pdf') importarClientesPDF(arquivo);
    else mostrarNotificacao("Selecione um arquivo PDF válido", "error");
  };

  const confirmarImportacao = () => {
    if (!importacaoClientes) return;
    const clientesSelecionados = importacaoClientes.clientes.filter((c: any) => c.selecionado);
    if (clientesSelecionados.length === 0) { mostrarNotificacao("Selecione pelo menos um cliente", "error"); return; }
    const novosClientes: any[] = []; const novasComissoes: any[] = [];
    let novoIdCliente = Math.max(0, ...clientes.map(c => c.id)) + 1;
    let novoIdComissao = Math.max(0, ...comissoes.map(c => c.id)) + 1;
    for (const ci of clientesSelecionados) {
      const [dia, mes, anoAbrv] = ci.dataVenda.split('/');
      const dataFormatada = `20${anoAbrv}-${mes}-${dia}`;
      novosClientes.push({ id: novoIdCliente, nomeCompleto: ci.nome, email: "", telefone: "", tipo: ci.tipo, admin: ci.admin, valor: ci.valorCredito, dataAquisicao: dataFormatada, dataPrimeiraParcela: dataFormatada, dataSegundaParcela: dataFormatada, parcelasComissao: 10, status: "Ativo", gruposCotas: [{ grupoId: null, numeroGrupo: ci.grupo, quantidadeCotas: ci.cotas.length, cotas: ci.cotas }] });
      const [anoBase, mesBase, diaBase] = dataFormatada.split('-').map(Number);
      const parcelas = [];
      for (let i = 1; i <= 10; i++) {
        let mesParc = mesBase + (i-1); let anoParc = anoBase;
        while (mesParc > 12) { mesParc -= 12; anoParc++; }
        const ultimoDia = new Date(anoParc, mesParc, 0).getDate();
        const diaParc = Math.min(diaBase, ultimoDia);
        const status = i <= ci.parcela ? "Recebido" : "Pendente";
        parcelas.push({ numero: i, valor: ci.valorTotal, data: `${anoParc}-${String(mesParc).padStart(2,'0')}-${String(diaParc).padStart(2,'0')}`, status, dataRecebimento: status === "Recebido" ? new Date().toISOString().split('T')[0] : null });
      }
      novasComissoes.push({ id: novoIdComissao, clienteId: novoIdCliente, cliente: ci.nome, tipo: ci.tipo, admin: ci.admin, valor: ci.valorCredito, comissaoPercentual: ci.percentual, comissaoTotal: ci.valorTotal * 10, parcelas: 10, parcelas_detalhes: parcelas });
      novoIdCliente++; novoIdComissao++;
    }
    const clientesAtualizados = [...clientes, ...novosClientes];
    const comissoesAtualizadas = [...comissoes, ...novasComissoes];
    setClientes(clientesAtualizados); setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
    setImportacaoClientes(null); mostrarNotificacao(`✅ ${clientesSelecionados.length} clientes importados!`);
  };

  const faturadoAno = useMemo(() => comissoes.reduce((acc, com) => {
    if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
    return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Recebido" && p.dataRecebimento && new Date(p.dataRecebimento).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s + p.valor, 0);
  }, 0), [comissoes, clientes, anoSelecionado]);

  const pendenteAno = useMemo(() => comissoes.reduce((acc, com) => {
    if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
    return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Pendente" && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s + p.valor, 0);
  }, 0), [comissoes, clientes, anoSelecionado]);

  const metaAno = configuracoes.metas[anoSelecionado] || 0;
  const percentualMeta = metaAno > 0 ? (faturadoAno / metaAno) * 100 : 0;
  const faltandoMeta = Math.max(0, metaAno - faturadoAno);

  const distribuicaoAdmin = useMemo(() => [
    { name: "Âncora", value: clientes.filter(c => c.status !== "Cancelado" && c.admin === "Âncora").length },
    { name: "Magalu", value: clientes.filter(c => c.status !== "Cancelado" && c.admin === "Magalu").length },
  ], [clientes]);

  const dadosPrevisao = useMemo(() => mesesNomes.map((mes, idx) => {
    const mesNum = idx + 1;
    const recebidoMes = comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Recebido" && p.dataRecebimento && new Date(p.dataRecebimento).getFullYear() === anoSelecionado && new Date(p.dataRecebimento).getMonth()+1 === mesNum).reduce((s: number, p: any) => s+p.valor, 0);
    }, 0);
    const previstoMes = comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      return acc + com.parcelas_detalhes.filter((p: any) => new Date(p.data).getFullYear() === anoSelecionado && new Date(p.data).getMonth()+1 === mesNum).reduce((s: number, p: any) => s+p.valor, 0);
    }, 0);
    return { mes, recebido: recebidoMes, previsto: previstoMes };
  }), [comissoes, clientes, anoSelecionado]);

  const dadosRelatorio = useMemo(() => mesesNomes.map((mes, idx) => {
    const mesNum = idx + 1;
    const recebido = comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Recebido" && new Date(p.data).getMonth()+1 === mesNum && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s+p.valor, 0);
    }, 0);
    const provisao = comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Pendente" && new Date(p.data).getMonth()+1 === mesNum && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s+p.valor, 0);
    }, 0);
    return { mes, recebido, provisao };
  }), [comissoes, clientes, anoSelecionado]);

  const comissoesMes = useMemo(() => comissoes.filter(com => {
    if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return false;
    return com.parcelas_detalhes.some((p: any) => new Date(p.data).getMonth()+1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado);
  }), [comissoes, clientes, mesFiltro, anoSelecionado]);

  const totalRecebidoMes = useMemo(() => comissoesMes.reduce((acc, com) => acc + com.parcelas_detalhes.filter((p: any) => p.status === "Recebido" && new Date(p.data).getMonth()+1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s+p.valor, 0), 0), [comissoesMes, mesFiltro, anoSelecionado]);
  const totalPendenteMes = useMemo(() => comissoesMes.reduce((acc, com) => acc + com.parcelas_detalhes.filter((p: any) => p.status === "Pendente" && new Date(p.data).getMonth()+1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s+p.valor, 0), 0), [comissoesMes, mesFiltro, anoSelecionado]);
  const totalCotas = useMemo(() => clientes.reduce((acc, c) => { if (c.status === "Cancelado") return acc; return acc + (c.gruposCotas?.reduce((s: number, gc: any) => s+(gc.quantidadeCotas||0), 0)||0); }, 0), [clientes]);
  const carteiraAtivos = useMemo(() => clientes.filter(c => { if (c.status !== "Ativo") return false; const com = comissoes.find(co => co.clienteId === c.id); if (!com) return false; return com.parcelas_detalhes.some((p: any) => new Date(p.data).getMonth()+1 === mesCarteira && new Date(p.data).getFullYear() === anoSelecionado); }).length, [clientes, comissoes, mesCarteira, anoSelecionado]);
  const totalVendido = useMemo(() => clientes.filter(c => c.status !== "Cancelado").reduce((acc, c) => acc+(c.valor||0), 0), [clientes]);
  const vendidoMes = useMemo(() => clientes.filter(c => { if (c.status === "Cancelado") return false; const d = new Date(c.dataAquisicao); return d.getMonth()+1 === mesCarteira && d.getFullYear() === anoSelecionado; }).reduce((acc, c) => acc+(c.valor||0), 0), [clientes, mesCarteira, anoSelecionado]);

  const CORES = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (carregandoAuth) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (!usuario) return <Login onLogin={() => {}} />;

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><p className="text-xs text-slate-400 mb-1">Meta {anoSelecionado}</p><p className="text-2xl font-bold text-white">{formatarMoeda(metaAno)}</p></div>
        <div className="bg-emerald-900 p-5 rounded-xl border border-emerald-700"><p className="text-xs text-emerald-200 mb-1">Faturado</p><p className="text-2xl font-bold text-white">{formatarMoeda(faturadoAno)}</p><p className="text-xs text-emerald-300 mt-1">{percentualMeta.toFixed(1)}% da meta</p></div>
        <div className="bg-purple-900 p-5 rounded-xl border border-purple-700"><p className="text-xs text-purple-200 mb-1">Pendentes</p><p className="text-2xl font-bold text-white">{formatarMoeda(pendenteAno)}</p></div>
        <div className="bg-orange-900 p-5 rounded-xl border border-orange-700"><p className="text-xs text-orange-200 mb-1">Faltando</p><p className="text-2xl font-bold text-white">{formatarMoeda(faltandoMeta)}</p></div>
      </div>
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <p className="text-sm font-semibold text-slate-400 mb-1">Carteira</p>
        <div className="flex items-center gap-2 mb-3"><select value={mesCarteira} onChange={e=>setMesCarteira(parseInt(e.target.value))} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none">{mesesNomes.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-slate-400 text-xs">Ativos</p><p className="text-white font-bold text-xl">{carteiraAtivos}</p></div>
          <div><p className="text-slate-400 text-xs">Cotas</p><p className="text-white font-bold text-xl">{totalCotas}</p></div>
          <div><p className="text-slate-400 text-xs">Total vendido</p><p className="text-white font-semibold">{formatarMoeda(totalVendido)}</p></div>
        </div>
        <div className="mt-4"><p className="text-slate-400 text-xs">Vendido em {mesesNomes[mesCarteira-1]}</p><p className="text-emerald-400 font-semibold">{formatarMoeda(vendidoMes)}</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="text-sm font-semibold text-white mb-4">Meta vs Faturado</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:"Faturado",value:faturadoAno},{name:"Falta",value:faltandoMeta}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{[0,1].map(i=><Cell key={i} fill={i===0?"#10b981":"#f97316"}/>)}</Pie><Tooltip formatter={(v:any)=>formatarMoeda(v)}/><Legend/></PieChart></ResponsiveContainer></div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="text-sm font-semibold text-white mb-4">Por Administradora</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={distribuicaoAdmin} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{distribuicaoAdmin.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>
      </div>
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="text-sm font-semibold text-white mb-4">Previsão {anoSelecionado}</h3><ResponsiveContainer width="100%" height={250}><LineChart data={dadosPrevisao}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="mes" stroke="#94a3b8" tick={{fontSize:11}}/><YAxis stroke="#94a3b8" tick={{fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={(v:any)=>formatarMoeda(v)} contentStyle={{backgroundColor:"#1e293b",border:"1px solid #475569"}}/><Legend/><Line type="monotone" dataKey="recebido" stroke="#10b981" strokeWidth={2} name="Recebido"/><Line type="monotone" dataKey="previsto" stroke="#f59e0b" strokeWidth={2} name="Previsto"/></LineChart></ResponsiveContainer></div>
    </div>
  );

  const renderClientes = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>{setEditandoCliente(null);setNovoCliente(clienteVazioReal);setMostrarFormCliente(!mostrarFormCliente);}} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"><Plus className="w-4 h-4"/> Novo Cliente</button>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-sm">
          {processandoImportacao?<Loader className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}
          {processandoImportacao?"Processando...":"Importar do PDF"}
          <input type="file" accept="application/pdf" onChange={handleUploadImportacao} className="hidden" disabled={processandoImportacao}/>
        </label>
      </div>

      {importacaoClientes && (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-white text-lg">📥 Importar Clientes ({importacaoClientes.clientes.length} encontrados)</h3><button onClick={()=>setImportacaoClientes(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
          {importacaoClientes.clientes.some((c:any)=>c.duplicado)&&<div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-4"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-yellow-400"/><h4 className="font-bold text-yellow-300">{importacaoClientes.clientes.filter((c:any)=>c.duplicado).length} possível(is) duplicata(s) detectada(s)</h4></div><p className="text-yellow-200 text-sm">Esses clientes foram desmarcados automaticamente. Revise antes de importar.</p></div>}
          <div className="flex gap-3 mb-4"><button onClick={confirmarImportacao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">✓ Importar {importacaoClientes.clientes.filter((c:any)=>c.selecionado).length} Clientes</button><button onClick={()=>setImportacaoClientes(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Cancelar</button></div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700"><tr><th className="px-3 py-2 text-left"><input type="checkbox" checked={importacaoClientes.clientes.every((c:any)=>c.selecionado)} onChange={e=>setImportacaoClientes({...importacaoClientes,clientes:importacaoClientes.clientes.map((c:any)=>({...c,selecionado:e.target.checked}))})} className="w-4 h-4 accent-emerald-500"/></th>{["Nome","Tipo","Admin","Crédito","Parcela","Grupo","Cotas","Comissão/mês","Status"].map(h=><th key={h} className="px-3 py-2 text-left text-slate-300 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700">{importacaoClientes.clientes.map((cliente:any,idx:number)=>(
                <tr key={idx} className={`transition-colors ${cliente.duplicado?'bg-yellow-900/10 hover:bg-yellow-900/20':'hover:bg-slate-700'}`}>
                  <td className="px-3 py-3"><input type="checkbox" checked={cliente.selecionado} onChange={e=>{const nc=[...importacaoClientes.clientes];nc[idx].selecionado=e.target.checked;setImportacaoClientes({...importacaoClientes,clientes:nc});}} className="w-4 h-4 accent-emerald-500"/></td>
                  <td className="px-3 py-3 font-semibold text-white"><div>{cliente.nome}</div>{cliente.duplicado&&<div className="flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0"/><span className="text-yellow-400 text-xs">{cliente.motivoDuplicata}</span></div>}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${cliente.tipo==='Lead'?'bg-blue-900 text-blue-300':'bg-emerald-900 text-emerald-300'}`}>{cliente.tipo}</span></td>
                  <td className="px-3 py-3 text-slate-300">{cliente.admin}</td><td className="px-3 py-3 text-slate-300">{formatarMoeda(cliente.valorCredito)}</td><td className="px-3 py-3 text-slate-400">{cliente.parcela}/10</td><td className="px-3 py-3 text-slate-400">{cliente.grupo}</td><td className="px-3 py-3 text-slate-400">{cliente.cotas.length} ({cliente.cotas.join(', ')})</td><td className="px-3 py-3 font-bold text-emerald-400">{formatarMoeda(cliente.valorTotal)}</td>
                  <td className="px-3 py-3">{cliente.duplicado?<span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-900 text-yellow-300">⚠ Duplicata</span>:<span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-900 text-emerald-300">✓ Novo</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {importacaoClientes.estornos.length>0&&<div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4"><div className="flex items-center justify-between mb-3"><h4 className="font-bold text-red-300 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>Estornos Detectados ({importacaoClientes.estornos.length})</h4>{!importacaoClientes.estornosAplicados?<button onClick={aplicarEstornos} className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">⚡ Aplicar Estornos</button>:<span className="flex items-center gap-1 text-emerald-400 text-sm font-semibold"><CheckCircle className="w-4 h-4"/> Estornos aplicados</span>}</div><p className="text-red-200 text-xs mb-3">Ao aplicar, as parcelas pendentes serão marcadas como <strong>"Estornado"</strong> e o cliente como <strong>"Cancelado"</strong>.</p><div className="space-y-1 text-sm text-red-200">{importacaoClientes.estornos.map((est:any,idx:number)=><div key={idx} className="flex items-center gap-2"><span>•</span><span className="font-semibold">{est.nome}</span><span className="text-red-400">— Grupo {est.grupo} Cota {est.cota} — {formatarMoeda(est.valorComissao)}</span></div>)}</div></div>}
          <div className="flex gap-3"><button onClick={confirmarImportacao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">✓ Importar {importacaoClientes.clientes.filter((c:any)=>c.selecionado).length} Clientes</button><button onClick={()=>setImportacaoClientes(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Cancelar</button></div>
        </div>
      )}

      {mostrarFormCliente && !editandoCliente && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-5 text-base">Cadastrar Novo Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[{label:"Nome Completo *",field:"nomeCompleto",type:"text",placeholder:"João da Silva Santos"},{label:"Email",field:"email",type:"email",placeholder:"joao@email.com"},{label:"Telefone",field:"telefone",type:"text",placeholder:"11999999999"},{label:"Data Aquisição",field:"dataAquisicao",type:"date",placeholder:""},{label:"Valor (R$) *",field:"valor",type:"number",placeholder:"50000"},{label:"Data 1ª Parcela *",field:"dataPrimeiraParcela",type:"date",placeholder:""},{label:"Data 2ª Parcela *",field:"dataSegundaParcela",type:"date",placeholder:""}].map(({label,field,type,placeholder})=>(
              <div key={field}><label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label><input type={type} placeholder={placeholder} value={(novoCliente as any)[field]} onChange={e=>setNovoCliente({...novoCliente,[field]:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/></div>
            ))}
            <div><label className="block text-xs font-semibold text-slate-400 mb-1">Tipo *</label><select value={novoCliente.tipo} onChange={e=>setNovoCliente({...novoCliente,tipo:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">{configuracoes.tiposComissao.map(tc=><option key={tc.id} value={tc.nome}>{tc.nome} ({tc.percentual}%)</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1">Administradora *</label><select value={novoCliente.admin} onChange={e=>setNovoCliente({...novoCliente,admin:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm"><option>Âncora</option><option>Magalu</option></select></div>
            <div><label className="block text-xs font-semibold text-slate-400 mb-1">Parcelas *</label><select value={novoCliente.parcelasComissao} onChange={e=>setNovoCliente({...novoCliente,parcelasComissao:parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">{[3,4,5,6,7,8,9,10,12].map(n=><option key={n} value={n}>{n} parcelas</option>)}</select></div>
          </div>
          {novoCliente.valor&&novoCliente.tipo&&<div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-600 mb-4 text-sm flex gap-4"><span className="text-slate-400">Comissão total: <span className="font-bold text-emerald-400">{formatarMoeda(parseFloat(novoCliente.valor||"0")*(obterPercentualComissao(novoCliente.tipo)/100))}</span></span><span className="text-slate-400">Por parcela: <span className="font-bold text-emerald-300">{formatarMoeda(parseFloat(novoCliente.valor||"0")*(obterPercentualComissao(novoCliente.tipo)/100)/novoCliente.parcelasComissao)}</span></span></div>}
          <div className="border-t border-slate-600 pt-4 mb-4">
            <h4 className="font-semibold text-white mb-3 text-sm">Alocar em Grupos *</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {grupos.map(grupo=>{const ga=novoCliente.gruposCotas.find((gc:any)=>gc.grupoId===grupo.id);return(<div key={grupo.id} className="bg-slate-900 p-3 rounded-lg border border-slate-600"><label className="flex items-center gap-2 mb-2 cursor-pointer"><input type="checkbox" checked={!!ga} onChange={e=>{if(e.target.checked)setNovoCliente({...novoCliente,gruposCotas:[...novoCliente.gruposCotas,{grupoId:grupo.id,numeroGrupo:grupo.numeroGrupo,quantidadeCotas:0,cotas:[]}]});else setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.filter((gc:any)=>gc.grupoId!==grupo.id)});}} className="w-4 h-4 accent-emerald-500"/><span className="text-sm font-semibold text-slate-300">Grupo {grupo.numeroGrupo} <span className="text-slate-500 font-normal">({grupo.admin})</span></span></label>{ga&&<div className="ml-6 space-y-2"><input placeholder="Qtd cotas" type="number" min="1" value={ga.quantidadeCotas||""} onChange={e=>{const qtd=parseInt(e.target.value)||0;setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.map((gc:any)=>gc.grupoId===grupo.id?{...gc,quantidadeCotas:qtd,cotas:Array(qtd).fill("")}:gc)});}} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none"/>{ga.quantidadeCotas>0&&<div className="grid grid-cols-4 gap-2">{Array.from({length:ga.quantidadeCotas}).map((_,idx)=><input key={idx} placeholder={`Cota ${idx+1}`} type="number" value={ga.cotas[idx]||""} onChange={e=>{setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.map((gc:any)=>{if(gc.grupoId!==grupo.id)return gc;const nc=[...gc.cotas];nc[idx]=parseInt(e.target.value)||"";return{...gc,cotas:nc};})});}} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none"/>)}</div>}</div>}</div>);})}
              {grupos.length===0&&<p className="text-slate-400 text-sm">Nenhum grupo. Adicione em Configurações.</p>}
            </div>
          </div>
          <div className="flex gap-2"><button onClick={salvarCliente} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors">Cadastrar</button><button onClick={()=>{setMostrarFormCliente(false);setNovoCliente(clienteVazioReal);}} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm">Cancelar</button></div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700"><tr>{["Cliente","Tipo","Admin","Valor","Status","1ª Parcela","Ações"].map(h=><th key={h} className="px-4 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-700">
              {clientes.length===0?<tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum cliente cadastrado</td></tr>:clientes.map(c=>(
                <>
                  <tr key={c.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{c.nomeCompleto}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${c.tipo==="Lead"?"bg-blue-900 text-blue-300":"bg-emerald-900 text-emerald-300"}`}>{c.tipo}</span></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.admin}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatarMoeda(parseFloat(c.valor||0))}</td>
                    <td className="px-4 py-3"><select value={c.status} onChange={e=>atualizarStatusCliente(c.id,e.target.value)} className={`px-2 py-1 rounded text-xs font-semibold border focus:outline-none cursor-pointer ${c.status==="Ativo"?"bg-emerald-900 border-emerald-700 text-emerald-200":c.status==="Cancelado"?"bg-red-900 border-red-700 text-red-200":"bg-orange-900 border-orange-700 text-orange-200"}`}><option value="Ativo">Ativo</option><option value="Cancelado">Cancelado</option><option value="Inadimplente">Inadimplente</option></select></td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(c.dataPrimeiraParcela+"T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2 justify-center"><button onClick={()=>abrirEdicaoCliente(c)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Editar"><Edit2 className="w-4 h-4"/></button><button onClick={()=>deletarCliente(c.id)} className="text-red-500 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="w-4 h-4"/></button></div></td>
                  </tr>
                  {editandoCliente&&editandoCliente.id===c.id&&(
                    <tr key={`edit-${c.id}`}><td colSpan={7} className="px-4 py-4 bg-slate-900 border-t-2 border-emerald-600">
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="font-bold text-white mb-5 text-base flex items-center gap-2"><Edit2 className="w-4 h-4"/> Editando: {c.nomeCompleto}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {[{label:"Nome Completo *",field:"nomeCompleto",type:"text",placeholder:"João da Silva Santos"},{label:"Email",field:"email",type:"email",placeholder:"joao@email.com"},{label:"Telefone",field:"telefone",type:"text",placeholder:"11999999999"},{label:"Data Aquisição",field:"dataAquisicao",type:"date",placeholder:""},{label:"Valor (R$) *",field:"valor",type:"number",placeholder:"50000"},{label:"Data 1ª Parcela *",field:"dataPrimeiraParcela",type:"date",placeholder:""},{label:"Data 2ª Parcela *",field:"dataSegundaParcela",type:"date",placeholder:""}].map(({label,field,type,placeholder})=>(
                            <div key={field}><label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label><input type={type} placeholder={placeholder} value={(novoCliente as any)[field]} onChange={e=>setNovoCliente({...novoCliente,[field]:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/></div>
                          ))}
                          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Tipo *</label><select value={novoCliente.tipo} onChange={e=>setNovoCliente({...novoCliente,tipo:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">{configuracoes.tiposComissao.map(tc=><option key={tc.id} value={tc.nome}>{tc.nome} ({tc.percentual}%)</option>)}</select></div>
                          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Administradora *</label><select value={novoCliente.admin} onChange={e=>setNovoCliente({...novoCliente,admin:e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm"><option>Âncora</option><option>Magalu</option></select></div>
                          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Parcelas *</label><select value={novoCliente.parcelasComissao} onChange={e=>setNovoCliente({...novoCliente,parcelasComissao:parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm">{[3,4,5,6,7,8,9,10,12].map(n=><option key={n} value={n}>{n} parcelas</option>)}</select></div>
                        </div>
                        {novoCliente.valor&&novoCliente.tipo&&<div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-600 mb-4 text-sm flex gap-4"><span className="text-slate-400">Comissão total: <span className="font-bold text-emerald-400">{formatarMoeda(parseFloat(novoCliente.valor||"0")*(obterPercentualComissao(novoCliente.tipo)/100))}</span></span><span className="text-slate-400">Por parcela: <span className="font-bold text-emerald-300">{formatarMoeda(parseFloat(novoCliente.valor||"0")*(obterPercentualComissao(novoCliente.tipo)/100)/novoCliente.parcelasComissao)}</span></span></div>}
                        <div className="border-t border-slate-600 pt-4 mb-4">
                          <h4 className="font-semibold text-white mb-3 text-sm">Alocar em Grupos *</h4>
                          {grupos.filter(g=>g.admin===novoCliente.admin).map(g=>{const alocacao=novoCliente.gruposCotas.find((gc:any)=>gc.grupoId===g.id)||{quantidadeCotas:0,cotas:[]};const isChecked=!!novoCliente.gruposCotas.find((gc:any)=>gc.grupoId===g.id);return<div key={g.id} className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-600"><label className="flex items-center gap-2 mb-2 cursor-pointer"><input type="checkbox" checked={isChecked} onChange={e=>{if(e.target.checked)setNovoCliente({...novoCliente,gruposCotas:[...novoCliente.gruposCotas,{grupoId:g.id,numeroGrupo:g.numeroGrupo,quantidadeCotas:1,cotas:[]}]});else setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.filter((gc:any)=>gc.grupoId!==g.id)});}} className="w-4 h-4 accent-emerald-500"/><span className="text-white font-semibold text-sm">Grupo {g.numeroGrupo} ({g.admin})</span></label>{isChecked&&<><div className="flex gap-2 items-center mb-2"><label className="text-xs text-slate-400">Quantidade:</label><input type="number" min="1" value={alocacao.quantidadeCotas} onChange={e=>{const nc=Array(parseInt(e.target.value)||0).fill(null);alocacao.cotas.forEach((num:number,i:number)=>{if(i<nc.length)nc[i]=num;});setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.map((gc:any)=>gc.grupoId===g.id?{...gc,quantidadeCotas:parseInt(e.target.value)||0,cotas:nc}:gc)});}} className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:border-emerald-500 focus:outline-none"/></div><div className="grid grid-cols-4 gap-2">{Array.from({length:alocacao.quantidadeCotas}).map((_,i)=><div key={i}><label className="text-xs text-slate-500">Cota {i+1}:</label><input type="number" placeholder="000" value={alocacao.cotas[i]||""} onChange={e=>{const nc=[...alocacao.cotas];nc[i]=parseInt(e.target.value)||null;setNovoCliente({...novoCliente,gruposCotas:novoCliente.gruposCotas.map((gc:any)=>gc.grupoId===g.id?{...gc,cotas:nc}:gc)});}} className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:border-emerald-500 focus:outline-none"/></div>)}</div></>}</div>;})}
                        </div>
                        <div className="flex gap-3"><button onClick={salvarCliente} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm">✓ Salvar</button><button onClick={()=>{setEditandoCliente(null);setNovoCliente(clienteVazioReal);}} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm">Cancelar</button></div>
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCotas = () => {
    const grupoAtual = grupos.find(g=>g.id===grupoFiltrado);
    if (!grupoAtual) return <div className="text-center py-8 text-slate-400">Selecione um grupo</div>;
    const cotasAlocadas: any = {};
    clientes.forEach(c=>{if(c.status==="Cancelado")return;c.gruposCotas?.find((gc:any)=>gc.grupoId===grupoAtual.id)?.cotas?.forEach((num:number)=>{if(num)cotasAlocadas[num]=c.nomeCompleto;});});
    const cotasOrdenadas = Object.keys(cotasAlocadas).map(Number).sort((a,b)=>a-b);
    return (
      <div className="space-y-4">
        <div><label className="block font-semibold text-white mb-2 text-sm">Filtrar Grupo:</label><select value={grupoFiltrado} onChange={e=>setGrupoFiltrado(parseInt(e.target.value))} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-semibold focus:border-emerald-500 focus:outline-none">{grupos.map(g=><option key={g.id} value={g.id}>Grupo {g.numeroGrupo} ({g.admin})</option>)}</select></div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white">{grupoAtual.admin} — Grupo {grupoAtual.numeroGrupo}</h3>
          {grupoAtual.observacoes&&<p className="text-xs text-slate-400 mb-2">{grupoAtual.observacoes}</p>}
          <div className="inline-block bg-slate-900 px-4 py-2 rounded-lg border border-slate-600 mb-4"><span className="text-slate-400 text-sm">Cotas alocadas: </span><span className="text-2xl font-bold text-emerald-400">{cotasOrdenadas.length}</span></div>
          {cotasOrdenadas.length>0?<><div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">{cotasOrdenadas.map(num=><div key={num} className="relative group p-2 rounded text-center font-bold text-sm bg-emerald-900 text-emerald-300 border border-emerald-700 hover:bg-emerald-800 cursor-default transition-colors">{num}<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">{cotasAlocadas[num]}</div></div>)}</div><div className="bg-slate-900 p-4 rounded-lg border border-slate-600"><h4 className="font-bold text-white mb-3 text-sm">Por Cliente:</h4>{[...new Set(Object.values(cotasAlocadas))].map((nome:any)=><div key={nome} className="p-2 bg-slate-800 rounded border border-slate-600 mb-2"><p className="font-bold text-sm text-slate-300">{nome}</p><p className="text-xs text-slate-400">Cotas: {cotasOrdenadas.filter(c=>cotasAlocadas[c]===nome).join(", ")}</p></div>)}</div></>:<div className="bg-slate-900 p-6 rounded text-center border border-slate-600"><p className="text-slate-400 font-semibold">Nenhuma cota alocada</p></div>}
        </div>
      </div>
    );
  };

  const renderComissoes = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-white">Comissões</h2>
        <select value={mesFiltro} onChange={e=>setMesFiltro(parseInt(e.target.value))} className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none">{mesesNomes.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer">
          {processandoPDF?<Loader className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}
          {processandoPDF?"Processando...":"Conferir Relatório PDF"}
          <input type="file" accept="application/pdf" onChange={handleUploadPDF} className="hidden" disabled={processandoPDF}/>
        </label>
      </div>

      {validacaoPDF&&(
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-4">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-white text-lg">📊 Resultado da Conferência</h3><button onClick={()=>setValidacaoPDF(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
          <div className="space-y-2">{validacaoPDF.map((item:any,idx:number)=><div key={idx} className={`p-4 rounded-lg border-2 ${item.status==='ok'?'bg-emerald-900/20 border-emerald-700':item.status==='divergente'?'bg-yellow-900/20 border-yellow-700':'bg-red-900/20 border-red-700'}`}><div className="flex items-start justify-between gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-2">{item.status==='ok'&&<span className="text-2xl">🟢</span>}{item.status==='divergente'&&<span className="text-2xl">🟡</span>}{item.status==='faltando'&&<span className="text-2xl">🔴</span>}<p className="font-bold text-white">{item.cliente}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-400">Cadastrado:</p><p className="font-bold text-white">{formatarMoeda(item.valorCadastrado)}</p></div><div><p className="text-slate-400">No PDF:</p><p className={`font-bold ${item.status==='ok'?'text-emerald-400':item.status==='divergente'?'text-yellow-400':'text-red-400'}`}>{item.valorPDF?formatarMoeda(item.valorPDF):'NÃO ENCONTRADO'}</p></div></div></div><div className={`px-3 py-1 rounded-lg text-sm font-semibold ${item.status==='ok'?'bg-emerald-700 text-emerald-100':item.status==='divergente'?'bg-yellow-700 text-yellow-100':'bg-red-700 text-red-100'}`}>{item.status==='ok'&&'✓ CONFERIDO'}{item.status==='divergente'&&'⚠ DIVERGENTE'}{item.status==='faltando'&&'✗ FALTANDO'}</div></div></div>)}</div>
          <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-600"><p className="text-xs text-slate-400">💡 <strong>Importante:</strong> Esta conferência é apenas visual. Marque as parcelas como "Recebido" manualmente quando o pagamento for efetivado.</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-emerald-900 p-4 rounded-xl border border-emerald-700"><p className="text-sm text-emerald-200">Recebido {mesesNomes[mesFiltro-1]}</p><p className="text-2xl font-bold text-white">{formatarMoeda(totalRecebidoMes)}</p></div>
        <div className="bg-orange-900 p-4 rounded-xl border border-orange-700"><p className="text-sm text-orange-200">Pendente {mesesNomes[mesFiltro-1]}</p><p className="text-2xl font-bold text-white">{formatarMoeda(totalPendenteMes)}</p></div>
      </div>

      <div className="space-y-3">
        {comissoesMes.map(com=>(
          <div key={com.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="mb-3"><p className="font-bold text-white">{com.cliente}</p><p className="text-sm text-slate-400">{com.tipo} • {com.admin} • Total: {formatarMoeda(com.comissaoTotal)}</p></div>
            <div className="space-y-2">
              {com.parcelas_detalhes.filter((p:any)=>new Date(p.data).getMonth()+1===mesFiltro&&new Date(p.data).getFullYear()===anoSelecionado).map((parcela:any)=>(
                <div key={parcela.numero} className={`flex justify-between items-center p-3 rounded-lg border ${parcela.status==="Estornado"?"bg-red-900/20 border-red-700":"bg-slate-900 border-slate-600"}`}>
                  <div>
                    <p className="text-white font-semibold">Parcela {parcela.numero}</p>
                    <p className="text-sm text-slate-400">{new Date(parcela.data+"T12:00:00").toLocaleDateString('pt-BR')} • {formatarMoeda(parcela.valor)}</p>
                    {parcela.status==="Recebido"&&parcela.dataRecebimento&&<p className="text-xs text-emerald-400 mt-1">Recebido em {new Date(parcela.dataRecebimento+"T12:00:00").toLocaleDateString('pt-BR')}</p>}
                    {parcela.status==="Estornado"&&<p className="text-xs text-red-400 mt-1 font-semibold">⚠ Estornado</p>}
                  </div>
                  {parcela.status==="Estornado"?(
                    <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-900 text-red-300 border border-red-700">Estornado</span>
                  ):parcela.status==="Recebido"?(
                    <button onClick={()=>desmarcarRecebimento(com.id,parcela.numero)} className="px-4 py-2 rounded-lg font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white">Recebido</button>
                  ):(
                    <button onClick={()=>abrirModalRecebimento(com.id,parcela.numero)} className="px-4 py-2 rounded-lg font-semibold transition-colors bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300">Marcar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRelatorio = () => {
    const comissoesDoMes = comissoes.reduce((t,c)=>{if(clientes.find((cl:any)=>cl.id===c.clienteId)?.status==="Cancelado")return t;return t+c.parcelas_detalhes.filter((p:any)=>new Date(p.data).getMonth()+1===mesRelatorio).reduce((s:number,p:any)=>s+p.valor,0);},0);
    return (
      <div className="space-y-5">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700"><label className="block font-semibold text-white mb-2 text-sm">Selecione um Mês:</label><select value={mesRelatorio} onChange={e=>setMesRelatorio(parseInt(e.target.value))} className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:border-emerald-500 focus:outline-none text-sm">{mesesNomes.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-600"><p className="text-slate-400 text-sm font-semibold">Comissões em {mesesNomes[mesRelatorio-1]}</p><p className="text-4xl font-bold text-white mt-1">{formatarMoeda(comissoesDoMes)}</p></div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="font-bold text-white mb-4">Previsão {anoSelecionado}</h3><ResponsiveContainer width="100%" height={280}><LineChart data={dadosRelatorio}><CartesianGrid strokeDasharray="3 3" stroke="#475569"/><XAxis dataKey="mes" stroke="#cbd5e1" tick={{fontSize:11}}/><YAxis stroke="#cbd5e1" tick={{fontSize:11}}/><Tooltip formatter={(v:any)=>formatarMoeda(v)} contentStyle={{backgroundColor:"#1e293b",border:"1px solid #475569",borderRadius:"8px",color:"#e2e8f0"}}/><Legend/><Line type="monotone" dataKey="recebido" stroke="#10b981" name="Recebidos" strokeWidth={2}/><Line type="monotone" dataKey="provisao" stroke="#f97316" name="Provisões" strokeWidth={2}/></LineChart></ResponsiveContainer></div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="font-bold text-white mb-4">Detalhamento Anual</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-900 border-b border-slate-700"><tr>{["Mês","Recebidos","Provisões","Total"].map(h=><th key={h} className="px-4 py-2 text-left text-slate-300 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-700">{dadosRelatorio.map((linha:any,idx:number)=><tr key={idx} className={`${mesRelatorio===idx+1?"bg-slate-700":"hover:bg-slate-700"} transition-colors`}><td className="px-4 py-2 font-semibold text-slate-300">{linha.mes}</td><td className="px-4 py-2 text-emerald-400">{formatarMoeda(linha.recebido)}</td><td className="px-4 py-2 text-orange-400">{formatarMoeda(linha.provisao)}</td><td className="px-4 py-2 font-bold text-white">{formatarMoeda(linha.recebido+linha.provisao)}</td></tr>)}</tbody></table></div></div>
      </div>
    );
  };

  const renderConfiguracoes = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Configurações</h2>
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700"><h3 className="font-bold text-white mb-3">Metas Anuais</h3><div className="space-y-3">{Object.keys(configuracoes.metas).map(ano=><div key={ano} className="flex items-center gap-3"><span className="text-slate-300 w-16">{ano}:</span><input type="number" value={configuracoes.metas[ano as any]} onChange={e=>atualizarConfiguracoes({...configuracoes,metas:{...configuracoes.metas,[ano]:parseFloat(e.target.value)||0}})} className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none"/></div>)}</div></div>
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Tipos de Comissão</h3>
        <button onClick={()=>{setNovoTipoComissao({nome:"",percentual:""});setEditandoTipoComissao(null);setMostrarFormTipoComissao(!mostrarFormTipoComissao);}} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-4"><Plus className="w-4 h-4"/> Novo Tipo</button>
        {mostrarFormTipoComissao&&<div className="bg-slate-900 p-4 rounded-lg border border-slate-600 mb-4"><h4 className="text-white font-semibold mb-3 text-sm">{editandoTipoComissao?"Editar":"Novo"} Tipo de Comissão</h4><div className="space-y-2 mb-3"><input placeholder="Nome do tipo" value={novoTipoComissao.nome} onChange={e=>setNovoTipoComissao({...novoTipoComissao,nome:e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/><input placeholder="Percentual (%)" type="number" step="0.1" value={novoTipoComissao.percentual} onChange={e=>setNovoTipoComissao({...novoTipoComissao,percentual:e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/></div><div className="flex gap-2"><button onClick={adicionarTipoComissao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">{editandoTipoComissao?"Salvar":"Criar"}</button><button onClick={()=>setMostrarFormTipoComissao(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm">Cancelar</button></div></div>}
        <div className="space-y-2">{configuracoes.tiposComissao.map(tc=><div key={tc.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600"><div><p className="font-semibold text-white">{tc.nome}</p><p className="text-sm text-slate-400">{tc.percentual}%</p></div><div className="flex gap-2"><button onClick={()=>{setNovoTipoComissao({nome:tc.nome,percentual:tc.percentual.toString()});setEditandoTipoComissao(tc);setMostrarFormTipoComissao(true);}} className="text-blue-400 hover:text-blue-300 transition-colors"><Edit2 className="w-4 h-4"/></button><button onClick={()=>deletarTipoComissao(tc.id)} className="text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>)}</div>
      </div>
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Grupos</h3>
        <button onClick={()=>{setNovoGrupo({numeroGrupo:"",admin:"Âncora",observacoes:""});setEditandoGrupo(null);setMostrarFormGrupo(!mostrarFormGrupo);}} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-4"><Plus className="w-4 h-4"/> Novo</button>
        {mostrarFormGrupo&&<div className="bg-slate-900 p-4 rounded-lg border border-slate-600 mb-4"><h4 className="text-white font-semibold mb-3 text-sm">{editandoGrupo?"Editar":"Criar"} Grupo</h4><div className="space-y-2 mb-3"><input placeholder="Número do grupo" value={novoGrupo.numeroGrupo} onChange={e=>setNovoGrupo({...novoGrupo,numeroGrupo:e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/><select value={novoGrupo.admin} onChange={e=>setNovoGrupo({...novoGrupo,admin:e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none text-sm"><option>Âncora</option><option>Magalu</option></select><input placeholder="Observações" value={novoGrupo.observacoes} onChange={e=>setNovoGrupo({...novoGrupo,observacoes:e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"/></div><div className="flex gap-2"><button onClick={adicionarGrupo} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">{editandoGrupo?"Salvar":"Criar"}</button><button onClick={()=>setMostrarFormGrupo(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm">Cancelar</button></div></div>}
        <div className="space-y-2">{grupos.map(g=><div key={g.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600"><div><p className="font-semibold text-white text-sm">Grupo {g.numeroGrupo}</p><p className="text-xs text-slate-400">{g.admin}{g.observacoes?` • ${g.observacoes}`:""}</p></div><div className="flex gap-2"><button onClick={()=>{setNovoGrupo({numeroGrupo:g.numeroGrupo,admin:g.admin,observacoes:g.observacoes});setEditandoGrupo(g);setMostrarFormGrupo(true);}} className="text-blue-400 hover:text-blue-300 transition-colors"><Edit2 className="w-4 h-4"/></button><button onClick={()=>deletarGrupo(g.id)} className="text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>)}</div>
      </div>
    </div>
  );

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

      {/* MODAL DE DATA DE RECEBIMENTO */}
      {modalRecebimento && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white text-lg mb-1">Confirmar Recebimento</h3>
            <p className="text-slate-400 text-sm mb-4">Informe a data em que o pagamento foi recebido. O gráfico de faturamento usará esta data.</p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Recebimento</label>
              <input
                type="date"
                value={dataRecebimentoInput}
                onChange={e => setDataRecebimentoInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-2">💡 Escolha uma data passada para lançar pagamentos atrasados sem afetar o mês atual.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmarRecebimento} disabled={!dataRecebimentoInput} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors">✓ Confirmar</button>
              <button onClick={() => setModalRecebimento(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${sidebarAberto?"w-56":"w-0"} bg-gradient-to-b from-slate-900 to-black text-white transition-all duration-300 overflow-hidden shadow-2xl border-r border-slate-800 flex-shrink-0`}>
        <div className="p-5 border-b border-slate-700"><h1 className="text-xl font-bold tracking-wide">Gestor de Comissões</h1><p className="text-xs text-slate-400 mt-0.5">Finanças</p></div>
        <nav className="p-3 space-y-1">{navItems.map(item=><button key={item.id} onClick={()=>setAbaSelecionada(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${abaSelecionada===item.id?"bg-emerald-600 text-white shadow-lg":"text-slate-300 hover:bg-slate-800"}`}><item.icon className="w-4 h-4 flex-shrink-0"/><span className="font-semibold">{item.label}</span></button>)}</nav>
        <div className="absolute bottom-4 px-3"><button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"><LogOut className="w-4 h-4"/>Sair</button></div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
          <button onClick={()=>setSidebarAberto(!sidebarAberto)} className="text-slate-400 hover:text-white transition-colors">{sidebarAberto?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}</button>
          <div className="flex items-center gap-3">
            {sincronizando&&<Cloud className="w-4 h-4 text-blue-400 animate-pulse"/>}
            <select value={anoSelecionado} onChange={e=>setAnoSelecionado(parseInt(e.target.value))} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm focus:border-emerald-500 focus:outline-none">{Object.keys(configuracoes.metas).map(ano=><option key={ano} value={ano}>{ano}</option>)}</select>
            <div className="text-right border-l border-slate-700 pl-3"><p className="text-xs text-slate-400">Usuário</p><p className="font-bold text-white text-sm">{usuario.email?.split('@')[0]}</p></div>
          </div>
        </div>

        {notificacao&&(
          <div className={`px-4 py-2 flex items-center gap-2 text-sm flex-shrink-0 ${notificacao.tipo==="success"?"bg-emerald-900 text-emerald-200":"bg-red-900 text-red-200"}`}>
            {notificacao.tipo==="success"?<CheckCircle className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}
            <span>{notificacao.msg}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            {abaSelecionada==="dashboard"&&renderDashboard()}
            {abaSelecionada==="clientes"&&renderClientes()}
            {abaSelecionada==="cotas"&&renderCotas()}
            {abaSelecionada==="comissoes"&&renderComissoes()}
            {abaSelecionada==="relatorio"&&renderRelatorio()}
            {abaSelecionada==="configuracoes"&&renderConfiguracoes()}
          </div>
        </div>
      </div>
    </div>
  );
}
