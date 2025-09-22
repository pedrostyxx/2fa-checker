import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';

/**
 * Lida com a requisição POST para gerar um novo segredo 2FA para um usuário.
 */
export async function POST(request: Request) {
  try {
    // 1. Extrai o nome de usuário do corpo da requisição.
    const { username } = await request.json();

    // 2. Valida se o nome de usuário foi fornecido.
    if (!username) {
      return NextResponse.json(
        { message: 'O nome de usuário é obrigatório.' },
        { status: 400 }
      );
    }

    // 3. Define o nome do serviço/aplicação que aparecerá no app autenticador.
    const serviceName = '2FA Checker';

    // 4. Configura o authenticator para garantir compatibilidade.
    authenticator.options = {
      step: 30,     // Intervalo de 30 segundos (padrão)
      window: 1,    // Permite +/- 30 segundos de tolerância
      digits: 6,    // Códigos de 6 dígitos
    };

    // 5. Gera um segredo único e criptograficamente seguro.
    const secret = authenticator.generateSecret();

    // 5. Cria o URI 'otpauth' que contém todas as informações para o app autenticador.
    const otpauth = authenticator.keyuri(username, serviceName, secret);

    /*
     * !! PASSO CRÍTICO DE SEGURANÇA !!
     * Neste ponto, você DEVE salvar o `secret` no seu banco de dados,
     * associado à conta do usuário. Este segredo é necessário para verificar
     * os códigos futuros que o usuário fornecer. Guarde-o de forma segura.
     * Ex: await database.user.update({ where: { username }, data: { twoFactorSecret: secret } });
    */

    // 6. Retorna o segredo e o URI para o frontend.
    return NextResponse.json({ secret, otpauth });

  } catch (error) {
    // Em caso de qualquer erro inesperado, retorna uma resposta de erro genérica.
    console.error('Erro na API /generate-2fa:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}