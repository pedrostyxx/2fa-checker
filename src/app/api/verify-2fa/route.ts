import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';

/**
 * Lida com a requisição POST para verificar um código 2FA.
 */
export async function POST(request: Request) {
  try {
    // 1. Extrai o token e secret do corpo da requisição.
    const { token, secret } = await request.json();

    // 2. Valida se ambos os parâmetros foram fornecidos.
    if (!token || !secret) {
      return NextResponse.json(
        { message: 'Token e secret são obrigatórios.', verified: false },
        { status: 400 }
      );
    }

    // 3. Remove espaços e valida o formato do token (6 dígitos).
    const cleanToken = token.toString().replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { message: 'Token deve conter exatamente 6 dígitos.', verified: false },
        { status: 400 }
      );
    }

    // 4. Configura uma janela de tolerância para compensar diferenças de tempo.
    // Isso permite códigos que foram gerados até 30 segundos antes ou depois.
    authenticator.options = {
      window: 1, // Permite +/- 30 segundos de diferença
    };

    // 5. Verifica se o token é válido para o secret fornecido.
    const isValid = authenticator.verify({
      token: cleanToken,
      secret: secret,
    });

    // 6. Retorna o resultado da verificação.
    if (isValid) {
      return NextResponse.json({ 
        message: 'Código verificado com sucesso!', 
        verified: true 
      });
    } else {
      return NextResponse.json({ 
        message: 'Código inválido ou expirado.', 
        verified: false 
      });
    }

  } catch (error) {
    // Em caso de qualquer erro inesperado, retorna uma resposta de erro.
    console.error('Erro na API /verify-2fa:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.', verified: false },
      { status: 500 }
    );
  }
}