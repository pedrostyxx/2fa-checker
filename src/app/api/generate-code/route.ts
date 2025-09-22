import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';

/**
 * Lida com a requisição POST para gerar códigos TOTP com base em uma chave fornecida.
 */
export async function POST(request: Request) {
  try {
    // 1. Extrai a chave secreta do corpo da requisição.
    const { secret } = await request.json();

    // 2. Valida se a chave foi fornecida.
    if (!secret) {
      return NextResponse.json(
        { message: 'A chave secreta é obrigatória.' },
        { status: 400 }
      );
    }

    // 3. Valida o formato da chave (deve ser base32).
    if (!/^[A-Z2-7]+=*$/i.test(secret)) {
      return NextResponse.json(
        { message: 'Formato de chave inválido. Use uma chave base32 válida.' },
        { status: 400 }
      );
    }

    // 4. Configura o authenticator com as mesmas opções usadas na geração.
    authenticator.options = {
      step: 30,     // Intervalo de 30 segundos
      window: 1,    // Tolerância de ±30 segundos
      digits: 6,    // Códigos de 6 dígitos
    };

    try {
      // 5. Gera o código atual usando a chave fornecida.
      const currentCode = authenticator.generate(secret);
      
      // 6. Calcula o tempo restante até o próximo código.
      const now = Date.now();
      const step = 30 * 1000; // 30 segundos em milissegundos
      const timeRemaining = step - (now % step);
      const timeRemainingSeconds = Math.floor(timeRemaining / 1000);

      // 7. Gera também o próximo código para preview.
      const nextTime = now + timeRemaining;
      const nextCode = authenticator.generate(secret);

      // 8. Retorna os códigos e informações de timing.
      return NextResponse.json({
        currentCode,
        nextCode,
        timeRemaining: timeRemainingSeconds,
        timestamp: now,
        valid: true
      });

    } catch (error) {
      // Se houver erro na geração, a chave provavelmente é inválida.
      return NextResponse.json(
        { message: 'Chave secreta inválida. Verifique se a chave está correta.' },
        { status: 400 }
      );
    }

  } catch (error) {
    // Em caso de qualquer erro inesperado, retorna uma resposta de erro.
    console.error('Erro na API /generate-code:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}