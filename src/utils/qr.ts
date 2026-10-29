import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQRCode(data: string | object, options?: QRCodeOptions): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  try {
    return await QRCode.toDataURL(text, {
      margin: options?.margin ?? 2,
      width: options?.width ?? 400,
      color: {
        dark: options?.color?.dark ?? '#1A1A1A',
        light: options?.color?.light ?? '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR Code:', err);
    return '';
  }
}

/**
 * Generates a high-resolution QR code PNG (default 1024x1024) and triggers browser download
 */
export async function downloadQRCodePNG(
  data: string | object,
  filename: string,
  options?: QRCodeOptions
): Promise<boolean> {
  try {
    const dataUrl = await generateQRCode(data, {
      width: options?.width ?? 1024,
      margin: options?.margin ?? 3,
      color: options?.color,
    });

    if (!dataUrl) {
      throw new Error('Falha ao gerar imagem do QR Code.');
    }

    const cleanFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (err) {
    console.error('Error downloading QR code:', err);
    return false;
  }
}
