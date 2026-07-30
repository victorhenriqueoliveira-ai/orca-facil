import Link from "next/link";

export const metadata = { title: "Política de Privacidade — Orça Fácil" };

const CONTACT_EMAIL = "contato@orcafacil.com.br";
const LAST_UPDATED = "29 de julho de 2026";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#2D5D5A] hover:underline">← Voltar</Link>
        </div>

        <h1 className="text-3xl font-bold text-[#2B2621] mb-2">Política de Privacidade</h1>
        <p className="text-sm text-[#9B8E87] mb-10">Última atualização: {LAST_UPDATED}</p>

        <div className="space-y-8 text-[#4A3F38] text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">1. Quem somos</h2>
            <p>
              O <strong>Orça Fácil</strong> é uma plataforma de gestão de orçamentos para marceneiros.
              Esta política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade
              com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">2. Dados que coletamos</h2>
            <p><strong>Dados de cadastro:</strong> nome, e-mail, CPF/CNPJ e senha (armazenada de forma criptografada).</p>
            <p><strong>Dados do negócio:</strong> nome da empresa, telefone, cidade, logo, chave Pix e informações bancárias que você insere voluntariamente.</p>
            <p><strong>Dados de clientes:</strong> nome, telefone, e-mail e endereço dos seus clientes, inseridos por você na plataforma.</p>
            <p><strong>Dados de uso:</strong> orçamentos criados, itens do catálogo, versões e histórico de PDFs gerados.</p>
            <p><strong>Dados de pagamento:</strong> processados diretamente pelo AbacatePay. Não armazenamos dados de cartão.</p>
            <p><strong>Dados técnicos:</strong> endereço IP e logs de acesso, para segurança e diagnóstico.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">3. Para que usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prestar o serviço de criação e gestão de orçamentos;</li>
              <li>Processar pagamentos e gerenciar assinaturas;</li>
              <li>Enviar notificações sobre sua conta (aprovações, vencimentos, trial);</li>
              <li>Garantir a segurança da plataforma;</li>
              <li>Melhorar o produto com base em dados de uso agregados e anonimizados.</li>
            </ul>
            <p>Não usamos seus dados para publicidade de terceiros.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">4. Compartilhamento de dados</h2>
            <p>Seus dados são compartilhados apenas com:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — banco de dados e armazenamento de arquivos (servidores no Brasil/EUA);</li>
              <li><strong>AbacatePay</strong> — processamento de pagamentos;</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais;</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
            </ul>
            <p>Não vendemos seus dados a terceiros.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">5. Dados dos seus clientes</h2>
            <p>
              Ao inserir dados de seus clientes no Orça Fácil, você assume a responsabilidade de tê-los
              obtido com o consentimento adequado, conforme exigido pela LGPD. O Orça Fácil atua como
              operador desses dados, processando-os apenas para prestar o serviço contratado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">6. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Após o cancelamento, mantemos os
              dados por até 90 dias para fins de recuperação, após os quais são excluídos permanentemente,
              salvo obrigação legal de retenção.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">7. Seus direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessar os dados que temos sobre você;</li>
              <li>Corrigir dados incorretos;</li>
              <li>Solicitar a exclusão dos seus dados;</li>
              <li>Exportar seus dados em formato portável;</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
            <p>
              Para exercer esses direitos, entre em contato:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2D5D5A] underline">{CONTACT_EMAIL}</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">8. Segurança</h2>
            <p>
              Utilizamos criptografia TLS em trânsito, senhas hasheadas com bcrypt, autenticação gerenciada
              pelo Supabase Auth e controle de acesso por Row Level Security (RLS) no banco de dados.
              Nenhum sistema é 100% seguro, mas empregamos boas práticas do setor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">9. Cookies</h2>
            <p>
              Utilizamos apenas cookies essenciais para autenticação e sessão de usuário. Não utilizamos
              cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">10. Contato</h2>
            <p>
              Dúvidas ou solicitações relacionadas à privacidade:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2D5D5A] underline">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E5DDD3] text-center">
          <Link href="/termos" className="text-sm text-[#2D5D5A] underline">
            Termos de Uso
          </Link>
        </div>
      </div>
    </main>
  );
}
