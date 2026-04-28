import { useState, useEffect, useCallback } from "react";
import { Menu, X, BarChart3, Users, DollarSign, Download, Settings, Grid, LogOut, AlertCircle, CheckCircle, Cloud, Loader } from "lucide-react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Login from "./Login";

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
        setConfiguracoes(dados.configuracoes || configuracoes);
        mostrarNotificacao("✅ Dados carregados");
      } else {
        inicializarDados();
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarNotificacao("❌ Erro ao carregar", "error");
    }
  };

  const salvarDadosFirebase = useCallback(async (g: any, cl: any, co: any, conf: any) => {
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
      mostrarNotificacao("☁️ Salvo");
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
    ];
    const cl = [
      { id: 1, nome: "Cliente Exemplo", email: "exemplo@email.com", telefone: "11999999999", tipo: "Lead", admin: "Âncora", valor: 50000, dataAquisicao: "2026-01-15", dataPrimeiraParcela: "2026-01-20", dataSegundaParcela: "2026-02-20", parcelasComissao: 5, status: "Ativo", gruposCotas: [] },
    ];
    const co: any[] = [];
    
    setGrupos(g);
    setClientes(cl);
    setComissoes(co);
    salvarDadosFirebase(g, cl, co, configuracoes);
    mostrarNotificacao("✅ Dados iniciais");
  }, [salvarDadosFirebase, configuracoes]);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
    setGrupos([]);
    setClientes([]);
    setComissoes([]);
  };if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!usuario) {
    return <Login onLogin={() => {}} />;
  }

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
        <div className="absolute bottom-4 left-4 right-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div><div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">Bem-vindo ao Monteo!</h2>
              <p className="text-slate-300 mb-4">Sistema de gestão de comissões online.</p>
              <div className="space-y-2 text-sm text-slate-400">
                <p>✅ Autenticação funcionando</p>
                <p>✅ Dados salvos na nuvem (Firebase)</p>
                <p>✅ Cada usuário tem seus próprios dados</p>
                <p className="mt-4 text-slate-500">Grupos: {grupos.length} | Clientes: {clientes.length} | Comissões: {comissoes.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}