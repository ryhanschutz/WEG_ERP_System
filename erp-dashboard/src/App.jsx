import { useState, useEffect, useCallback } from "react";

const T = {
  azul: "#00467F", cinza: "#5A5A5A", cinzaClaro: "#F0F0F0",
  preto: "#111111", branco: "#FFFFFF",
  linha: "1px solid #00467F",
  fonte: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

const USUARIOS = [
  { usuario: "admin", senha: "1234", nome: "Ryhan Schutz",   perfil: "Gestor"     },
  { usuario: "eng",   senha: "1234", nome: "Jhulia Reichardt",       perfil: "Engenheira" },
  { usuario: "op1",   senha: "1234", nome: "Brian Fachini", perfil: "Operador"   },
];

const MACHINES_INIT = [
  { id: "MAQ_01", nome: "Torno CNC", status: "idle", temperatura: 42, pecas_boas: 0, meta: 20 },
  { id: "MAQ_02", nome: "Fresadora", status: "idle", temperatura: 38, pecas_boas: 0, meta: 15 },
];
const ESTOQUE_INIT = [
  { id: 1, produto: "Peça Tipo A",     quantidade: 120, minimo: 50  },
  { id: 2, produto: "Peça Tipo B",     quantidade: 34,  minimo: 40  },
  { id: 3, produto: "Matéria-Prima X", quantidade: 890, minimo: 200 },
];
const PLM_PRODUTOS = [
  {
    id: "PRD-001", nome: "Eixo de Transmissão A",
    material: "Aço SAE 1045", peso: "2,4 kg", tolerancia: "±0,05 mm",
    responsavel: "Lais Berndt", revisao: "Rev. 3",
    fases: [
      { nome: "Concepção",  status: "aprovado",     responsavel: "Lais Berndt",       data: "10/01/2026", obs: "Requisitos definidos com cliente." },
      { nome: "Projeto",    status: "aprovado",     responsavel: "Lais Berndt",       data: "24/01/2026", obs: "Desenho técnico homologado." },
      { nome: "Fabricação", status: "em andamento", responsavel: "Vinicius Rodrigues", data: "—",          obs: "Lote em produção na MAQ_01." },
      { nome: "Manutenção", status: "pendente",     responsavel: "—",               data: "—",          obs: "Aguardando conclusão da fabricação." },
      { nome: "Descarte",   status: "pendente",     responsavel: "—",               data: "—",          obs: "Procedimento a definir." },
    ],
  },
  {
    id: "PRD-002", nome: "Flange de Fixação B",
    material: "Alumínio 6061", peso: "0,8 kg", tolerancia: "±0,1 mm",
    responsavel: "Julia", revisao: "Rev. 1",
    fases: [
      { nome: "Concepção",  status: "aprovado",     responsavel: "Julia", data: "15/02/2026", obs: "Escopo aprovado." },
      { nome: "Projeto",    status: "em andamento", responsavel: "Julia", data: "—",          obs: "Detalhamento dimensional em progresso." },
      { nome: "Fabricação", status: "pendente",     responsavel: "—",         data: "—",          obs: "" },
      { nome: "Manutenção", status: "pendente",     responsavel: "—",         data: "—",          obs: "" },
      { nome: "Descarte",   status: "pendente",     responsavel: "—",         data: "—",          obs: "" },
    ],
  },
];
let ordCounter = 1001;

const S_LABEL = { idle:"Aguardando", produzindo:"Em produção", pausada:"Pausada", concluida:"Concluída" };
const S_COLOR = { idle:T.cinza, produzindo:"#1a7a3c", pausada:"#8a6000", concluida:T.azul };
const FASE_COLOR = { aprovado:"#1a7a3c", "em andamento":T.azul, pendente:T.cinza, reprovado:"#b91c1c" };
const FASE_BG    = { aprovado:"#f0faf4", "em andamento":"#f0f5ff", pendente:T.cinzaClaro, reprovado:"#fff0f0" };

const thS = { textAlign:"left", padding:"8px 12px", fontWeight:600,
  borderTop:`2px solid #00467F`, borderBottom:`2px solid #00467F`, fontSize:"0.85rem" };
const tdS = (x={}) => ({ padding:"8px 12px", borderBottom:"1px solid #e0e0e0", fontSize:"0.85rem", color:"#111111", ...x });

function H2({ n, children }) {
  return (
    <h2 style={{ fontFamily:T.fonte, fontSize:"1.25rem", fontWeight:700, color:T.preto,
      borderBottom:T.linha, paddingBottom:4, marginBottom:16, marginTop:0 }}>
      {n && <span style={{ color:T.azul, marginRight:8 }}>{n}.</span>}{children}
    </h2>
  );
}
function Box({ children, style }) {
  return (
    <div style={{ background:T.cinzaClaro, borderLeft:`3px solid ${T.azul}`, borderRadius:2,
      padding:"16px 20px", fontSize:"0.9rem", lineHeight:1.7, ...style }}>
      {children}
    </div>
  );
}
function Btn({ children, onClick, v="p", full }) {
  const [h, setH] = useState(false);
  const s = {
    p: { background:h?"#003560":T.azul, color:T.branco, border:`1px solid ${T.azul}` },
    s: { background:h?T.cinzaClaro:T.branco, color:T.preto, border:"1px solid #ccc" },
    d: { background:h?"#7f1d1d":T.branco, color:h?T.branco:"#b91c1c", border:"1px solid #b91c1c" },
  };
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ fontFamily:T.fonte, fontSize:"0.8rem", fontWeight:600, padding:"7px 16px",
        borderRadius:2, cursor:"pointer", transition:"background 0.15s, color 0.15s",
        width:full?"100%":"auto", ...s[v] }}>
      {children}
    </button>
  );
}
function Bar({ value, max }) {
  const p = Math.min((value/(max||1))*100,100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:4, background:"#e0e0e0", borderRadius:1 }}>
        <div style={{ width:`${p}%`, height:"100%", background:p>=100?"#1a7a3c":T.azul, transition:"width 0.4s" }} />
      </div>
      <span style={{ fontSize:"0.8rem", color:T.cinza, minWidth:32, textAlign:"right" }}>{Math.round(p)}%</span>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const fi = { width:"100%", fontFamily:T.fonte, fontSize:"0.95rem", padding:"10px 12px",
    border:"1px solid #ccc", borderRadius:2, outline:"none", background:T.branco,
    color:T.preto, boxSizing:"border-box" };
  const handle = () => {
    const found = USUARIOS.find(x=>x.usuario===u&&x.senha===p);
    found ? onLogin(found) : setErr("Usuário ou senha incorretos.");
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#f8f8f8", fontFamily:T.fonte }}>
      <div style={{ width:360, background:T.branco, borderTop:`3px solid ${T.azul}`,
        borderRadius:2, padding:40 }}>
        <p style={{ fontSize:"0.72rem", color:T.cinza, letterSpacing:"0.06em",
          textTransform:"uppercase", marginBottom:6 }}>Sistema de Gestão Industrial</p>
        <h1 style={{ fontSize:"1.6rem", fontWeight:700, letterSpacing:"-0.02em", marginBottom:4 }}>ERP · PLM</h1>
        <p style={{ fontSize:"0.9rem", color:T.cinza, marginBottom:32, lineHeight:1.5 }}>
          Identificação necessária para rastreabilidade de ações.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:"0.8rem", color:T.cinza, marginBottom:6 }}>Usuário</label>
          <input value={u} onChange={e=>{setU(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&handle()} style={fi} placeholder="ex: admin" />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:"0.8rem", color:T.cinza, marginBottom:6 }}>Senha</label>
          <input type="password" value={p} onChange={e=>{setP(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&handle()} style={fi} placeholder="••••" />
        </div>
        {err && <p style={{ fontSize:"0.8rem", color:"#b91c1c", marginBottom:16, fontWeight:600 }}>{err}</p>}
        <Btn onClick={handle} full>Entrar no sistema</Btn>
        <div style={{ marginTop:24, borderTop:"1px solid #e0e0e0", paddingTop:16 }}>
          <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:8 }}>Usuários de demonstração:</p>
          {USUARIOS.map(x=>(
            <p key={x.usuario} style={{ fontSize:"0.75rem", color:T.cinza, lineHeight:1.9 }}>
              <span style={{ fontWeight:600, color:T.preto }}>{x.usuario}</span> / 1234 — {x.nome} ({x.perfil})
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function MachineCard({ m, onCmd }) {
  const hi = m.temperatura > 70;
  return (
    <div style={{ borderBottom:"1px solid #e0e0e0", paddingBottom:20, marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
        <div>
          <span style={{ fontWeight:600, fontSize:"1rem" }}>{m.nome}</span>
          <span style={{ marginLeft:10, fontSize:"0.8rem", color:T.cinza }}>{m.id}</span>
        </div>
        <span style={{ fontSize:"0.75rem", fontWeight:600, letterSpacing:"0.04em",
          textTransform:"uppercase", color:S_COLOR[m.status]||T.cinza }}>
          ● {S_LABEL[m.status]||m.status}
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
        {[
          { l:"Peças boas",  v:m.pecas_boas,         u:"un", w:false },
          { l:"Meta",        v:m.meta,                u:"un", w:false },
          { l:"Temperatura", v:`${m.temperatura} °C`, u:"",   w:hi   },
        ].map(x=>(
          <div key={x.l} style={{ background:T.cinzaClaro, padding:"10px 14px", borderRadius:2,
            borderLeft:x.w?"3px solid #b91c1c":"3px solid transparent" }}>
            <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:4 }}>{x.l}</p>
            <p style={{ fontSize:"1.4rem", fontWeight:700, color:x.w?"#b91c1c":T.preto, lineHeight:1 }}>
              {x.v}{x.u&&<span style={{ fontSize:"0.75rem",fontWeight:400,color:T.cinza,marginLeft:4 }}>{x.u}</span>}
            </p>
          </div>
        ))}
      </div>
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:6 }}>Progresso da ordem</p>
        <Bar value={m.pecas_boas} max={m.meta} />
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {m.status==="idle"       && <Btn onClick={()=>onCmd(m.id,"iniciar")}>Iniciar produção</Btn>}
        {m.status==="produzindo" && <><Btn v="s" onClick={()=>onCmd(m.id,"pausar")}>Pausar</Btn>
                                      <Btn v="d" onClick={()=>onCmd(m.id,"encerrar")}>Encerrar</Btn></>}
        {m.status==="pausada"    && <><Btn onClick={()=>onCmd(m.id,"iniciar")}>Retomar</Btn>
                                      <Btn v="d" onClick={()=>onCmd(m.id,"encerrar")}>Encerrar</Btn></>}
        {m.status==="concluida"  && <Btn v="s" onClick={()=>onCmd(m.id,"resetar")}>Resetar máquina</Btn>}
      </div>
    </div>
  );
}

function ModalOrdem({ onClose, onSave }) {
  const [f, setF] = useState({ produto:"Peça Tipo A", quantidade:10, maquina:"MAQ_01", prioridade:"Normal" });
  const fi = { width:"100%", fontFamily:T.fonte, fontSize:"0.9rem", padding:"8px 10px",
    border:"1px solid #ccc", borderRadius:2, background:T.branco, color:T.preto,
    outline:"none", boxSizing:"border-box" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:T.branco, borderTop:`3px solid ${T.azul}`, borderRadius:2,
        padding:32, width:440, maxWidth:"90vw", fontFamily:T.fonte }}>
        <p style={{ fontSize:"0.75rem", color:T.cinza, letterSpacing:"0.06em",
          textTransform:"uppercase", marginBottom:4 }}>ERP — Produção</p>
        <h2 style={{ fontSize:"1.25rem", fontWeight:700, marginBottom:24, marginTop:0 }}>
          Nova Ordem de Produção
        </h2>
        {[
          { l:"Produto",         k:"produto",    t:"select", o:["Peça Tipo A","Peça Tipo B"] },
          { l:"Quantidade",      k:"quantidade", t:"number" },
          { l:"Máquina destino", k:"maquina",    t:"select", o:["MAQ_01","MAQ_02"] },
          { l:"Prioridade",      k:"prioridade", t:"select", o:["Normal","Alta","Urgente"] },
        ].map(x=>(
          <div key={x.k} style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:"0.8rem", color:T.cinza, marginBottom:6 }}>{x.l}</label>
            {x.t==="select"
              ? <select value={f[x.k]} onChange={e=>setF({...f,[x.k]:e.target.value})} style={fi}>
                  {x.o.map(o=><option key={o}>{o}</option>)}
                </select>
              : <input type="number" min={1} value={f[x.k]}
                  onChange={e=>setF({...f,[x.k]:Number(e.target.value)})} style={fi} />}
          </div>
        ))}
        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          <Btn v="s" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>onSave(f)}>Criar ordem</Btn>
        </div>
      </div>
    </div>
  );
}

