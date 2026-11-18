export interface BankAccountConfig {
  bankName: string;
  iban: string;
  accountNumber?: string;
  holderName: string;
  isAvailable: boolean; // Set to true when the account is ready for public display
  instructions?: string;
}

export interface PlatformPricingConfig {
  b2cWeddingPriceKz: number;
  b2cWeddingPriceFormatted: string;
  b2bPlannerStarterKz: number;
  b2bPlannerStarterFormatted: string;
  b2bPlannerProKz: number;
  b2bPlannerProFormatted: string;
  whatsappContactNumber: string;
  whatsappContactUrl: string;
  whatsappDisplayPhone: string;
  supportEmail: string;
  multicaixaExpress: {
    phoneNumber: string;
    holderName: string;
    isAvailable: boolean;
  };
  accounts: BankAccountConfig[];
}

export const PLATFORM_BANKING_CONFIG: PlatformPricingConfig = {
  b2cWeddingPriceKz: 45000,
  b2cWeddingPriceFormatted: '45.000 Kz',
  b2bPlannerStarterKz: 20000,
  b2bPlannerStarterFormatted: '20.000 Kz',
  b2bPlannerProKz: 50000,
  b2bPlannerProFormatted: '50.000 Kz',
  whatsappContactNumber: '244936952391',
  whatsappDisplayPhone: '+244 936 952 391',
  whatsappContactUrl: 'https://wa.me/244936952391',
  supportEmail: 'suporte@meuboda.com',
  multicaixaExpress: {
    phoneNumber: '+244 936 952 391',
    holderName: 'Meu Boda Atendimento Comercial',
    isAvailable: false, // Hidden until owner decides to show directly
  },
  accounts: [
    {
      bankName: 'Banco BAI',
      iban: 'AO06.0040.0000.XXXX.XXXX.XXXX.X',
      holderName: 'Meu Boda (Apoio Comercial)',
      isAvailable: false,
      instructions: 'Transferência por BAI Directo ou Multicaixa',
    },
    {
      bankName: 'Banco BFA',
      iban: 'AO06.0006.0000.XXXX.XXXX.XXXX.X',
      holderName: 'Meu Boda (Apoio Comercial)',
      isAvailable: false,
      instructions: 'Transferência por BFA Net ou Multicaixa',
    },
  ],
};

/**
 * Builds a direct WhatsApp deep link with contextual pre-filled message
 * for requesting payment details.
 */
export function buildPaymentRequestWhatsAppUrl(
  eventTitle: string,
  userEmail?: string | null,
  planType: string = 'Plano Noivos (45.000 Kz)'
): string {
  const text = `Olá equipa Meu Boda! Gostaria de efetuar o pagamento da licença oficial (${planType}) para o evento "${eventTitle}"${
    userEmail ? ` (conta: ${userEmail})` : ''
  }. Podem facultar-me as coordenadas bancárias atualizadas (BAI/BFA/Express) para efetuar a transferência?`;

  return `${PLATFORM_BANKING_CONFIG.whatsappContactUrl}?text=${encodeURIComponent(text)}`;
}
