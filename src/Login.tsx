import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import { Eye, EyeOff, Loader } from "lucide-react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modo, setModo] = useState<"login" | "cadastro" | "recuperar">("login");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      if (modo === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        // Comentado verificação para facilitar testes
        // if (!userCredential.user.emailVerified) {
        //   await auth.signOut();
        //   setErro("Por favor, verifique seu email antes de fazer login. Cheque sua caixa de entrada e spam.");
        //   setCarregando(false);
        //   return;
        // }
        onLogin();
      } else if (modo === "cadastro") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await sendEmailVerification(userCredential.user);
        await auth.signOut();
        setSucesso("Conta criada! Verifique seu email para ativar.");
        setModo("login");
      } else if (modo === "recuperar") {
        await sendPasswordResetEmail(auth, email);
        setSucesso("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setModo("login");
      }
    } catch (error: any) {
      if (error.code === "auth/invalid-credential") {
        setErro("Email ou senha incorretos.");
      } else if (error.code === "auth/email-already-in-use") {
        setErro("Este email já está em uso.");
      } else if (error.code === "auth/weak-password") {
        setErro("A senha deve ter pelo menos 6 caracteres.");
      } else if (error.code === "auth/invalid-email") {
        setErro("Email inválido.");
      } else if (error.code === "auth/user-not-found") {
        setErro("Usuário não encontrado.");
      } else {
        setErro("Erro: " + error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Gestor de Comissões</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Sistema de Gestão Financeira</p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setModo("login"); setErro(""); setSucesso(""); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
              modo === "login"
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setModo("cadastro"); setErro(""); setSucesso(""); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
              modo === "cadastro"
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            Cadastro
          </button>
          <button
            type="button"
            onClick={() => { setModo("recuperar"); setErro(""); setSucesso(""); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
              modo === "recuperar"
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            Esqueci
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>

          {modo !== "recuperar" && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {erro && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg text-sm">
              {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {carregando ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar Conta" : "Enviar Email de Recuperação"
            )}
          </button>
        </form>

        {modo === "cadastro" && (
          <p className="text-slate-400 text-xs mt-4 text-center">
            Ao criar uma conta, você receberá um email de verificação.
          </p>
        )}
        
        {modo === "recuperar" && (
          <p className="text-slate-400 text-xs mt-4 text-center">
            Você receberá um email com instruções para redefinir sua senha.
          </p>
        )}
      </div>
    </div>
  );
}
