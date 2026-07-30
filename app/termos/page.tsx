import Link from "next/link";

export const metadata = { title: "Termos de Uso — Orça Fácil" };

const APP_URL = "https://orcafacil.com.br";
const CONTACT_EMAIL = "contato@orcafacil.com.br";
const LAST_UPDATED = "29 de julho de 2026";

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-[#2D5D5A] hover:underline">← Voltar</Link>
        </div>

        <h1 className="text-3xl font-bold text-[#2B2621] mb-2">Termos de Uso</h1>
        <p className="text-sm text-[#9B8E87] mb-10">Última atualização: {LAST_UPDATED}</p>

        <div className="prose prose-sm max-w-none space-y-8 text-[#4A3F38]">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar o <strong>Orça Fácil</strong> ({APP_URL}), você declara ter lido,
              compreendido e concordado com estes Termos de Uso. Caso não concorde, não utilize o serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">2. Descrição do Serviço</h2>
            <p>
              O Orça Fácil é uma plataforma SaaS (Software como Serviço) que permite a marceneiros e
              prestadores de serviços criar, gerenciar e enviar orçamentos profissionais para seus clientes.
              O serviço inclui geração de PDFs, gestão de clientes, catálogo de produtos e envio de links
              de aprovação.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">3. Cadastro e Conta</h2>
            <p>
              Para usar o Orça Fácil, você deve criar uma conta fornecendo informações verdadeiras e atualizadas.
              Você é responsável por manter a confidencialidade da sua senha e por todas as atividades
              realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.
            </p>
            <p>
              É proibido criar contas com dados falsos, usar a plataforma para fins ilegais ou transferir
              sua conta para terceiros sem autorização prévia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">4. Planos e Pagamento</h2>
            <p>
              O Orça Fácil oferece um período de teste gratuito. Após o encerramento do trial, é necessário
              assinar um plano pago para continuar criando orçamentos. Os valores e condições são exibidos
              na página de assinatura e podem ser atualizados com aviso prévio de 30 dias.
            </p>
            <p>
              Os pagamentos são processados pela plataforma AbacatePay. O Orça Fácil não armazena dados de
              cartão de crédito. Assinaturas são renovadas automaticamente até o cancelamento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">5. Cancelamento</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento, sem multa, diretamente nas Configurações
              da sua conta. O acesso permanece ativo até o fim do período já pago. Não há reembolso
              proporcional de períodos não utilizados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">6. Propriedade dos Dados</h2>
            <p>
              Os dados que você inserir na plataforma (clientes, orçamentos, catálogo) são de sua propriedade.
              O Orça Fácil não vende nem compartilha seus dados com terceiros para fins comerciais.
              Você pode solicitar a exportação ou exclusão dos seus dados a qualquer momento entrando em
              contato pelo e-mail {CONTACT_EMAIL}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">7. Responsabilidades do Usuário</h2>
            <p>Você concorda em não utilizar o Orça Fácil para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Inserir informações falsas ou enganosas nos orçamentos enviados a clientes;</li>
              <li>Violar leis aplicáveis, incluindo legislação de proteção ao consumidor;</li>
              <li>Tentar acessar sistemas ou dados de outros usuários;</li>
              <li>Realizar engenharia reversa do software.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">8. Limitação de Responsabilidade</h2>
            <p>
              O Orça Fácil é fornecido &quot;como está&quot;. Não garantimos disponibilidade ininterrupta do serviço.
              Não nos responsabilizamos por perdas de negócio decorrentes de indisponibilidade temporária,
              por conteúdo inserido pelos usuários ou por decisões tomadas com base nos orçamentos gerados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">9. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por
              e-mail com antecedência mínima de 15 dias. O uso contínuo após esse prazo implica aceitação
              das mudanças.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">10. Foro e Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São Paulo/SP
              para dirimir quaisquer controvérsias decorrentes deste contrato.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#2B2621]">11. Contato</h2>
            <p>
              Dúvidas sobre estes Termos? Entre em contato:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#2D5D5A] underline">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E5DDD3] text-center">
          <Link href="/privacidade" className="text-sm text-[#2D5D5A] underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </main>
  );
}
