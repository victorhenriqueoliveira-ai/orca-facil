export interface TrialReminderData {
  business_name: string | null;
  quote_count: number;
  days_left: number;
  sign_up_url: string;
}

/**
 * Gera o HTML do e-mail de reengajamento de trial.
 * Inclui nome da marcenaria, contagem de orçamentos, dias restantes e link para assinar.
 */
export function buildTrialReminderHtml(data: TrialReminderData): string {
  const name = data.business_name ?? "Marceneiro";
  const { quote_count, days_left, sign_up_url } = data;

  const daysText =
    days_left === 1 ? "1 dia" : `${days_left} dias`;
  const quotesText =
    quote_count === 0
      ? "Você ainda não criou orçamentos durante o trial"
      : quote_count === 1
        ? "Você criou 1 orçamento durante o trial"
        : `Você criou ${quote_count} orçamentos durante o trial`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu trial expira em breve — Orça Fácil</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Orça Fácil</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#111827;font-size:16px;">Olá, <strong>${name}</strong>!</p>

              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Seu período de trial expira em <strong style="color:#dc2626;">${daysText}</strong>.
                Após esse prazo, sua conta entrará em modo somente-leitura e você não poderá criar novos orçamentos.
              </p>

              <div style="background-color:#f0f9ff;border-left:4px solid #1e40af;padding:16px 20px;margin:24px 0;border-radius:0 4px 4px 0;">
                <p style="margin:0;color:#1e40af;font-size:15px;font-weight:600;">
                  ${quotesText}.
                </p>
              </div>

              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Assine agora para continuar utilizando todos os recursos do Orça Fácil e nunca perder um orçamento.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="background-color:#1e40af;border-radius:6px;">
                    <a href="${sign_up_url}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;">
                      Assinar agora
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
                Se tiver dúvidas, responda este e-mail — estamos aqui para ajudar.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f3f4f6;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © Orça Fácil · Você está recebendo este e-mail porque seu trial está prestes a expirar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
