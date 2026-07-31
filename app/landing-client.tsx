"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix, label }: { to: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const dur = 1400;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.round(ease * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-4xl font-extrabold text-[#C2703A]">{count}{suffix}</div>
      <div className="text-xs sm:text-sm text-white/60 mt-1 leading-snug">{label}</div>
    </div>
  );
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────
const SCREENS = [
  {
    label: "1. Cadastro do cliente",
    bg: "#2D5D5A",
    content: (
      <div className="flex flex-col gap-3 p-4 pt-6">
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Novo orçamento</div>
        <div className="bg-white/10 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] text-white/40">Cliente</div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white">João Silva</span>
            <span className="inline-block w-0.5 h-3.5 bg-white/80 animate-pulse" />
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] text-white/40">Telefone</div>
          <div className="text-sm text-white">(11) 98765-4321</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] text-white/40">E-mail</div>
          <div className="text-sm text-white">joao@email.com</div>
        </div>
        <div className="w-full bg-[#C2703A] rounded-xl py-2.5 text-center text-sm font-bold text-white shadow">
          Avançar →
        </div>
      </div>
    ),
  },
  {
    label: "2. Ambientes e itens",
    bg: "#1e4a47",
    content: (
      <div className="flex flex-col gap-2 p-4 pt-6">
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Ambiente: Cozinha</div>
        {[
          { name: "Armário Superior", val: "R$ 1.200" },
          { name: "Bancada Granito", val: "R$ 850" },
          { name: "Gavetas MDF", val: "R$ 640" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5">
            <div>
              <div className="text-[11px] font-medium text-white">{item.name}</div>
              <div className="text-[10px] text-white/40">1 unidade</div>
            </div>
            <div className="text-sm font-bold text-[#C2703A]">{item.val}</div>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <div className="flex-1 text-center bg-white/10 rounded-xl py-2 text-xs text-white/60">+ Item</div>
          <div className="flex-1 text-center bg-[#C2703A] rounded-xl py-2 text-xs font-bold text-white">Avançar →</div>
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2 flex justify-between">
          <span className="text-[10px] text-white/40">Total</span>
          <span className="text-[11px] font-bold text-white">R$ 2.690</span>
        </div>
      </div>
    ),
  },
  {
    label: "3. PDF profissional",
    bg: "#1a3d3b",
    content: (
      <div className="flex flex-col gap-3 p-4 pt-6">
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Orçamento #47</div>
        <div className="bg-white rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-[#2D5D5A]">ORÇAMENTO</div>
            <div className="text-[10px] text-gray-400">#47 · hoje</div>
          </div>
          <div className="border-b border-gray-100 pb-2 mb-2">
            <div className="text-[11px] font-semibold text-gray-700">João Silva</div>
            <div className="text-[10px] text-gray-400">Cozinha planejada</div>
          </div>
          {[
            { n: "Armário Superior", v: "R$ 1.200" },
            { n: "Bancada Granito", v: "R$ 850" },
            { n: "Gavetas MDF", v: "R$ 640" },
          ].map((r, i) => (
            <div key={i} className="flex justify-between text-[10px] text-gray-600 py-0.5">
              <span>{r.n}</span><span className="font-medium">{r.v}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
            <span className="text-[11px] font-bold text-gray-700">Total</span>
            <span className="text-[11px] font-bold text-[#C2703A]">R$ 2.690</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 text-center bg-green-600 rounded-xl py-2.5 text-[11px] font-bold text-white">📱 Enviar PDF</div>
          <div className="flex-1 text-center bg-[#C2703A] rounded-xl py-2.5 text-[11px] font-bold text-white">✅ Aprovação</div>
        </div>
      </div>
    ),
  },
  {
    label: "4. Cliente aprova",
    bg: "#0d2e2c",
    content: (
      <div className="flex flex-col gap-3 p-4 pt-6">
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Aprovação recebida</div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-sm font-bold text-white">Orçamento aprovado!</div>
          <div className="text-[10px] text-white/50 mt-1">João Silva aprovou agora</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50">Projeto</span>
            <span className="text-white font-medium">Cozinha planejada</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50">Valor</span>
            <span className="text-[#C2703A] font-bold">R$ 2.690</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-white/50">Status</span>
            <span className="text-green-400 font-medium">✓ Aprovado</span>
          </div>
        </div>
        <div className="w-full bg-[#C2703A] rounded-xl py-2.5 text-center text-sm font-bold text-white">
          🎉 Negócio fechado!
        </div>
      </div>
    ),
  },
];

function PhoneMockup() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive((a) => (a + 1) % SCREENS.length);
        setFading(false);
      }, 280);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const screen = SCREENS[active];

  return (
    <div className="flex flex-col items-center" style={{ animation: "float 3s ease-in-out infinite" }}>
      {/* Dots */}
      <div className="flex gap-2 mb-5">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setFading(false); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-[#C2703A]" : "w-1.5 bg-white/30"}`}
          />
        ))}
      </div>

      {/* Phone */}
      <div
        className="relative w-[210px] h-[410px] rounded-[36px] border-[5px] border-white/15 shadow-2xl overflow-hidden"
        style={{ backgroundColor: screen.bg, transition: "background-color 0.3s ease" }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-4 bg-black/50 rounded-b-2xl z-10" />
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-5 pb-0">
          <span className="text-[9px] text-white/50">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-1.5 bg-white/30 rounded-sm" />
            <div className="w-2.5 h-1.5 bg-white/40 rounded-sm" />
            <div className="w-2 h-1.5 bg-white/60 rounded-sm" />
          </div>
        </div>
        {/* Content */}
        <div
          className="h-full"
          style={{
            opacity: fading ? 0 : 1,
            transform: fading ? "translateX(8px)" : "translateX(0)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
          }}
        >
          {screen.content}
        </div>
      </div>

      <div className="mt-4 text-sm text-white/60 font-medium">{screen.label}</div>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  { num: "01", icon: "👤", title: "Cadastre o cliente", desc: "Nome, telefone e e-mail. Tudo salvo para orçamentos futuros." },
  { num: "02", icon: "🪵", title: "Monte os ambientes", desc: "Adicione cômodos e itens do seu catálogo — o sistema calcula tudo." },
  { num: "03", icon: "📄", title: "Gere o PDF com sua marca", desc: "PDF pronto em segundos, com layout profissional para impressão ou envio digital." },
  { num: "04", icon: "✅", title: "Cliente aprova pelo WhatsApp", desc: "Envie o link e o cliente aprova com um clique. Você recebe notificação imediata." },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "⚡", title: "Orçamentos em minutos", desc: "Do zero ao PDF em menos de 5 minutos, direto do celular." },
  { icon: "📦", title: "Catálogo de materiais", desc: "Preços e materiais salvos. Nunca mais refaça tabelas do zero." },
  { icon: "💬", title: "Envio pelo WhatsApp", desc: "Compartilhe PDF ou link de aprovação com um toque." },
  { icon: "📊", title: "Controle de status", desc: "Acompanhe cada orçamento: pendente, aprovado ou perdido." },
  { icon: "🔒", title: "Aprovação digital", desc: "O cliente aprova online e você tem o registro guardado." },
  { icon: "📱", title: "100% mobile", desc: "Funciona no celular como um app — sem instalar nada." },
];

// ─── Main export ──────────────────────────────────────────────────────────────
export function LandingClient() {
  return (
    <div className="flex flex-col min-h-full bg-[#FAF7F2] overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E5DDD3] bg-[#FAF7F2]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-[120px] items-center justify-between">
            <Link href="/">
              <img src="/orca_facil.png" alt="Orça Fácil" className="h-10 sm:h-[100px] w-auto" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-[#2B2621]/70 hover:text-[#2D5D5A] transition-colors">
                Entrar
              </Link>
              <Link href="/cadastro" className="bg-[#C2703A] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#a85e30] transition-colors shadow-sm">
                Começar Grátis
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#2D5D5A] via-[#224e4b] to-[#0d2e2c] py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C2703A]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <Reveal>
                <div className="inline-flex items-center gap-2 bg-[#C2703A]/20 border border-[#C2703A]/30 text-[#C2703A] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                  🪵 Para marceneiros profissionais
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white mb-6">
                  Feche mais orçamentos.{" "}
                  <span className="text-[#C2703A]">Em minutos.</span>
                </h1>
                <p className="text-lg text-white/70 mb-8 leading-relaxed max-w-lg">
                  Monte orçamentos de móveis planejados direto do celular, gere PDF profissional e envie para o cliente aprovar pelo WhatsApp — tudo em um lugar.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Link
                    href="/cadastro"
                    className="flex items-center justify-center gap-2 bg-[#C2703A] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#a85e30] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Testar Grátis por 30 Dias →
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-white/80 border border-white/20 font-medium px-6 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </div>
                <p className="text-sm text-white/40">Sem cartão de crédito. Cancele quando quiser.</p>
              </Reveal>

              <Reveal delay={200} className="flex justify-center lg:justify-end">
                <PhoneMockup />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="bg-[#2D5D5A] py-10 sm:py-12 px-4">
          <div className="mx-auto max-w-4xl grid grid-cols-3 gap-4 sm:gap-12">
            <Counter to={30} suffix=" dias" label="trial gratuito" />
            <Counter to={5} suffix=" min" label="do zero ao PDF" />
            <Counter to={100} suffix="%" label="no celular" />
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FAF7F2]">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center mb-14">
              <div className="inline-block text-xs font-bold text-[#C2703A] uppercase tracking-widest mb-3">Como funciona</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D5D5A]">
                Do atendimento ao fechamento em 4 passos
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                {HOW_STEPS.map((step, i) => (
                  <Reveal key={i} delay={i * 120}>
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#C2703A]/10 flex items-center justify-center text-2xl">
                        {step.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#C2703A] mb-1 tracking-widest">{step.num}</div>
                        <h3 className="text-base font-bold text-[#2D5D5A] mb-1">{step.title}</h3>
                        <p className="text-sm text-[#2B2621]/60 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={100} className="hidden lg:flex justify-center">
                <div className="relative">
                  <div
                    className="w-64 h-64 rounded-full bg-gradient-to-br from-[#2D5D5A] to-[#1e4a47] flex items-center justify-center shadow-2xl"
                    style={{ animation: "float 3s ease-in-out infinite" }}
                  >
                    <div className="text-center text-white px-6">
                      <div className="text-5xl mb-3">🪵</div>
                      <div className="text-base font-bold">Orça Fácil</div>
                      <div className="text-xs text-white/50 mt-1">Orçamentos profissionais</div>
                    </div>
                  </div>
                  {[
                    { icon: "📱", bg: "#C2703A", pos: "-top-4 -right-4", delay: "0.5s" },
                    { icon: "📄", bg: "white", pos: "-bottom-4 -left-4", delay: "1s" },
                    { icon: "✅", bg: "#22c55e", pos: "top-1/2 -right-10 -translate-y-1/2", delay: "1.5s" },
                  ].map((d, i) => (
                    <div
                      key={i}
                      className={`absolute ${d.pos} w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg`}
                      style={{ backgroundColor: d.bg, animation: `float 3s ease-in-out infinite`, animationDelay: d.delay }}
                    >
                      {d.icon}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center mb-14">
              <div className="inline-block text-xs font-bold text-[#C2703A] uppercase tracking-widest mb-3">Recursos</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D5D5A]">
                Tudo que você precisa, nada que não precisa
              </h2>
              <p className="mt-4 text-[#2B2621]/60 max-w-lg mx-auto">
                Feito especialmente para marceneiros. Simples, rápido e funciona no celular.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <Reveal key={i} delay={i * 80} className="h-full">
                  <div className="group bg-white rounded-2xl p-6 border border-[#E5DDD3] hover:border-[#C2703A]/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <h3 className="text-base font-bold text-[#2D5D5A] mb-2">{f.title}</h3>
                    <p className="text-sm text-[#2B2621]/60 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#FAF7F2]">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center mb-12">
              <div className="inline-block text-xs font-bold text-[#C2703A] uppercase tracking-widest mb-3">Preço</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D5D5A]">
                Um plano simples, sem surpresas
              </h2>
              <p className="mt-4 text-[#2B2621]/60">Comece grátis. Assine apenas quando ver o valor.</p>
            </Reveal>

            <Reveal delay={100} className="mx-auto max-w-sm">
              <div className="bg-white rounded-3xl border-2 border-[#C2703A]/30 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#C2703A] to-[#a85e30] px-8 py-4 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase tracking-widest">Plano Profissional</div>
                </div>
                <div className="p-8 text-center">
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-5xl font-extrabold text-[#2D5D5A]">R$ 49</span>
                    <span className="text-[#2B2621]/50 text-lg">,90/mês</span>
                  </div>
                  <p className="text-sm text-[#C2703A] font-semibold mb-8">30 dias grátis — sem cartão de crédito</p>
                  <ul className="text-left space-y-3 mb-8">
                    {[
                      "Orçamentos ilimitados",
                      "Catálogo de materiais",
                      "PDF profissional com sua marca",
                      "Aprovação digital pelo WhatsApp",
                      "Controle de clientes e histórico",
                      "Suporte por e-mail",
                      "Cancele quando quiser, sem multa",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-[#2B2621]">
                        <span className="w-5 h-5 rounded-full bg-[#C2703A]/10 text-[#C2703A] text-xs font-bold flex items-center justify-center flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cadastro"
                    className="block w-full bg-[#C2703A] text-white font-bold py-3.5 rounded-xl text-center hover:bg-[#a85e30] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Começar Grátis
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#2D5D5A] to-[#1a3d3b]">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-4">
                Pare de perder tempo com planilhas.
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
                Comece hoje e veja a diferença no primeiro orçamento.
              </p>
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 bg-[#C2703A] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#a85e30] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
              >
                Testar Grátis por 30 Dias →
              </Link>
              <p className="mt-4 text-white/40 text-sm">Sem cartão de crédito. Cancele quando quiser.</p>
            </Reveal>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5DDD3] py-8 px-4 sm:px-6 bg-[#FAF7F2]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#2B2621]/40">
          <span>© {new Date().getFullYear()} Orça Fácil. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-[#2B2621]/70 transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-[#2B2621]/70 transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
