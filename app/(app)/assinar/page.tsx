import Link from "next/link";

/**
 * Página de conversão de trial.
 * Exibe mensagem de trial encerrado e CTA de assinatura.
 * O checkout real (AbacatePay) será implementado na task_13.
 */
export default function AssinarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Período de teste encerrado
          </h1>
          <p className="text-gray-500 text-base">
            Seu acesso gratuito expirou. Assine para continuar criando
            orçamentos, gerenciando clientes e gerando PDFs profissionais.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-blue-900">
            Plano Orça Fácil Pro
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Orçamentos ilimitados
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Geração de PDFs profissionais
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Gestão de clientes e catálogo
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              Suporte prioritário
            </li>
          </ul>
        </div>

        {/* CTA Placeholder — checkout AbacatePay implementado na task_13 */}
        <button
          type="button"
          disabled
          aria-label="Assinar — em breve"
          className="w-full bg-blue-600 text-white text-xl font-semibold py-5 px-8 rounded-2xl shadow-lg opacity-50 cursor-not-allowed"
        >
          Assinar agora — em breve
        </button>

        <p className="text-center text-xs text-gray-400">
          Pagamento seguro via AbacatePay. Cancele quando quiser.
        </p>

        <div className="text-center">
          <Link
            href="/orcamentos"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Ver orçamentos existentes (somente leitura)
          </Link>
        </div>
      </div>
    </div>
  );
}
