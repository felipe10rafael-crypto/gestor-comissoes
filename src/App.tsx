import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Menu, X, BarChart3, Users, DollarSign, Download, Settings, Edit2, AlertCircle, CheckCircle, Cloud, Loader, Grid, LogOut, Upload, FileText } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Login from "./Login";

// BUSCA FUZZY - Tolerância a erros de digitação
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
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
        matches++;
        break;
      }
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

  const clienteVazio = { nomeCompleto: "", email: "", telefone: "", tipo: "Lead", admin: "Âncora", valor: "", dataAquisicao: "", dataPrimeiraParcela: "", dataSegundaParcela: "", parcelasComissao: 5, gruposCotas: [] };
  const [novoCliente, setNovoCliente] = useState(clienteVazio);
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
      if (user) {
        carregarDadosFirebase(user.uid);
      }
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
        inicializarDados();
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao carregar", "error");
    }
  };

  const salvarDados = useCallback(async (g: any, cl: any, co: any, conf: any) => {
    if (!usuario) return;
    
    setSincronizando(true);
    try {
      const docRef = doc(db, "users", usuario.uid);
      await setDoc(docRef, {
        grupos: g,
        clientes: cl,
        comissoes: co,
        configuracoes: conf,
        ultimaSincronizacao: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao salvar", "error");
    } finally {
      setSincronizando(false);
    }
  }, [usuario]);

  const inicializarDados = useCallback(() => {
    const g = [
      { id: 1, numeroGrupo: "708", admin: "Âncora", observacoes: "Consórcio residencial" },
      { id: 2, numeroGrupo: "707", admin: "Magalu", observacoes: "Consórcio de veículo" },
    ];
    const cl = [
      { id: 1, nomeCompleto: "João Silva Santos", email: "joao@email.com", telefone: "11999999999", tipo: "Lead", admin: "Âncora", valor: 50000, dataAquisicao: "2026-01-15", dataPrimeiraParcela: "2026-01-20", dataSegundaParcela: "2026-02-20", parcelasComissao: 5, status: "Ativo", gruposCotas: [{ grupoId: 1, numeroGrupo: "708", quantidadeCotas: 5, cotas: [1,2,3,4,5] }] },
      { id: 2, nomeCompleto: "Maria Santos Oliveira", email: "maria@email.com", telefone: "11988888888", tipo: "Relacional", admin: "Magalu", valor: 80000, dataAquisicao: "2026-02-01", dataPrimeiraParcela: "2026-02-05", dataSegundaParcela: "2026-03-05", parcelasComissao: 10, status: "Ativo", gruposCotas: [{ grupoId: 2, numeroGrupo: "707", quantidadeCotas: 8, cotas: [1,2,3,4,5,6,7,8] }] },
    ];
    const co = [
      { id: 1, clienteId: 1, cliente: "João Silva Santos", tipo: "Lead", admin: "Âncora", valor: 50000, comissaoPercentual: 0.7, comissaoTotal: 350, parcelas: 5, parcelas_detalhes: [
        { numero: 1, valor: 70, data: "2026-01-20", status: "Recebido", dataRecebimento: "2026-01-22" },
        { numero: 2, valor: 70, data: "2026-02-20", status: "Recebido", dataRecebimento: "2026-02-25" },
        { numero: 3, valor: 70, data: "2026-03-20", status: "Pendente", dataRecebimento: null },
        { numero: 4, valor: 70, data: "2026-04-20", status: "Pendente", dataRecebimento: null },
        { numero: 5, valor: 70, data: "2026-05-20", status: "Pendente", dataRecebimento: null },
      ]},
      { id: 2, clienteId: 2, cliente: "Maria Santos Oliveira", tipo: "Relacional", admin: "Magalu", valor: 80000, comissaoPercentual: 1.5, comissaoTotal: 1200, parcelas: 10, parcelas_detalhes: [
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
    setGrupos(g); 
    setClientes(cl); 
    setComissoes(co); 
    setGrupoFiltrado(1);
    salvarDados(g, cl, co, configuracoes);
    mostrarNotificacao("✅ Dados iniciais carregados");
  }, [salvarDados, configuracoes]);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
    setGrupos([]);
    setClientes([]);
    setComissoes([]);
  };

  const formatarMoeda = (val: number) => "R$ " + (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const obterPercentualComissao = (tipo: string) => configuracoes.tiposComissao.find(tc => tc.nome === tipo)?.percentual || 0;
  const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const gerarParcelas = (dadosCliente: any, comissaoTotal: number) => {
    const numParcelas = parseInt(dadosCliente.parcelasComissao);
    const valorParcela = comissaoTotal / numParcelas;
    const parcelas = [];

    parcelas.push({ numero: 1, valor: valorParcela, data: dadosCliente.dataPrimeiraParcela, status: "Pendente", dataRecebimento: null });

    if (numParcelas >= 2) {
      parcelas.push({ numero: 2, valor: valorParcela, data: dadosCliente.dataSegundaParcela, status: "Pendente", dataRecebimento: null });
    }

    if (numParcelas > 2) {
      const d2 = new Date(dadosCliente.dataSegundaParcela + "T12:00:00");
      for (let i = 3; i <= numParcelas; i++) {
        const dataProxima = new Date(d2);
        dataProxima.setMonth(dataProxima.getMonth() + (i - 2));
        const ano = dataProxima.getFullYear();
        const mes = String(dataProxima.getMonth() + 1).padStart(2, '0');
        const dia = String(dataProxima.getDate()).padStart(2, '0');
        parcelas.push({ numero: i, valor: valorParcela, data: `${ano}-${mes}-${dia}`, status: "Pendente", dataRecebimento: null });
      }
    }
    return parcelas;
  };

  const salvarCliente = () => {
    if (!novoCliente.nomeCompleto || !novoCliente.valor || !novoCliente.dataAquisicao || !novoCliente.dataPrimeiraParcela || !novoCliente.dataSegundaParcela) {
      mostrarNotificacao("Preencha todos os campos obrigatórios", "error");
      return;
    }

    const valorNumerico = parseFloat(novoCliente.valor);
    const percentualComissao = obterPercentualComissao(novoCliente.tipo);
    const comissaoTotal = (valorNumerico * percentualComissao) / 100;
    const parcelasDetalhadas = gerarParcelas(novoCliente, comissaoTotal);

    if (editandoCliente) {
      const clientesAtualizados = clientes.map(c => c.id === editandoCliente.id ? { ...novoCliente, id: c.id, valor: valorNumerico, status: c.status } : c);
      const comissoesAtualizadas = comissoes.map(com => {
        if (com.clienteId === editandoCliente.id) {
          return { ...com, cliente: novoCliente.nomeCompleto, tipo: novoCliente.tipo, admin: novoCliente.admin, valor: valorNumerico, comissaoPercentual: percentualComissao, comissaoTotal, parcelas: parseInt(novoCliente.parcelasComissao), parcelas_detalhes: parcelasDetalhadas };
        }
        return com;
      });
      setClientes(clientesAtualizados);
      setComissoes(comissoesAtualizadas);
      salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
      mostrarNotificacao("Cliente atualizado");
    } else {
      const novoId = Math.max(0, ...clientes.map(c => c.id)) + 1;
      const clienteCompleto = { ...novoCliente, id: novoId, valor: valorNumerico, status: "Ativo" };
      const novaComissao = { id: Math.max(0, ...comissoes.map(c => c.id)) + 1, clienteId: novoId, cliente: novoCliente.nomeCompleto, tipo: novoCliente.tipo, admin: novoCliente.admin, valor: valorNumerico, comissaoPercentual: percentualComissao, comissaoTotal, parcelas: parseInt(novoCliente.parcelasComissao), parcelas_detalhes: parcelasDetalhadas };
      const clientesAtualizados = [...clientes, clienteCompleto];
      const comissoesAtualizadas = [...comissoes, novaComissao];
      setClientes(clientesAtualizados);
      setComissoes(comissoesAtualizadas);
      salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
      mostrarNotificacao("Cliente adicionado");
    }

    setNovoCliente(clienteVazio);
    setEditandoCliente(null);
    setMostrarFormCliente(false);
  };

  const deletarCliente = (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este cliente?")) return;
    const clientesAtualizados = clientes.filter(c => c.id !== id);
    const comissoesAtualizadas = comissoes.filter(c => c.clienteId !== id);
    setClientes(clientesAtualizados);
    setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
    mostrarNotificacao("Cliente deletado");
  };

  const atualizarStatusCliente = (id: number, status: string) => {
    const clientesAtualizados = clientes.map(c => c.id === id ? {...c, status} : c);
    setClientes(clientesAtualizados);
    salvarDados(grupos, clientesAtualizados, comissoes, configuracoes);
    mostrarNotificacao("Status atualizado");
  };

  const abrirEdicaoCliente = (cliente: any) => {
    setNovoCliente(cliente);
    setEditandoCliente(cliente);
    setMostrarFormCliente(true);
  };

  const adicionarGrupo = () => {
    if (!novoGrupo.numeroGrupo) return;
    if (editandoGrupo) {
      const gruposAtualizados = grupos.map(g => g.id === editandoGrupo.id ? { ...novoGrupo, id: g.id } : g);
      setGrupos(gruposAtualizados);
      salvarDados(gruposAtualizados, clientes, comissoes, configuracoes);
      mostrarNotificacao("Grupo atualizado");
    } else {
      const novoId = Math.max(0, ...grupos.map(g => g.id)) + 1;
      const grupoCompleto = { ...novoGrupo, id: novoId };
      const gruposAtualizados = [...grupos, grupoCompleto];
      setGrupos(gruposAtualizados);
      salvarDados(gruposAtualizados, clientes, comissoes, configuracoes);
      mostrarNotificacao("Grupo adicionado");
    }
    setNovoGrupo({ numeroGrupo: "", admin: "Âncora", observacoes: "" });
    setEditandoGrupo(null);
    setMostrarFormGrupo(false);
  };

  const deletarGrupo = (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este grupo?")) return;
    const gruposAtualizados = grupos.filter(g => g.id !== id);
    setGrupos(gruposAtualizados);
    salvarDados(gruposAtualizados, clientes, comissoes, configuracoes);
    mostrarNotificacao("Grupo deletado");
  };

  const adicionarTipoComissao = () => {
    if (!novoTipoComissao.nome || !novoTipoComissao.percentual) {
      mostrarNotificacao("Preencha nome e percentual", "error");
      return;
    }

    if (editandoTipoComissao) {
      const tiposAtualizados = configuracoes.tiposComissao.map(tc => 
        tc.id === editandoTipoComissao.id 
          ? { ...tc, nome: novoTipoComissao.nome, percentual: parseFloat(novoTipoComissao.percentual) }
          : tc
      );
      const novasConfig = { ...configuracoes, tiposComissao: tiposAtualizados };
      setConfiguracoes(novasConfig);
      salvarDados(grupos, clientes, comissoes, novasConfig);
      mostrarNotificacao("Tipo de comissão atualizado");
    } else {
      const novoId = Math.max(0, ...configuracoes.tiposComissao.map(tc => tc.id)) + 1;
      const tipoCompleto = { id: novoId, nome: novoTipoComissao.nome, percentual: parseFloat(novoTipoComissao.percentual) };
      const novasConfig = { ...configuracoes, tiposComissao: [...configuracoes.tiposComissao, tipoCompleto] };
      setConfiguracoes(novasConfig);
      salvarDados(grupos, clientes, comissoes, novasConfig);
      mostrarNotificacao("Tipo de comissão adicionado");
    }

    setNovoTipoComissao({ nome: "", percentual: "" });
    setEditandoTipoComissao(null);
    setMostrarFormTipoComissao(false);
  };

  const deletarTipoComissao = (id: number) => {
    if (configuracoes.tiposComissao.length <= 1) {
      mostrarNotificacao("Não é possível deletar. Deve ter pelo menos 1 tipo", "error");
      return;
    }
    if (!confirm("Tem certeza que deseja deletar este tipo de comissão?")) return;
    const tiposAtualizados = configuracoes.tiposComissao.filter(tc => tc.id !== id);
    const novasConfig = { ...configuracoes, tiposComissao: tiposAtualizados };
    setConfiguracoes(novasConfig);
    salvarDados(grupos, clientes, comissoes, novasConfig);
    mostrarNotificacao("Tipo de comissão deletado");
  };

  const marcarParcelaRecebida = (comissaoId: number, numeroParcela: number) => {
    const comissoesAtualizadas = comissoes.map(com => {
      if (com.id === comissaoId) {
        const parcelasAtualizadas = com.parcelas_detalhes.map((p: any) => {
          if (p.numero === numeroParcela) {
            return p.status === "Recebido" ? { ...p, status: "Pendente", dataRecebimento: null } : { ...p, status: "Recebido", dataRecebimento: new Date().toISOString().split('T')[0] };
          }
          return p;
        });
        return { ...com, parcelas_detalhes: parcelasAtualizadas };
      }
      return com;
    });
    setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientes, comissoesAtualizadas, configuracoes);
  };

  const atualizarConfiguracoes = (novasConfig: any) => {
    setConfiguracoes(novasConfig);
    salvarDados(grupos, clientes, comissoes, novasConfig);
    mostrarNotificacao("Configurações salvas");
  };

  const processarPDF = async (arquivo: File) => {
    setProcessandoPDF(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await arquivo.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        textoCompleto += pageText + '\n';
      }

      console.log('=== CONFERÊNCIA DE PDF ===');
      console.log(textoCompleto);

      // Usar mesma lógica da importação
      const comissoesPDF: any[] = [];
      
      // Procurar por sequências: Nome DD/MM/AA Valor PCL Grupo Cota % Valor
      const padraoCliente = /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+?)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,]+)\s+(\d+)\s+(\d{5,6})\s+(\d{4})\s+([\d,]+)\s+([\d,]+)/g;
      
      const inicioEstornos = textoCompleto.indexOf('Estornos');
      const fimParcelasPagas = inicioEstornos > 0 ? inicioEstornos : textoCompleto.indexOf('Recibos de Adiantamento');
      
      const secaoParcelasPagas = textoCompleto.substring(
        textoCompleto.indexOf('Parcelas Pagas'),
        fimParcelasPagas > 0 ? fimParcelasPagas : textoCompleto.length
      );
      
      console.log('=== SEÇÃO PARCELAS PAGAS ===');
      console.log(secaoParcelasPagas);
      
      let match;
      const clientesMap = new Map();
      
      while ((match = padraoCliente.exec(secaoParcelasPagas)) !== null) {
        const nome = match[1].trim();
        const valorComissao = parseFloat(match[8].replace(',', '.'));
        
        console.log('Cliente encontrado:', nome, '- R$', valorComissao);
        
        // Agrupar por cliente (somar cotas)
        if (clientesMap.has(nome)) {
          clientesMap.set(nome, clientesMap.get(nome) + valorComissao);
        } else {
          clientesMap.set(nome, valorComissao);
        }
      }
      
      // Converter Map para array
      for (const [nome, valor] of clientesMap.entries()) {
        comissoesPDF.push({ nome, valor });
        console.log('✓ Total agrupado:', nome, '= R$', valor);
      }
      
      console.log('=== COMISSÕES EXTRAÍDAS ===');
      console.log(comissoesPDF);

      // Comparar com comissões cadastradas do mês
      const comissoesDoMes = comissoesMes;
      const validacao: any[] = [];

      comissoesDoMes.forEach(com => {
        const cliente = clientes.find(c => c.id === com.clienteId);
        if (!cliente) return;

        const totalMes = com.parcelas_detalhes
          .filter((p: any) => new Date(p.data).getMonth() + 1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado)
          .reduce((sum: number, p: any) => sum + p.valor, 0);

        // BUSCA FUZZY - Encontra mesmo com pequenas diferenças
        let melhorMatch: any = null;
        let melhorSimilaridade = 0;

        for (const itemPDF of comissoesPDF) {
          const sim = calcularSimilaridade(cliente.nomeCompleto, itemPDF.nome);
          
          if (sim > melhorSimilaridade && sim >= 0.6) { // 60% de similaridade mínima
            melhorSimilaridade = sim;
            melhorMatch = itemPDF;
          }
        }

        if (!melhorMatch) {
          validacao.push({
            cliente: cliente.nomeCompleto,
            valorCadastrado: totalMes,
            valorPDF: null,
            status: 'faltando'
          });
        } else {
          const diferenca = Math.abs(totalMes - melhorMatch.valor);
          if (diferenca < 0.01) {
            validacao.push({
              cliente: cliente.nomeCompleto,
              valorCadastrado: totalMes,
              valorPDF: melhorMatch.valor,
              status: 'ok'
            });
          } else {
            validacao.push({
              cliente: cliente.nomeCompleto,
              valorCadastrado: totalMes,
              valorPDF: melhorMatch.valor,
              status: 'divergente'
            });
          }
        }
      });

      setValidacaoPDF(validacao);
      mostrarNotificacao("✅ PDF processado com sucesso!");
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      mostrarNotificacao("❌ Erro ao processar PDF", "error");
    } finally {
      setProcessandoPDF(false);
    }
  };

  const handleUploadPDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && arquivo.type === 'application/pdf') {
      processarPDF(arquivo);
    } else {
      mostrarNotificacao("Selecione um arquivo PDF válido", "error");
    }
  };

  // IMPORTAÇÃO DE CLIENTES DO PDF
  const importarClientesPDF = async (arquivo: File) => {
    setProcessandoImportacao(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await arquivo.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let textoCompleto = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        textoCompleto += pageText + '\n';
      }

      console.log('=== IMPORTAÇÃO DE CLIENTES ===');
      console.log(textoCompleto);

      // Extrair dados da tabela "Parcelas Pagas"
      const clientesExtraidos: any[] = [];
      const estornosExtraidos: any[] = [];
      
      // O PDF vem todo em uma linha gigante, precisamos encontrar os padrões
      // Procurar por sequências que tenham: Nome DD/MM/AA Valor PCL Grupo Cota % Valor
      
      // Regex para encontrar: Nome (maiúsculas) + Data + 7 campos numéricos
      const padraoCliente = /([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+?)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,]+)\s+(\d+)\s+(\d{5,6})\s+(\d{4})\s+([\d,]+)\s+([\d,]+)/g;
      
      let match;
      let emParcelasPagas = false;
      let emEstornos = false;
      
      // Detectar seções no texto
      if (textoCompleto.includes('Parcelas Pagas')) emParcelasPagas = true;
      const inicioEstornos = textoCompleto.indexOf('Estornos');
      const fimParcelasPagas = inicioEstornos > 0 ? inicioEstornos : textoCompleto.indexOf('Recibos de Adiantamento');
      
      // Extrair seção de Parcelas Pagas
      const secaoParcelasPagas = textoCompleto.substring(
        textoCompleto.indexOf('Parcelas Pagas'),
        fimParcelasPagas > 0 ? fimParcelasPagas : textoCompleto.length
      );
      
      console.log('=== SEÇÃO PARCELAS PAGAS ===');
      console.log(secaoParcelasPagas);
      
      while ((match = padraoCliente.exec(secaoParcelasPagas)) !== null) {
        const dados = {
          nome: match[1].trim(),
          dataVenda: match[2],
          valorCredito: parseFloat(match[3].replace('.', '').replace(',', '.')),
          parcela: parseInt(match[4]),
          grupo: match[5],
          cota: match[6],
          percentual: parseFloat(match[7].replace(',', '.')),
          valorComissao: parseFloat(match[8].replace(',', '.'))
        };
        
        console.log('Cliente encontrado:', dados.nome, '- R$', dados.valorComissao);
        clientesExtraidos.push(dados);
      }
      
      // Extrair seção de Estornos se existir
      if (inicioEstornos > 0) {
        const secaoEstornos = textoCompleto.substring(
          inicioEstornos,
          textoCompleto.indexOf('Recibos de Adiantamento')
        );
        
        padraoCliente.lastIndex = 0; // Reset regex
        while ((match = padraoCliente.exec(secaoEstornos)) !== null) {
          const dados = {
            nome: match[1].trim(),
            dataVenda: match[2],
            valorCredito: parseFloat(match[3].replace('.', '').replace(',', '.')),
            parcela: parseInt(match[4]),
            grupo: match[5],
            cota: match[6],
            percentual: parseFloat(match[7].replace(',', '.')),
            valorComissao: parseFloat(match[8].replace(',', '.'))
          };
          
          estornosExtraidos.push(dados);
        }
      }

      console.log('Clientes extraídos:', clientesExtraidos);
      console.log('Estornos extraídos:', estornosExtraidos);

      // Agrupar por cliente
      const clientesAgrupados = new Map();
      
      for (const item of clientesExtraidos) {
        const chave = item.nome;
        if (!clientesAgrupados.has(chave)) {
          clientesAgrupados.set(chave, {
            nome: item.nome,
            dataVenda: item.dataVenda,
            valorCredito: item.valorCredito,
            parcela: item.parcela,
            grupo: item.grupo,
            percentual: item.percentual,
            cotas: [item.cota],
            valorTotal: item.valorComissao,
            tipo: item.percentual === 0.07 ? 'Lead' : 'Relacional',
            admin: item.grupo.startsWith('006') ? 'Magalu' : 'Âncora',
            selecionado: true,
            editavel: false
          });
        } else {
          const clienteExistente = clientesAgrupados.get(chave);
          clienteExistente.cotas.push(item.cota);
          clienteExistente.valorTotal += item.valorComissao;
        }
      }

      const listaClientes = Array.from(clientesAgrupados.values());
      
      setImportacaoClientes({
        clientes: listaClientes,
        estornos: estornosExtraidos
      });
      
      mostrarNotificacao(`✅ ${listaClientes.length} clientes encontrados!`);
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao processar PDF", "error");
    } finally {
      setProcessandoImportacao(false);
    }
  };

  const handleUploadImportacao = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && arquivo.type === 'application/pdf') {
      importarClientesPDF(arquivo);
    } else {
      mostrarNotificacao("Selecione um arquivo PDF válido", "error");
    }
  };

  const confirmarImportacao = () => {
    if (!importacaoClientes) return;
    
    const clientesSelecionados = importacaoClientes.clientes.filter((c: any) => c.selecionado);
    
    if (clientesSelecionados.length === 0) {
      mostrarNotificacao("Selecione pelo menos um cliente", "error");
      return;
    }

    const novosClientes: any[] = [];
    const novasComissoes: any[] = [];
    let novoIdCliente = Math.max(0, ...clientes.map(c => c.id)) + 1;
    let novoIdComissao = Math.max(0, ...comissoes.map(c => c.id)) + 1;

    for (const clienteImport of clientesSelecionados) {
      // Criar cliente
      // Converter data: 31/01/26 → 2026-01-31
      const [dia, mes, anoAbrv] = clienteImport.dataVenda.split('/');
      const ano = `20${anoAbrv}`; // 26 → 2026
      const dataFormatada = `${ano}-${mes}-${dia}`;
      
      const cliente = {
        id: novoIdCliente,
        nomeCompleto: clienteImport.nome,
        email: "",
        telefone: "",
        tipo: clienteImport.tipo,
        admin: clienteImport.admin,
        valor: clienteImport.valorCredito,
        dataAquisicao: dataFormatada,
        dataPrimeiraParcela: dataFormatada,
        dataSegundaParcela: dataFormatada,
        parcelasComissao: 10,
        status: "Ativo",
        gruposCotas: [{
          grupoId: null,
          numeroGrupo: clienteImport.grupo,
          quantidadeCotas: clienteImport.cotas.length,
          cotas: clienteImport.cotas
        }]
      };
      
      // Criar comissão com parcelas mensais
      const comissaoTotal = clienteImport.valorTotal * 10; // Assumindo 10 parcelas
      const parcelas = [];
      
      // Data base: a data de venda do cliente
      const [anoBase, mesBase, diaBase] = dataFormatada.split('-').map(Number);
      
      for (let i = 1; i <= 10; i++) {
        // Calcular data da parcela (adicionar i-1 meses à data base)
        let mesParc = mesBase + (i - 1);
        let anoParc = anoBase;
        
        // Ajustar ano se passar de dezembro
        while (mesParc > 12) {
          mesParc -= 12;
          anoParc++;
        }
        
        // Limitar dia ao máximo do mês
        const ultimoDiaMes = new Date(anoParc, mesParc, 0).getDate();
        const diaParc = Math.min(diaBase, ultimoDiaMes);
        
        const dataParcela = `${anoParc}-${String(mesParc).padStart(2, '0')}-${String(diaParc).padStart(2, '0')}`;
        
        const status = i <= clienteImport.parcela ? "Recebido" : "Pendente";
        parcelas.push({
          numero: i,
          valor: clienteImport.valorTotal,
          data: dataParcela,
          status,
          dataRecebimento: status === "Recebido" ? new Date().toISOString().split('T')[0] : null
        });
      }
      
      const comissao = {
        id: novoIdComissao,
        clienteId: novoIdCliente,
        cliente: clienteImport.nome,
        tipo: clienteImport.tipo,
        admin: clienteImport.admin,
        valor: clienteImport.valorCredito,
        comissaoPercentual: clienteImport.percentual,
        comissaoTotal,
        parcelas: 10,
        parcelas_detalhes: parcelas
      };
      
      novosClientes.push(cliente);
      novasComissoes.push(comissao);
      novoIdCliente++;
      novoIdComissao++;
    }

    const clientesAtualizados = [...clientes, ...novosClientes];
    const comissoesAtualizadas = [...comissoes, ...novasComissoes];
    
    setClientes(clientesAtualizados);
    setComissoes(comissoesAtualizadas);
    salvarDados(grupos, clientesAtualizados, comissoesAtualizadas, configuracoes);
    
    setImportacaoClientes(null);
    mostrarNotificacao(`✅ ${clientesSelecionados.length} clientes importados!`);
  };

  const faturadoAno = useMemo(() => {
    return comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      const recebido = com.parcelas_detalhes
        .filter((p: any) => p.status === "Recebido" && p.dataRecebimento && new Date(p.dataRecebimento).getFullYear() === anoSelecionado)
        .reduce((sum: number, p: any) => sum + p.valor, 0);
      return acc + recebido;
    }, 0);
  }, [comissoes, clientes, anoSelecionado]);

  const pendenteAno = useMemo(() => {
    return comissoes.reduce((acc, com) => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
      const pendente = com.parcelas_detalhes
        .filter((p: any) => p.status === "Pendente" && new Date(p.data).getFullYear() === anoSelecionado)
        .reduce((sum: number, p: any) => sum + p.valor, 0);
      return acc + pendente;
    }, 0);
  }, [comissoes, clientes, anoSelecionado]);

  const metaAno = configuracoes.metas[anoSelecionado] || 0;
  const percentualMeta = metaAno > 0 ? (faturadoAno / metaAno) * 100 : 0;
  const faltandoMeta = Math.max(0, metaAno - faturadoAno);

  const distribuicaoTipos = useMemo(() => {
    const leads = clientes.filter(c => c.status !== "Cancelado" && c.tipo === "Lead").length;
    const relacionais = clientes.filter(c => c.status !== "Cancelado" && c.tipo === "Relacional").length;
    return [
      { name: "Leads", value: leads },
      { name: "Relacionais", value: relacionais },
    ];
  }, [clientes]);

  const distribuicaoAdmin = useMemo(() => {
    const ancora = clientes.filter(c => c.status !== "Cancelado" && c.admin === "Âncora").length;
    const magalu = clientes.filter(c => c.status !== "Cancelado" && c.admin === "Magalu").length;
    return [
      { name: "Âncora", value: ancora },
      { name: "Magalu", value: magalu },
    ];
  }, [clientes]);

  const dadosPrevisao = useMemo(() => {
    return mesesNomes.map((mes, idx) => {
      const mesNum = idx + 1;
      const recebidoMes = comissoes.reduce((acc, com) => {
        if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
        const rec = com.parcelas_detalhes
          .filter((p: any) => p.status === "Recebido" && p.dataRecebimento && new Date(p.dataRecebimento).getFullYear() === anoSelecionado && new Date(p.dataRecebimento).getMonth() + 1 === mesNum)
          .reduce((sum: number, p: any) => sum + p.valor, 0);
        return acc + rec;
      }, 0);
      const previstoMes = comissoes.reduce((acc, com) => {
        if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
        const prev = com.parcelas_detalhes
          .filter((p: any) => new Date(p.data).getFullYear() === anoSelecionado && new Date(p.data).getMonth() + 1 === mesNum)
          .reduce((sum: number, p: any) => sum + p.valor, 0);
        return acc + prev;
      }, 0);
      return { mes, recebido: recebidoMes, previsto: previstoMes };
    });
  }, [comissoes, clientes, anoSelecionado]);

  const dadosRelatorio = useMemo(() => {
    return mesesNomes.map((mes, idx) => {
      const mesNum = idx + 1;
      const recebido = comissoes.reduce((acc, com) => {
        if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
        return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Recebido" && new Date(p.data).getMonth() + 1 === mesNum && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s + p.valor, 0);
      }, 0);
      const provisao = comissoes.reduce((acc, com) => {
        if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return acc;
        return acc + com.parcelas_detalhes.filter((p: any) => p.status === "Pendente" && new Date(p.data).getMonth() + 1 === mesNum && new Date(p.data).getFullYear() === anoSelecionado).reduce((s: number, p: any) => s + p.valor, 0);
      }, 0);
      return { mes, recebido, provisao };
    });
  }, [comissoes, clientes, anoSelecionado]);

  const comissoesMes = useMemo(() => {
    return comissoes.filter(com => {
      if (clientes.find(c => c.id === com.clienteId)?.status === "Cancelado") return false;
      return com.parcelas_detalhes.some((p: any) => {
        const dataParcela = new Date(p.data);
        return dataParcela.getMonth() + 1 === mesFiltro && dataParcela.getFullYear() === anoSelecionado;
      });
    });
  }, [comissoes, clientes, mesFiltro, anoSelecionado]);

  const totalRecebidoMes = useMemo(() => {
    return comissoesMes.reduce((acc, com) => {
      const rec = com.parcelas_detalhes
        .filter((p: any) => p.status === "Recebido" && new Date(p.data).getMonth() + 1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado)
        .reduce((sum: number, p: any) => sum + p.valor, 0);
      return acc + rec;
    }, 0);
  }, [comissoesMes, mesFiltro, anoSelecionado]);

  const totalPendenteMes = useMemo(() => {
    return comissoesMes.reduce((acc, com) => {
      const pend = com.parcelas_detalhes
        .filter((p: any) => p.status === "Pendente" && new Date(p.data).getMonth() + 1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado)
        .reduce((sum: number, p: any) => sum + p.valor, 0);
      return acc + pend;
    }, 0);
  }, [comissoesMes, mesFiltro, anoSelecionado]);

  const clientesAtivos = useMemo(() => clientes.filter(c => c.status === "Ativo").length, [clientes]);
  const totalCotas = useMemo(() => {
    return clientes.reduce((acc, c) => {
      if (c.status === "Cancelado") return acc;
      const cotasCliente = c.gruposCotas?.reduce((sum: number, gc: any) => sum + (gc.quantidadeCotas || 0), 0) || 0;
      return acc + cotasCliente;
    }, 0);
  }, [clientes]);

  const carteiraAtivos = useMemo(() => {
    return clientes.filter(c => {
      if (c.status !== "Ativo") return false;
      const comissaoCliente = comissoes.find(com => com.clienteId === c.id);
      if (!comissaoCliente) return false;
      return comissaoCliente.parcelas_detalhes.some((p: any) => {
        const dataParcela = new Date(p.data);
        return dataParcela.getMonth() + 1 === mesCarteira && dataParcela.getFullYear() === anoSelecionado;
      });
    }).length;
  }, [clientes, comissoes, mesCarteira, anoSelecionado]);

  const totalVendido = useMemo(() => clientes.filter(c => c.status !== "Cancelado").reduce((acc, c) => acc + (c.valor || 0), 0), [clientes]);
  
  const vendidoMes = useMemo(() => {
    return clientes
      .filter(c => {
        if (c.status === "Cancelado") return false;
        const dataAq = new Date(c.dataAquisicao);
        return dataAq.getMonth() + 1 === mesCarteira && dataAq.getFullYear() === anoSelecionado;
      })
      .reduce((acc, c) => acc + (c.valor || 0), 0);
  }, [clientes, mesCarteira, anoSelecionado]);

  const CORES = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!usuario) {
    return <Login onLogin={() => {}} />;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Meta {anoSelecionado}</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(metaAno)}</p>
        </div>
        <div className="bg-emerald-900 p-5 rounded-xl border border-emerald-700">
          <p className="text-xs text-emerald-200 mb-1">Faturado</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(faturadoAno)}</p>
          <p className="text-xs text-emerald-300 mt-1">{percentualMeta.toFixed(1)}% da meta</p>
        </div>
        <div className="bg-purple-900 p-5 rounded-xl border border-purple-700">
          <p className="text-xs text-purple-200 mb-1">Pendentes</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(pendenteAno)}</p>
        </div>
        <div className="bg-orange-900 p-5 rounded-xl border border-orange-700">
          <p className="text-xs text-orange-200 mb-1">Faltando</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(faltandoMeta)}</p>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <p className="text-sm font-semibold text-slate-400 mb-1">Carteira</p>
        <div className="flex items-center gap-2 mb-3">
          <select value={mesCarteira} onChange={e => setMesCarteira(parseInt(e.target.value))} className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none">
            {mesesNomes.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs">Ativos</p>
            <p className="text-white font-bold text-xl">{carteiraAtivos}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Cotas</p>
            <p className="text-white font-bold text-xl">{totalCotas}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Total vendido</p>
            <p className="text-white font-semibold">{formatarMoeda(totalVendido)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-4">
          <div>
            <p className="text-slate-400 text-xs">Vendido em {mesesNomes[mesCarteira - 1]}</p>
            <p className="text-emerald-400 font-semibold">{formatarMoeda(vendidoMes)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="text-sm font-semibold text-white mb-4">Meta vs Faturado</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[{ name: "Faturado", value: faturadoAno }, { name: "Falta", value: faltandoMeta }]} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                {[{ name: "Faturado", value: faturadoAno }, { name: "Falta", value: faltandoMeta }].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#10b981" : "#f97316"} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatarMoeda(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="text-sm font-semibold text-white mb-4">Por Administradora</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distribuicaoAdmin} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                {distribuicaoAdmin.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-white mb-4">Previsão {anoSelecionado}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dadosPrevisao}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: any) => formatarMoeda(value)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
            <Legend />
            <Line type="monotone" dataKey="recebido" stroke="#10b981" strokeWidth={2} name="Recebido" />
            <Line type="monotone" dataKey="previsto" stroke="#f59e0b" strokeWidth={2} name="Previsto" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderClientes = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { setEditandoCliente(null); setNovoCliente(clienteVazio); setMostrarFormCliente(!mostrarFormCliente); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-sm">
          {processandoImportacao ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {processandoImportacao ? "Processando..." : "Importar do PDF"}
          <input type="file" accept="application/pdf" onChange={handleUploadImportacao} className="hidden" disabled={processandoImportacao} />
        </label>
      </div>

      {importacaoClientes && (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">📥 Importar Clientes ({importacaoClientes.clientes.length} encontrados)</h3>
            <button onClick={() => setImportacaoClientes(null)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BOTÕES NO TOPO */}
          <div className="flex gap-3 mb-4">
            <button onClick={confirmarImportacao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              ✓ Importar {importacaoClientes.clientes.filter((c: any) => c.selecionado).length} Clientes
            </button>
            <button onClick={() => setImportacaoClientes(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Cancelar
            </button>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left"><input type="checkbox" checked={importacaoClientes.clientes.every((c: any) => c.selecionado)} onChange={e => setImportacaoClientes({...importacaoClientes, clientes: importacaoClientes.clientes.map((c: any) => ({...c, selecionado: e.target.checked}))})} className="w-4 h-4 accent-emerald-500" /></th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Nome</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Admin</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Crédito</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Parcela</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Grupo</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Cotas</th>
                  <th className="px-3 py-2 text-left text-slate-300 font-semibold">Comissão/mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {importacaoClientes.clientes.map((cliente: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-700 transition-colors">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={cliente.selecionado} onChange={e => {
                        const novosClientes = [...importacaoClientes.clientes];
                        novosClientes[idx].selecionado = e.target.checked;
                        setImportacaoClientes({...importacaoClientes, clientes: novosClientes});
                      }} className="w-4 h-4 accent-emerald-500" />
                    </td>
                    <td className="px-3 py-3 font-semibold text-white">{cliente.nome}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${cliente.tipo === 'Lead' ? 'bg-blue-900 text-blue-300' : 'bg-emerald-900 text-emerald-300'}`}>{cliente.tipo}</span></td>
                    <td className="px-3 py-3 text-slate-300">{cliente.admin}</td>
                    <td className="px-3 py-3 text-slate-300">{formatarMoeda(cliente.valorCredito)}</td>
                    <td className="px-3 py-3 text-slate-400">{cliente.parcela}/10</td>
                    <td className="px-3 py-3 text-slate-400">{cliente.grupo}</td>
                    <td className="px-3 py-3 text-slate-400">{cliente.cotas.length} ({cliente.cotas.join(', ')})</td>
                    <td className="px-3 py-3 font-bold text-emerald-400">{formatarMoeda(cliente.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importacaoClientes.estornos.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-red-300 mb-2">⚠️ Estornos Detectados ({importacaoClientes.estornos.length})</h4>
              <div className="space-y-1 text-sm text-red-200">
                {importacaoClientes.estornos.map((est: any, idx: number) => (
                  <div key={idx}>• {est.nome} - Grupo {est.grupo} Cota {est.cota} - {formatarMoeda(est.valorComissao)}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={confirmarImportacao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              ✓ Importar {importacaoClientes.clientes.filter((c: any) => c.selecionado).length} Clientes
            </button>
            <button onClick={() => setImportacaoClientes(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mostrarFormCliente && !editandoCliente && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-5 text-base">Cadastrar Novo Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { label: "Nome Completo *", field: "nomeCompleto", type: "text", placeholder: "João da Silva Santos" },
              { label: "Email", field: "email", type: "email", placeholder: "joao@email.com" },
              { label: "Telefone", field: "telefone", type: "text", placeholder: "11999999999" },
              { label: "Data Aquisição", field: "dataAquisicao", type: "date", placeholder: "" },
              { label: "Valor (R$) *", field: "valor", type: "number", placeholder: "50000" },
              { label: "Data 1ª Parcela *", field: "dataPrimeiraParcela", type: "date", placeholder: "" },
              { label: "Data 2ª Parcela *", field: "dataSegundaParcela", type: "date", placeholder: "" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
                <input type={type} placeholder={placeholder} value={(novoCliente as any)[field]} onChange={e => setNovoCliente({ ...novoCliente, [field]: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
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
              <span className="text-slate-400">Comissão total: <span className="font-bold text-emerald-400">{formatarMoeda(parseFloat(novoCliente.valor || "0") * (obterPercentualComissao(novoCliente.tipo) / 100))}</span></span>
              <span className="text-slate-400">Por parcela: <span className="font-bold text-emerald-300">{formatarMoeda(parseFloat(novoCliente.valor || "0") * (obterPercentualComissao(novoCliente.tipo) / 100) / novoCliente.parcelasComissao)}</span></span>
            </div>
          )}

          <div className="border-t border-slate-600 pt-4 mb-4">
            <h4 className="font-semibold text-white mb-3 text-sm">Alocar em Grupos *</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {grupos.map(grupo => {
                const ga = novoCliente.gruposCotas.find((gc: any) => gc.grupoId === grupo.id);
                return (
                  <div key={grupo.id} className="bg-slate-900 p-3 rounded-lg border border-slate-600">
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="checkbox" checked={!!ga} onChange={e => {
                        if (e.target.checked) setNovoCliente({ ...novoCliente, gruposCotas: [...novoCliente.gruposCotas, { grupoId: grupo.id, numeroGrupo: grupo.numeroGrupo, quantidadeCotas: 0, cotas: [] }] });
                        else setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.filter((gc: any) => gc.grupoId !== grupo.id) });
                      }} className="w-4 h-4 accent-emerald-500" />
                      <span className="text-sm font-semibold text-slate-300">Grupo {grupo.numeroGrupo} <span className="text-slate-500 font-normal">({grupo.admin})</span></span>
                    </label>
                    {ga && (
                      <div className="ml-6 space-y-2">
                        <input placeholder="Qtd cotas" type="number" min="1" value={ga.quantidadeCotas || ""} onChange={e => {
                          const qtd = parseInt(e.target.value) || 0;
                          setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map((gc: any) => gc.grupoId === grupo.id ? { ...gc, quantidadeCotas: qtd, cotas: Array(qtd).fill("") } : gc) });
                        }} className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-emerald-500 focus:outline-none" />
                        {ga.quantidadeCotas > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: ga.quantidadeCotas }).map((_, idx) => (
                              <input key={idx} placeholder={`Cota ${idx+1}`} type="number" value={ga.cotas[idx] || ""} onChange={e => {
                                setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map((gc: any) => {
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
            <button onClick={cadastrarCliente} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors">Cadastrar</button>
            <button onClick={() => { setMostrarFormCliente(false); setNovoCliente(clienteVazio); }} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm">Cancelar</button>
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
                <>
                  <tr key={c.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{c.nomeCompleto}</td>
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
                  
                  {/* FORMULÁRIO DE EDIÇÃO INLINE */}
                  {editandoCliente && editandoCliente.id === c.id && (
                    <tr key={`edit-${c.id}`}>
                      <td colSpan={7} className="px-4 py-4 bg-slate-900 border-t-2 border-emerald-600">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                          <h3 className="font-bold text-white mb-5 text-base flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Editando: {c.nomeCompleto}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {[
                              { label: "Nome Completo *", field: "nomeCompleto", type: "text", placeholder: "João da Silva Santos" },
                              { label: "Email", field: "email", type: "email", placeholder: "joao@email.com" },
                              { label: "Telefone", field: "telefone", type: "text", placeholder: "11999999999" },
                              { label: "Data Aquisição", field: "dataAquisicao", type: "date", placeholder: "" },
                              { label: "Valor (R$) *", field: "valor", type: "number", placeholder: "50000" },
                              { label: "Data 1ª Parcela *", field: "dataPrimeiraParcela", type: "date", placeholder: "" },
                              { label: "Data 2ª Parcela *", field: "dataSegundaParcela", type: "date", placeholder: "" },
                            ].map(({ label, field, type, placeholder }) => (
                              <div key={field}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
                                <input type={type} placeholder={placeholder} value={(novoCliente as any)[field]} onChange={e => setNovoCliente({ ...novoCliente, [field]: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
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
                              <span className="text-slate-400">Comissão total: <span className="font-bold text-emerald-400">{formatarMoeda(parseFloat(novoCliente.valor || "0") * (obterPercentualComissao(novoCliente.tipo) / 100))}</span></span>
                              <span className="text-slate-400">Por parcela: <span className="font-bold text-emerald-300">{formatarMoeda(parseFloat(novoCliente.valor || "0") * (obterPercentualComissao(novoCliente.tipo) / 100) / novoCliente.parcelasComissao)}</span></span>
                            </div>
                          )}

                          <div className="border-t border-slate-600 pt-4 mb-4">
                            <h4 className="font-semibold text-white mb-3 text-sm">Alocar em Grupos *</h4>
                            {grupos.filter(g => g.admin === novoCliente.admin).map(g => {
                              const alocacao = novoCliente.gruposCotas.find((gc: any) => gc.grupoId === g.id) || { quantidadeCotas: 0, cotas: [] };
                              const isChecked = !!novoCliente.gruposCotas.find((gc: any) => gc.grupoId === g.id);
                              return (
                                <div key={g.id} className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-600">
                                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                    <input type="checkbox" checked={isChecked} onChange={e => {
                                      if (e.target.checked) {
                                        setNovoCliente({ ...novoCliente, gruposCotas: [...novoCliente.gruposCotas, { grupoId: g.id, numeroGrupo: g.numeroGrupo, quantidadeCotas: 1, cotas: [] }] });
                                      } else {
                                        setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.filter((gc: any) => gc.grupoId !== g.id) });
                                      }
                                    }} className="w-4 h-4 accent-emerald-500" />
                                    <span className="text-white font-semibold text-sm">Grupo {g.numeroGrupo} ({g.admin})</span>
                                  </label>
                                  {isChecked && (
                                    <>
                                      <div className="flex gap-2 items-center mb-2">
                                        <label className="text-xs text-slate-400">Quantidade:</label>
                                        <input type="number" min="1" value={alocacao.quantidadeCotas} onChange={e => {
                                          const novasCotas = Array(parseInt(e.target.value) || 0).fill(null);
                                          alocacao.cotas.forEach((num: number, idx: number) => { if (idx < novasCotas.length) novasCotas[idx] = num; });
                                          setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map((gc: any) => gc.grupoId === g.id ? { ...gc, quantidadeCotas: parseInt(e.target.value) || 0, cotas: novasCotas } : gc) });
                                        }} className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:border-emerald-500 focus:outline-none" />
                                      </div>
                                      <div className="grid grid-cols-4 gap-2">
                                        {Array.from({ length: alocacao.quantidadeCotas }).map((_, idx) => (
                                          <div key={idx}>
                                            <label className="text-xs text-slate-500">Cota {idx + 1}:</label>
                                            <input type="number" placeholder="000" value={alocacao.cotas[idx] || ""} onChange={e => {
                                              const novasCotas = [...alocacao.cotas];
                                              novasCotas[idx] = parseInt(e.target.value) || null;
                                              setNovoCliente({ ...novoCliente, gruposCotas: novoCliente.gruposCotas.map((gc: any) => gc.grupoId === g.id ? { ...gc, cotas: novasCotas } : gc) });
                                            }} className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:border-emerald-500 focus:outline-none" />
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-3">
                            <button onClick={salvarCliente} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm">
                              ✓ Salvar
                            </button>
                            <button onClick={() => { setEditandoCliente(null); setNovoCliente(clienteVazio); }} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
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
    const grupoAtual = grupos.find(g => g.id === grupoFiltrado);
    if (!grupoAtual) return <div className="text-center py-8 text-slate-400">Selecione um grupo</div>;
    const cotasAlocadas: any = {};
    clientes.forEach(c => {
      if (c.status === "Cancelado") return;
      c.gruposCotas?.find((gc: any) => gc.grupoId === grupoAtual.id)?.cotas?.forEach((num: number) => { if (num) cotasAlocadas[num] = c.nomeCompleto; });
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
                {[...new Set(Object.values(cotasAlocadas))].map((nome: any) => (
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

  const renderComissoes = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-white">Comissões</h2>
        <select value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))} className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
          {mesesNomes.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer">
          {processandoPDF ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {processandoPDF ? "Processando..." : "Conferir Relatório PDF"}
          <input type="file" accept="application/pdf" onChange={handleUploadPDF} className="hidden" disabled={processandoPDF} />
        </label>
      </div>


      {validacaoPDF && (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">📊 Resultado da Conferência</h3>
            <button onClick={() => setValidacaoPDF(null)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            {validacaoPDF.map((item: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${
                item.status === 'ok' ? 'bg-emerald-900/20 border-emerald-700' :
                item.status === 'divergente' ? 'bg-yellow-900/20 border-yellow-700' :
                'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.status === 'ok' && <span className="text-2xl">🟢</span>}
                      {item.status === 'divergente' && <span className="text-2xl">🟡</span>}
                      {item.status === 'faltando' && <span className="text-2xl">🔴</span>}
                      <p className="font-bold text-white">{item.cliente}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Cadastrado:</p>
                        <p className="font-bold text-white">{formatarMoeda(item.valorCadastrado)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">No PDF:</p>
                        <p className={`font-bold ${
                          item.status === 'ok' ? 'text-emerald-400' :
                          item.status === 'divergente' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {item.valorPDF ? formatarMoeda(item.valorPDF) : 'NÃO ENCONTRADO'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    item.status === 'ok' ? 'bg-emerald-700 text-emerald-100' :
                    item.status === 'divergente' ? 'bg-yellow-700 text-yellow-100' :
                    'bg-red-700 text-red-100'
                  }`}>
                    {item.status === 'ok' && '✓ CONFERIDO'}
                    {item.status === 'divergente' && '⚠ DIVERGENTE'}
                    {item.status === 'faltando' && '✗ FALTANDO'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400">💡 <strong>Importante:</strong> Esta conferência é apenas visual. Marque as parcelas como "Recebido" manualmente quando o pagamento for efetivado.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-emerald-900 p-4 rounded-xl border border-emerald-700">
          <p className="text-sm text-emerald-200">Recebido {mesesNomes[mesFiltro - 1]}</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(totalRecebidoMes)}</p>
        </div>
        <div className="bg-orange-900 p-4 rounded-xl border border-orange-700">
          <p className="text-sm text-orange-200">Pendente {mesesNomes[mesFiltro - 1]}</p>
          <p className="text-2xl font-bold text-white">{formatarMoeda(totalPendenteMes)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {comissoesMes.map(com => (
          <div key={com.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="mb-3">
              <p className="font-bold text-white">{com.cliente}</p>
              <p className="text-sm text-slate-400">{com.tipo} • {com.admin} • Total: {formatarMoeda(com.comissaoTotal)}</p>
            </div>
            <div className="space-y-2">
              {com.parcelas_detalhes
                .filter((p: any) => new Date(p.data).getMonth() + 1 === mesFiltro && new Date(p.data).getFullYear() === anoSelecionado)
                .map((parcela: any) => (
                  <div key={parcela.numero} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600">
                    <div>
                      <p className="text-white font-semibold">Parcela {parcela.numero}</p>
                      <p className="text-sm text-slate-400">{new Date(parcela.data).toLocaleDateString('pt-BR')} • {formatarMoeda(parcela.valor)}</p>
                      {parcela.status === "Recebido" && parcela.dataRecebimento && (
                        <p className="text-xs text-emerald-400 mt-1">Recebido em {new Date(parcela.dataRecebimento).toLocaleDateString('pt-BR')}</p>
                      )}
                    </div>
                    <button onClick={() => marcarParcelaRecebida(com.id, parcela.numero)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${parcela.status === "Recebido" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}>
                      {parcela.status === "Recebido" ? "Recebido" : "Marcar"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRelatorio = () => {
    const comissoesDoMes = comissoes.reduce((t, c) => {
      if (clientes.find((cl: any) => cl.id === c.clienteId)?.status === "Cancelado") return t;
      return t + c.parcelas_detalhes.filter((p: any) => new Date(p.data).getMonth() + 1 === mesRelatorio).reduce((s: number, p: any) => s + p.valor, 0);
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
              <Tooltip formatter={(v: any) => formatarMoeda(v)} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#e2e8f0" }} />
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
                {dadosRelatorio.map((linha: any, idx: number) => (
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

  const renderConfiguracoes = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Configurações</h2>
      
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Metas Anuais</h3>
        <div className="space-y-3">
          {Object.keys(configuracoes.metas).map(ano => (
            <div key={ano} className="flex items-center gap-3">
              <span className="text-slate-300 w-16">{ano}:</span>
              <input type="number" value={configuracoes.metas[ano as any]} onChange={e => atualizarConfiguracoes({ ...configuracoes, metas: { ...configuracoes.metas, [ano]: parseFloat(e.target.value) || 0 } })} className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Tipos de Comissão</h3>
        <button onClick={() => { setNovoTipoComissao({ nome: "", percentual: "" }); setEditandoTipoComissao(null); setMostrarFormTipoComissao(!mostrarFormTipoComissao); }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-4">
          <Plus className="w-4 h-4" /> Novo Tipo
        </button>
        
        {mostrarFormTipoComissao && (
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-600 mb-4">
            <h4 className="text-white font-semibold mb-3 text-sm">{editandoTipoComissao ? "Editar" : "Novo"} Tipo de Comissão</h4>
            <div className="space-y-2 mb-3">
              <input placeholder="Nome do tipo" value={novoTipoComissao.nome} onChange={e => setNovoTipoComissao({ ...novoTipoComissao, nome: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
              <input placeholder="Percentual (%)" type="number" step="0.1" value={novoTipoComissao.percentual} onChange={e => setNovoTipoComissao({ ...novoTipoComissao, percentual: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={adicionarTipoComissao} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">{editandoTipoComissao ? "Salvar" : "Criar"}</button>
              <button onClick={() => setMostrarFormTipoComissao(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {configuracoes.tiposComissao.map(tc => (
            <div key={tc.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-600">
              <div>
                <p className="font-semibold text-white">{tc.nome}</p>
                <p className="text-sm text-slate-400">{tc.percentual}%</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNovoTipoComissao({ nome: tc.nome, percentual: tc.percentual.toString() }); setEditandoTipoComissao(tc); setMostrarFormTipoComissao(true); }} className="text-blue-400 hover:text-blue-300 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deletarTipoComissao(tc.id)} className="text-red-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-3">Grupos</h3>
        <button onClick={() => { setNovoGrupo({ numeroGrupo: "", admin: "Âncora", observacoes: "" }); setEditandoGrupo(null); setMostrarFormGrupo(!mostrarFormGrupo); }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-4">
          <Plus className="w-4 h-4" /> Novo
        </button>
        
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
              <div>
                <p className="font-semibold text-white text-sm">Grupo {g.numeroGrupo}</p>
                <p className="text-xs text-slate-400">{g.admin}{g.observacoes ? ` • ${g.observacoes}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNovoGrupo({ numeroGrupo: g.numeroGrupo, admin: g.admin, observacoes: g.observacoes }); setEditandoGrupo(g); setMostrarFormGrupo(true); }} className="text-blue-400 hover:text-blue-300 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deletarGrupo(g.id)} className="text-red-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
      <div className={`${sidebarAberto ? "w-56" : "w-0"} bg-gradient-to-b from-slate-900 to-black text-white transition-all duration-300 overflow-hidden shadow-2xl border-r border-slate-800 flex-shrink-0`}>
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wide">Gestor de Comissões</h1>
          <p className="text-xs text-slate-400 mt-0.5">Finanças</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setAbaSelecionada(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${abaSelecionada === item.id ? "bg-emerald-600 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800"}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-4 px-3">
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
          <button onClick={() => setSidebarAberto(!sidebarAberto)} className="text-slate-400 hover:text-white transition-colors">
            {sidebarAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            {sincronizando && <Cloud className="w-4 h-4 text-blue-400 animate-pulse" />}
            <select value={anoSelecionado} onChange={e => setAnoSelecionado(parseInt(e.target.value))} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm focus:border-emerald-500 focus:outline-none">
              {Object.keys(configuracoes.metas).map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
            <div className="text-right border-l border-slate-700 pl-3">
              <p className="text-xs text-slate-400">Usuário</p>
              <p className="font-bold text-white text-sm">{usuario.email?.split('@')[0]}</p>
            </div>
          </div>
        </div>

        {notificacao && (
          <div className={`px-4 py-2 flex items-center gap-2 text-sm flex-shrink-0 ${notificacao.tipo === "success" ? "bg-emerald-900 text-emerald-200" : "bg-red-900 text-red-200"}`}>
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
