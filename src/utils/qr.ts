import QRCode from 'qrcode';

export async function generateQRCode(data: string | object): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  try {
    return await QRCode.toDataURL(text, {
      margin: 2,
      width: 400,
      color: {
        dark: '#333333',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR Code:', err);
    return '';
  }
}
