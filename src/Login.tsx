import { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      if (modo === "login") {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        await createUserWithEmailAndPassword(auth, email, senha);
      }
      onLogin();
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setErro("Usuário não encontrado");
      } else if (error.code === "auth/wrong-password") {
        setErro("Senha incorreta");
      } else if (error.code === "auth/email-already-in-use") {
        setErro("Email já cadastrado");
      } else {
        setErro("Erro: " + error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Monteo</h1>
        <p className="text-slate-400 text-center mb-8">Gestor de Comissões</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          {erro && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {carregando ? "Carregando..." : modo === "login" ? "Entrar" : "Criar Conta"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "login" ? "registro" : "login")}
          className="w-full mt-4 text-slate-400 hover:text-white text-sm transition-colors"
        >
          {modo === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Fazer login"}
        </button>
      </div>
    </div>
  );
}