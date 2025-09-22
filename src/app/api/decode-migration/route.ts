import { NextRequest, NextResponse } from 'next/server';

// Estrutura dos dados de migração do Google Authenticator
interface GoogleMigrationPayload {
  otp_parameters: Array<{
    secret: Uint8Array;
    name: string;
    issuer: string;
    algorithm: number;
    digits: number;
    type: number;
    counter: number;
  }>;
  version: number;
  batch_size: number;
  batch_index: number;
  batch_id: number;
}

// Função para codificar em base32
function base32Encode(data: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  // Adicionar padding
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

// Decodificador simples de Protocol Buffers para dados do Google
function decodeGoogleMigrationData(data: Uint8Array): GoogleMigrationPayload {
  const payload: GoogleMigrationPayload = {
    otp_parameters: [],
    version: 1,
    batch_size: 1,
    batch_index: 0,
    batch_id: 0
  };

  let offset = 0;

  while (offset < data.length) {
    const key = data[offset++];
    const fieldNumber = key >> 3;
    const wireType = key & 0x07;

    if (fieldNumber === 1 && wireType === 2) { // otp_parameters (repeated message)
      const length = data[offset++];
      const paramData = data.slice(offset, offset + length);
      offset += length;

      const param = decodeOtpParameter(paramData);
      if (param) {
        payload.otp_parameters.push(param);
      }
    } else if (fieldNumber === 2 && wireType === 0) { // version
      payload.version = data[offset++];
    } else if (fieldNumber === 3 && wireType === 0) { // batch_size
      payload.batch_size = data[offset++];
    } else if (fieldNumber === 4 && wireType === 0) { // batch_index
      payload.batch_index = data[offset++];
    } else if (fieldNumber === 5 && wireType === 0) { // batch_id
      payload.batch_id = data[offset++];
    } else {
      // Pular campo desconhecido
      if (wireType === 0) {
        offset++;
      } else if (wireType === 2) {
        const length = data[offset++];
        offset += length;
      } else {
        break;
      }
    }
  }

  return payload;
}

function decodeOtpParameter(data: Uint8Array) {
  const param = {
    secret: new Uint8Array(),
    name: '',
    issuer: '',
    algorithm: 1, // SHA1
    digits: 6,
    type: 2, // TOTP
    counter: 0
  };

  let offset = 0;

  while (offset < data.length) {
    if (offset >= data.length) break;
    
    const key = data[offset++];
    const fieldNumber = key >> 3;
    const wireType = key & 0x07;

    if (fieldNumber === 1 && wireType === 2) { // secret
      const length = data[offset++];
      param.secret = data.slice(offset, offset + length);
      offset += length;
    } else if (fieldNumber === 2 && wireType === 2) { // name
      const length = data[offset++];
      param.name = new TextDecoder().decode(data.slice(offset, offset + length));
      offset += length;
    } else if (fieldNumber === 3 && wireType === 2) { // issuer
      const length = data[offset++];
      param.issuer = new TextDecoder().decode(data.slice(offset, offset + length));
      offset += length;
    } else if (fieldNumber === 4 && wireType === 0) { // algorithm
      param.algorithm = data[offset++];
    } else if (fieldNumber === 5 && wireType === 0) { // digits
      param.digits = data[offset++];
    } else if (fieldNumber === 6 && wireType === 0) { // type
      param.type = data[offset++];
    } else if (fieldNumber === 7 && wireType === 0) { // counter
      param.counter = data[offset++];
    } else {
      // Pular campo desconhecido
      if (wireType === 0) {
        offset++;
      } else if (wireType === 2) {
        const length = data[offset++];
        offset += length;
      } else {
        break;
      }
    }
  }

  return param;
}

export async function POST(request: NextRequest) {
  try {
    const { migrationUrl } = await request.json();

    if (!migrationUrl || typeof migrationUrl !== 'string') {
      return NextResponse.json(
        { message: 'URL de migração é obrigatória' },
        { status: 400 }
      );
    }

    // Verificar se é uma URL de migração válida
    if (!migrationUrl.startsWith('otpauth-migration://offline?data=')) {
      return NextResponse.json(
        { message: 'URL de migração inválida. Deve começar com "otpauth-migration://offline?data="' },
        { status: 400 }
      );
    }

    // Extrair os dados base64
    const dataParam = migrationUrl.split('data=')[1];
    if (!dataParam) {
      return NextResponse.json(
        { message: 'Dados de migração não encontrados na URL' },
        { status: 400 }
      );
    }

    // Decodificar base64
    const base64Data = decodeURIComponent(dataParam);
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Decodificar os dados do Google
    const migrationData = decodeGoogleMigrationData(binaryData);

    // Converter para formato utilizável
    const accounts = migrationData.otp_parameters.map(param => {
      const secret = base32Encode(param.secret);
      const accountName = param.name || 'Conta sem nome';
      const issuer = param.issuer || 'Provedor desconhecido';
      
      // Criar URI otpauth padrão
      const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${param.digits}&period=30`;
      
      return {
        name: accountName,
        issuer: issuer,
        secret: secret,
        otpauthUri: otpauthUri,
        algorithm: param.algorithm === 1 ? 'SHA1' : param.algorithm === 2 ? 'SHA256' : 'SHA512',
        digits: param.digits,
        type: param.type === 1 ? 'HOTP' : 'TOTP'
      };
    });

    return NextResponse.json({
      message: 'Migração decodificada com sucesso',
      accountsCount: accounts.length,
      accounts: accounts,
      metadata: {
        version: migrationData.version,
        batchSize: migrationData.batch_size,
        batchIndex: migrationData.batch_index,
        batchId: migrationData.batch_id
      }
    });

  } catch (error) {
    console.error('Erro ao decodificar migração:', error);
    return NextResponse.json(
      { message: 'Erro ao processar dados de migração. Verifique se a URL está correta.' },
      { status: 500 }
    );
  }
}