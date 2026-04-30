content = open('src/App.tsx', 'r', encoding='utf-8').read() 
old = '    const g = [' 
new = '    setGrupos([]); setClientes([]); setComissoes([]); setGrupoFiltrado(0); salvarDados([], [], [], configuracoes); mostrarNotificacao("Bem-vindo! Configure seus grupos em Configuracoes.")' 
content = content.replace(old, new, 1) 
open('src/App.tsx', 'w', encoding='utf-8').write(content) 