function ModuloERP({ user, machines, setMachines, ordens, setOrdens, estoque, setEstoque, log, addLog }) {
  const [modal, setModal] = useState(false);

  // Polling de ordens e máquinas a cada 3 segundos
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [resOrdens, resMaquinas] = await Promise.all([
          fetch("/api/ordens"),
          fetch("/api/maquinas"),
        ]);
        if (resOrdens.ok)   setOrdens(await resOrdens.json());
        if (resMaquinas.ok) setMachines(await resMaquinas.json());
      } catch (e) {
        console.error("Erro no polling:", e);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [setOrdens, setMachines]);



  const handleCmd = useCallback((mid,cmd)=>{
    const map={iniciar:"produzindo",pausar:"pausada",encerrar:"concluida"};
    setMachines(p=>p.map(m=>{
      if(m.id!==mid) return m;
      if(cmd==="resetar") return {...m,status:"idle",pecas_boas:0,temperatura:38};
      return {...m,status:map[cmd]||m.status};
    }));
    const lbl={iniciar:"iniciada",pausar:"pausada",encerrar:"encerrada",resetar:"resetada"};
    addLog("info",`[${user.nome}] Comando MQTT → ${mid} ${lbl[cmd]||cmd}.`);
  },[addLog,setMachines,user]);

  const handleSave = async (f) => {
    try {
      const res = await fetch("/api/ordens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, autor: user.nome }),
      });
      if(res.ok) {
        const data = await res.json();
        addLog("info", `[${user.nome}] Ordem #${data.id} criada — ${f.quantidade}× ${f.produto} → ${f.maquina}.`);
        setMachines(p=>p.map(m=>m.id===f.maquina?{...m,meta:f.quantidade,pecas_boas:0,status:"idle"}:m));
        setModal(false);
        // Força atualização das ordens
        const resOrdens = await fetch("/api/ordens");
        if(resOrdens.ok) setOrdens(await resOrdens.json());
      }
    } catch(e) {
      addLog("error", `Erro ao criar ordem: ${e.message}`);
    }
  };

  const ativos=machines.filter(m=>m.status==="produzindo").length;
  const pecas=machines.reduce((s,m)=>s+m.pecas_boas,0);
  const alertas=log.filter(l=>l.tipo==="warning").length;

  return (
    <div>
      <section style={{ marginBottom:40 }}>
        <H2 n="1">Indicadores do turno</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            { l:"Máquinas em produção", v:ativos,       sub:`de ${machines.length}`, bl:ativos>0?T.azul:"#e0e0e0", wc:T.preto },
            { l:"Peças produzidas",     v:pecas,         sub:"no turno",              bl:"#e0e0e0",                 wc:T.preto },
            { l:"Ordens abertas",       v:ordens.length, sub:"criadas",               bl:"#e0e0e0",                 wc:T.preto },
            { l:"Alertas ativos",       v:alertas,       sub:"no log",                bl:alertas>0?"#b91c1c":"#e0e0e0", wc:alertas>0?"#b91c1c":T.preto },
          ].map(k=>(
            <div key={k.l} style={{ background:T.cinzaClaro, borderRadius:2, padding:"14px 16px",
              borderLeft:`3px solid ${k.bl}` }}>
              <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:6 }}>{k.l}</p>
              <p style={{ fontSize:"1.8rem", fontWeight:700, color:k.wc, lineHeight:1 }}>{k.v}</p>
              <p style={{ fontSize:"0.75rem", color:T.cinza, marginTop:4 }}>{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:40 }}>
        <div>
          <section style={{ marginBottom:40 }}>
            <H2 n="2">Máquinas</H2>
            <Box style={{ marginBottom:20 }}>
              Comandos publicados via MQTT (HiveMQ Cloud TLS). O ESP32 responde acionando
              servo motor e LED de status. Cada evento é persistido no Neon PostgreSQL.
            </Box>
            {machines.map(m=><MachineCard key={m.id} m={m} onCmd={handleCmd}/>)}
          </section>

          <section style={{ marginBottom:40 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <H2 n="3">Ordens de produção</H2>
              <Btn onClick={()=>setModal(true)}>+ Nova ordem</Btn>
            </div>
            {ordens.length===0
              ? <p style={{ fontSize:"0.9rem", color:T.cinza, lineHeight:1.7 }}>Nenhuma ordem criada.</p>
              : <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%" }}>
                    <thead><tr>
                      {["Nº","Produto","Qtd.","Máquina","Prioridade","Criado por","Horário"].map(h=>
                        <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {ordens.map((o,i)=>(
                        <tr key={o.id} style={{ background:i%2===1?"#fafafa":T.branco }}>
                          <td style={tdS({color:T.azul,fontWeight:600})}>#{o.id}</td>
                          <td style={tdS()}>{o.produto}</td>
                          <td style={tdS()}>{o.quantidade}</td>
                          <td style={tdS({color:T.cinza})}>{o.maquina}</td>
                          <td style={tdS({color:o.prioridade==="Urgente"?"#b91c1c":T.preto})}>{o.prioridade}</td>
                          <td style={tdS({color:T.azul,fontWeight:600})}>{o.autor}</td>
                          <td style={tdS({color:T.cinza})}>{o.ts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </section>

          <section>
            <H2 n="4">Estoque</H2>
            <table style={{ width:"100%" }}>
              <thead><tr>
                {["Produto","Quantidade","Mínimo","Situação"].map(h=><th key={h} style={thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {estoque.map((e,i)=>{
                  const low=e.quantidade<e.minimo;
                  return(
                    <tr key={e.id} style={{ background:i%2===1?"#fafafa":T.branco }}>
                      <td style={tdS()}>{e.produto}</td>
                      <td style={tdS({fontWeight:600,color:low?"#b91c1c":T.preto})}>{e.quantidade} un</td>
                      <td style={tdS({color:T.cinza})}>{e.minimo} un</td>
                      <td style={tdS()}>
                        <span style={{ fontSize:"0.75rem", fontWeight:600, color:low?"#b91c1c":"#1a7a3c" }}>
                          {low?"⚠ Abaixo do mínimo":"✓ Regular"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <aside>
          <H2>Log de eventos</H2>
          <div style={{ borderLeft:"1px solid #e0e0e0", paddingLeft:16, maxHeight:700, overflowY:"auto" }}>
            {log.map((l,i)=>(
              <div key={l.id} style={{ paddingBottom:12, marginBottom:12,
                borderBottom:i<log.length-1?"1px solid #f0f0f0":"none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:"0.7rem", fontWeight:600, letterSpacing:"0.05em",
                    textTransform:"uppercase",
                    color:l.tipo==="warning"?"#8a6000":l.tipo==="error"?"#b91c1c":T.azul }}>
                    {l.tipo}
                  </span>
                  <span style={{ fontSize:"0.75rem", color:T.cinza }}>{l.ts}</span>
                </div>
                <p style={{ fontSize:"0.82rem", lineHeight:1.5 }}>{l.msg}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {modal && <ModalOrdem onClose={()=>setModal(false)} onSave={handleSave}/>}
    </div>
  );
}

function ModuloPLM({ user, addLog }) {
  const [produtos, setProdutos] = useState(PLM_PRODUTOS);
  const [sel, setSel] = useState(PLM_PRODUTOS[0].id);
  const [editando, setEditando] = useState(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const prod = produtos.find(p=>p.id===sel);

  const abrirEdicao=(prodId,faseIdx,fase)=>{
    setEditando({prodId,faseIdx}); setNovoStatus(fase.status); setNovaObs(fase.obs);
  };
  const salvarFase=()=>{
    const {prodId,faseIdx}=editando;
    const nomeFase=produtos.find(p=>p.id===prodId).fases[faseIdx].nome;
    setProdutos(prev=>prev.map(p=>p.id!==prodId?p:{
      ...p, fases:p.fases.map((f,i)=>i!==faseIdx?f:{
        ...f, status:novoStatus, obs:novaObs,
        responsavel:user.nome, data:new Date().toLocaleDateString("pt-BR"),
      })
    }));
    addLog("info",`[${user.nome}] PLM — ${prod.nome}: fase "${nomeFase}" → "${novoStatus}".`);
    setEditando(null);
  };

  return (
    <div>
      <section style={{ marginBottom:40 }}>
        <H2 n="1">O que é PLM e como difere do ERP</H2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            { titulo:"ERP — Enterprise Resource Planning", cor:T.azul,
              itens:["Foco: recursos e operações da empresa","Pergunta: quanto custa? quem fabrica?",
                     "Dados: estoque, ordens, compras, custo","Momento: durante e após a produção"] },
            { titulo:"PLM — Product Lifecycle Management", cor:"#1a7a3c",
              itens:["Foco: o produto em si, do início ao fim","Pergunta: como fazer? o que especificar?",
                     "Dados: desenhos, revisões, materiais","Momento: antes e durante o desenvolvimento"] },
          ].map(x=>(
            <div key={x.titulo} style={{ background:T.cinzaClaro, borderLeft:`3px solid ${x.cor}`,
              borderRadius:2, padding:"16px 20px" }}>
              <p style={{ fontSize:"0.85rem", fontWeight:700, color:x.cor, marginBottom:12 }}>{x.titulo}</p>
              {x.itens.map(it=>(
                <p key={it} style={{ fontSize:"0.85rem", lineHeight:1.7 }}>— {it}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <H2 n="2">Produtos cadastrados</H2>
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {produtos.map(p=>(
            <button key={p.id} onClick={()=>setSel(p.id)}
              style={{ fontFamily:T.fonte, fontSize:"0.85rem", fontWeight:600,
                padding:"8px 18px", borderRadius:2, cursor:"pointer",
                border:p.id===sel?`2px solid ${T.azul}`:"1px solid #ccc",
                background:p.id===sel?T.azul:T.branco,
                color:p.id===sel?T.branco:T.preto, transition:"all 0.15s" }}>
              {p.id} — {p.nome}
            </button>
          ))}
        </div>

        {prod && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32 }}>
            <div>
              <p style={{ fontSize:"1rem", fontWeight:700, borderBottom:T.linha,
                paddingBottom:4, marginBottom:16 }}>Ficha Técnica</p>
              <table style={{ width:"100%" }}>
                <tbody>
                  {[["Código",prod.id],["Produto",prod.nome],["Material",prod.material],
                    ["Peso",prod.peso],["Tolerância",prod.tolerancia],
                    ["Responsável",prod.responsavel],["Revisão",prod.revisao]].map(([k,v],i)=>(
                    <tr key={k} style={{ background:i%2===1?"#fafafa":T.branco }}>
                      <td style={{ padding:"8px 12px", borderBottom:"1px solid #e0e0e0",
                        fontWeight:600, color:T.cinza, fontSize:"0.8rem", width:"40%" }}>{k}</td>
                      <td style={{ padding:"8px 12px", borderBottom:"1px solid #e0e0e0",
                        fontSize:"0.85rem" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p style={{ fontSize:"1rem", fontWeight:700, borderBottom:T.linha,
                paddingBottom:4, marginBottom:16 }}>Ciclo de Vida do Produto</p>
              <div style={{ display:"flex", alignItems:"center", marginBottom:20 }}>
                {prod.fases.map((f,i)=>(
                  <div key={f.nome} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background:FASE_BG[f.status],
                        border:`2px solid ${FASE_COLOR[f.status]||T.cinza}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.65rem", fontWeight:700,
                        color:FASE_COLOR[f.status]||T.cinza, marginBottom:4 }}>{i+1}</div>
                      <span style={{ fontSize:"0.62rem", color:T.cinza, textAlign:"center",
                        lineHeight:1.3, maxWidth:50 }}>{f.nome}</span>
                    </div>
                    {i<prod.fases.length-1&&(
                      <div style={{ height:2, width:12, background:"#e0e0e0",
                        flexShrink:0, marginBottom:18 }} />
                    )}
                  </div>
                ))}
              </div>

              {prod.fases.map((f,i)=>(
                <div key={f.nome} style={{ background:FASE_BG[f.status],
                  borderLeft:`3px solid ${FASE_COLOR[f.status]||T.cinza}`,
                  borderRadius:2, padding:"12px 14px", marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:6 }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:"0.9rem" }}>{f.nome}</span>
                      {f.data!=="—"&&(
                        <span style={{ fontSize:"0.75rem", color:T.cinza, marginLeft:10 }}>{f.data}</span>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase",
                        letterSpacing:"0.04em", color:FASE_COLOR[f.status]||T.cinza }}>{f.status}</span>
                      <button onClick={()=>abrirEdicao(prod.id,i,f)}
                        style={{ fontFamily:T.fonte, fontSize:"0.72rem", padding:"3px 8px",
                          border:`1px solid ${T.azul}`, borderRadius:2, background:T.branco,
                          color:T.azul, cursor:"pointer" }}>editar</button>
                    </div>
                  </div>
                  {f.responsavel!=="—"&&(
                    <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:4 }}>
                      Responsável: <span style={{ fontWeight:600, color:T.preto }}>{f.responsavel}</span>
                    </p>
                  )}
                  {f.obs&&<p style={{ fontSize:"0.8rem", lineHeight:1.5 }}>{f.obs}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {editando&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ background:T.branco, borderTop:"3px solid #1a7a3c", borderRadius:2,
            padding:32, width:400, maxWidth:"90vw", fontFamily:T.fonte }}>
            <p style={{ fontSize:"0.75rem", color:T.cinza, letterSpacing:"0.06em",
              textTransform:"uppercase", marginBottom:4 }}>PLM — Ciclo de Vida</p>
            <h2 style={{ fontSize:"1.1rem", fontWeight:700, marginBottom:20, marginTop:0 }}>
              Atualizar fase: {produtos.find(p=>p.id===editando.prodId)?.fases[editando.faseIdx]?.nome}
            </h2>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:"0.8rem", color:T.cinza, marginBottom:6 }}>Status</label>
              <select value={novoStatus} onChange={e=>setNovoStatus(e.target.value)}
                style={{ width:"100%", fontFamily:T.fonte, fontSize:"0.9rem", padding:"8px 10px",
                  border:"1px solid #ccc", borderRadius:2, outline:"none" }}>
                {["pendente","em andamento","aprovado","reprovado"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:"0.8rem", color:T.cinza, marginBottom:6 }}>Observação</label>
              <textarea value={novaObs} onChange={e=>setNovaObs(e.target.value)} rows={3}
                style={{ width:"100%", fontFamily:T.fonte, fontSize:"0.9rem", padding:"8px 10px",
                  border:"1px solid #ccc", borderRadius:2, outline:"none",
                  resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <p style={{ fontSize:"0.75rem", color:T.cinza, marginBottom:16 }}>
              Alteração registrada por: <span style={{ fontWeight:600, color:T.preto }}>{user.nome}</span>
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <Btn v="s" onClick={()=>setEditando(null)}>Cancelar</Btn>
              <Btn onClick={salvarFase}>Salvar alteração</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user,     setUser]     = useState(null);
  const [aba,      setAba]      = useState("erp");
  const [machines, setMachines] = useState(MACHINES_INIT);
  const [ordens,   setOrdens]   = useState([]);
  const [estoque,  setEstoque]  = useState(ESTOQUE_INIT);
  const [log,      setLog]      = useState([
    { id:1, tipo:"info",    msg:"Sistema iniciado. Aguardando autenticação.", ts:"—"    },
    { id:2, tipo:"warning", msg:"Estoque de 'Peça Tipo B' abaixo do mínimo.", ts:"—"   },
  ]);

  const addLog = useCallback((tipo,msg)=>{
    setLog(p=>[{id:Date.now(),tipo,msg,ts:new Date().toLocaleTimeString("pt-BR")},...p.slice(0,24)]);
  },[]);

  // Fetch de dados do backend quando o usuário faz login
  useEffect(()=>{
    if(!user) return;
    
    const carregarDados = async () => {
      try {
        const resMaquinas = await fetch("/api/maquinas");
        if(resMaquinas.ok) {
          const maquinas = await resMaquinas.json();
          setMachines(maquinas);
          addLog("info", "Dados de máquinas carregados do servidor.");
        }
      } catch(e) {
        addLog("warning", "Erro ao carregar máquinas: " + e.message);
      }

      try {
        const resOrdens = await fetch("/api/ordens");
        if(resOrdens.ok) {
          const ordensData = await resOrdens.json();
          setOrdens(ordensData);
          addLog("info", "Ordens carregadas do servidor.");
        }
      } catch(e) {
        addLog("warning", "Erro ao carregar ordens: " + e.message);
      }
    };

    carregarDados();
  }, [user, addLog, setMachines, setOrdens]);

  const handleLogin=(u)=>{ setUser(u); addLog("info",`[${u.nome}] Sessão iniciada — ${u.perfil}.`); };
  const handleLogout=()=>{ addLog("info",`[${user.nome}] Sessão encerrada.`); setUser(null); };

  if(!user) return <LoginScreen onLogin={handleLogin}/>;

  return(
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#f8f8f8;}
        select,input,button,textarea{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;}
        select{appearance:none;-webkit-appearance:none;cursor:pointer;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#ccc;}
        table{border-collapse:collapse;}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#f8f8f8",
        display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px 48px" }}>
        <div style={{ width:"100%", maxWidth:1100, background:T.branco,
          borderTop:`3px solid ${T.azul}`, fontFamily:T.fonte, color:T.preto }}>

          <header style={{ padding:"20px 40px", borderBottom:"1px solid #e0e0e0",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:"0.72rem", color:T.cinza, letterSpacing:"0.06em",
                textTransform:"uppercase", marginBottom:2 }}>Sistema de Gestão Industrial</p>
              <h1 style={{ fontSize:"1.4rem", fontWeight:700, letterSpacing:"-0.02em" }}>
                ERP · PLM — Chão de Fábrica
              </h1>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:"0.85rem", fontWeight:600 }}>{user.nome}</p>
                <p style={{ fontSize:"0.75rem", color:T.cinza }}>{user.perfil}</p>
              </div>
              <Btn v="s" onClick={handleLogout}>Sair</Btn>
            </div>
          </header>

          <nav style={{ borderBottom:"1px solid #e0e0e0", padding:"0 40px", display:"flex" }}>
            {[{id:"erp",label:"ERP — Produção"},{id:"plm",label:"PLM — Ciclo de Vida"}].map(a=>(
              <button key={a.id} onClick={()=>setAba(a.id)}
                style={{ fontFamily:T.fonte, fontSize:"0.85rem", fontWeight:600,
                  padding:"14px 20px", background:"none", border:"none", cursor:"pointer",
                  borderBottom:aba===a.id?`2px solid ${T.azul}`:"2px solid transparent",
                  color:aba===a.id?T.azul:T.cinza, transition:"color 0.15s", marginBottom:"-1px" }}>
                {a.label}
              </button>
            ))}
          </nav>

          <main style={{ padding:"32px 40px 48px" }}>
            {aba==="erp"
              ? <ModuloERP user={user} machines={machines} setMachines={setMachines}
                  ordens={ordens} setOrdens={setOrdens} estoque={estoque}
                  setEstoque={setEstoque} log={log} addLog={addLog}/>
              : <ModuloPLM user={user} addLog={addLog}/>
            }
          </main>

          <footer style={{ borderTop:T.linha, padding:"16px 40px" }}>
            <p style={{ fontSize:"0.75rem", color:T.cinza, lineHeight:1.7 }}>
              Simulação didática · ESP32 via Wokwi · MQTT HiveMQ Cloud TLS · PostgreSQL Neon ·
              Grupo 1 — Gestão Corporativa (ERP e PLM) · Técnico em Cibersistemas para Automação
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}