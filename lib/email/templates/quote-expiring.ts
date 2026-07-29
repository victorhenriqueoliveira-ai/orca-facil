import { createResendClient } from "../resend";

export interface QuoteExpiringData {
  business_name: string | null;
  quote_number: number;
  customer_name: string | null;
  quote_url: string;
  days_until_expiry: number;
}

export function buildQuoteExpiringHtml(data: QuoteExpiringData): string {
  const businessName = data.business_name ?? "Marceneiro";
  const customerName = data.customer_name ?? "Cliente";
  const { quote_number, quote_url, days_until_expiry } = data;

  const daysText =
    days_until_expiry === 1 ? "1 dia" : `${days_until_expiry} dias`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orçamento #${quote_number} vence em breve — Orça Fácil</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#FAF7F2;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5DDD3;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2D5D5A;padding:28px 40px;text-align:center;">
              <img src="https://orcafacil.com.br/orca_facil.png" alt="Orça Fácil" width="160" style="display:inline-block;height:auto;filter:brightness(0) invert(1);" />
            </td>
          </tr>

          <!-- Alert strip -->
          <tr>
            <td style="background-color:#C2703A;padding:10px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                Orçamento vence em ${daysText}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 20px;color:#2B2621;font-size:17px;font-weight:600;">
                Olá, ${businessName}!
              </p>

              <p style="margin:0 0 20px;color:#4A3F38;font-size:15px;line-height:1.7;">
                O seu <strong style="color:#C2703A;">Orçamento #${quote_number}</strong> enviado para
                <strong style="color:#2B2621;">${customerName}</strong> irá vencer em
                <strong style="color:#C2703A;">${daysText}</strong>.
                Considere entrar em contato com o cliente para não perder a oportunidade.
              </p>

              <!-- Info card -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border:1px solid #E5DDD3;border-radius:10px;overflow:hidden;margin:28px 0;">
                <tr>
                  <td style="background-color:#FAF7F2;padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#2D5D5A;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Prazo do orçamento</p>
                    <p style="margin:0;color:#2B2621;font-size:15px;font-weight:500;">
                      Cliente: ${customerName}<br />
                      Orçamento: #${quote_number}<br />
                      Vence em: ${daysText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="background-color:#C2703A;border-radius:10px;">
                    <a href="${quote_url}"
                       style="display:inline-block;padding:15px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:-0.2px;">
                      Ver orçamento
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9B8E87;font-size:13px;text-align:center;line-height:1.6;">
                Tem dúvidas? Responda este e-mail — estamos aqui para ajudar.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FAF7F2;border-top:1px solid #E5DDD3;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#9B8E87;font-size:12px;">
                © Orça Fácil · Você está recebendo este e-mail porque um orçamento está prestes a vencer.
              </p>
              <p style="margin:0;color:#C0B8B3;font-size:11px;">
                Orça Fácil — Software para marceneiros profissionais
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

export async function sendQuoteExpiring(
  to: string,
  data: QuoteExpiringData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = createResendClient();
    const businessName = data.business_name ?? "Marceneiro";
    const customerName = data.customer_name ?? "Cliente";
    const daysText =
      data.days_until_expiry === 1 ? "1 dia" : `${data.days_until_expiry} dias`;

    const { data: resendData, error } = await resend.emails.send({
      from: "Orça Fácil <noreply@orcafacil.com.br>",
      to,
      subject: `${businessName}, o Orçamento #${data.quote_number} para ${customerName} vence em ${daysText}`,
      html: buildQuoteExpiringHtml(data),
    });

    if (error) {
      return {
        success: false,
        error: `Resend API error: ${error.message}`,
      };
    }

    return {
      success: true,
      id: resendData?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}
