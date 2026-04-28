import { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { Mail } from "lucide-react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [carregando, setCarregando] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      if (modo === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        
        // Verifica se o email foi confirmado
        if (!userCredential.user.emailVerified) {
          await auth.signOut();
          setErro("⚠️ Confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
          setCarregando(false);
          return;
        }
        
        onLogin();
      } else {
        // Criar conta
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        
        // Enviar email de verificação
        await sendEmailVerification(userCredential.user);
        
        // Fazer logout e mostrar mensagem
        await auth.signOut();
        setEmailEnviado(true);
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setErro("Usuário não encontrado");
      } else if (error.code === "auth/wrong-password") {
        setErro("Senha incorreta");
      } else if (error.code === "auth/email-already-in-use") {
        setErro("Email já cadastrado");
      } else if (error.code === "auth/weak-password") {
        setErro("Senha muito fraca (mínimo 6 caracteres)");
      } else {
        setErro("Erro: " + error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  if (emailEnviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
          <div className="bg-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifique seu email!</h2>
          <p className="text-slate-300 mb-6">
            Enviamos um link de confirmação para <strong>{email}</strong>
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Clique no link do email para ativar sua conta. Depois volte aqui e faça login.
          </p>
          <button
            onClick={() => {
              setEmailEnviado(false);
              setModo("login");
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

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
              minLength={6}
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