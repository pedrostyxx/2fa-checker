"use client";

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type Mode = 'setup' | 'generate';

interface CodeData {
  currentCode: string;
  nextCode: string;
  timeRemaining: number;
  timestamp: number;
  valid: boolean;
}

export default function TwoFactorApp() {
  // Estados principais
  const [mode, setMode] = useState<Mode>('setup');
  
  // Estados para modo Setup (configuração)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Estados para modo Generate (geração de códigos)
  const [inputSecret, setInputSecret] = useState<string>('');
  const [codeData, setCodeData] = useState<CodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Função para gerar QR code (modo setup)
  useEffect(() => {
    if (mode === 'setup') {
      const generateQRCode = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/generate-2fa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: 'usuario@exemplo.com' }),
          });

          if (!response.ok) {
            throw new Error('Falha ao buscar dados do QR code.');
          }

          const data = await response.json();
          setQrCodeData(data.otpauth);
          setSecret(data.secret);
        } catch (error) {
          console.error('Erro ao gerar o QR code:', error);
          setVerificationResult('Não foi possível gerar os dados para o 2FA. Tente novamente.');
        } finally {
          setIsLoading(false);
        }
      };

      generateQRCode();
    }
  }, [mode]);

  // Função para gerar códigos (modo generate)
  const generateCodes = useCallback(async () => {
    if (!inputSecret.trim()) {
      setError('Por favor, insira uma chave secreta.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: inputSecret.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao gerar códigos');
      }

      setCodeData(data);
    } catch (error: any) {
      setError(error.message || 'Erro ao gerar códigos');
      setCodeData(null);
    } finally {
      setIsGenerating(false);
    }
  }, [inputSecret]);

  // Timer para atualizar códigos automaticamente (modo generate)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mode === 'generate' && codeData && inputSecret.trim()) {
      interval = setInterval(() => {
        generateCodes();
      }, 1000); // Atualiza a cada segundo para mostrar countdown
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [mode, codeData, inputSecret, generateCodes]);

  // Função para verificar código (modo setup)
  const handleVerify = async () => {
    if (!verificationCode || !secret) {
      setVerificationResult('Por favor, insira o código de verificação.');
      return;
    }

    const cleanCode = verificationCode.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      setVerificationResult('O código deve conter exatamente 6 dígitos.');
      return;
    }
    
    setIsVerifying(true);
    setVerificationResult('Verificando código...');
    
    try {
      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: cleanCode, secret: secret }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setVerificationResult(`Erro: ${data.message || 'Falha na verificação'}`);
        return;
      }
      
      if (data.verified) {
        setVerificationResult('✅ Código verificado com sucesso! O 2FA está ativo.');
      } else {
        setVerificationResult('❌ Código inválido. Verifique se:\n• O código está correto\n• O tempo no seu dispositivo está sincronizado\n• Você está usando o código mais recente');
      }
    } catch (error) {
      console.error('Erro ao verificar o código:', error);
      setVerificationResult('❌ Ocorreu um erro ao verificar o código. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Função para trocar de modo
  const toggleMode = () => {
    setMode(mode === 'setup' ? 'generate' : 'setup');
    // Reset states when switching
    setVerificationResult('');
    setError('');
    setCodeData(null);
    setVerificationCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header com Switch */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Autenticação 2FA
          </h1>
          
          {/* Switch de Modo */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <span className={`text-sm font-medium ${mode === 'setup' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Configurar 2FA
            </span>
            <button
              onClick={toggleMode}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  mode === 'generate' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${mode === 'generate' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Gerar Códigos
            </span>
          </div>

          <p className="text-lg text-slate-600 dark:text-slate-300">
            {mode === 'setup' 
              ? 'Configure a autenticação de dois fatores para sua conta'
              : 'Gere códigos 2FA usando uma chave existente'
            }
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Modo Setup - Configurar 2FA */}
          {mode === 'setup' && (
            <>
              {isLoading && (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="text-slate-600 dark:text-slate-300 text-lg">Gerando seu código de segurança...</span>
                  </div>
                </div>
              )}
              
              {qrCodeData && !isLoading && (
                <div className="p-8 sm:p-12">
                  {/* Step 1: QR Code */}
                  <div className="mb-12">
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">1</div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Escaneie o QR Code</h2>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                      Use seu aplicativo autenticador (Google Authenticator, Authy, etc.) para escanear o código abaixo.
                    </p>
                    <div className="flex justify-center">
                      <div className="p-6 bg-white rounded-2xl shadow-lg border-4 border-slate-100 dark:border-slate-600">
                        <QRCodeSVG 
                          value={qrCodeData} 
                          size={200} 
                          bgColor="white"
                          fgColor="#1e293b"
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Manual Entry */}
                  <div className="mb-12">
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 bg-slate-400 text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Entrada Manual (Opcional)</h2>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Não consegue escanear? Insira esta chave manualmente no seu aplicativo:
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                      <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                        {secret}
                      </code>
                    </div>
                  </div>

                  {/* Step 3: Verification */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Verificar Configuração</h2>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                      Digite o código de 6 dígitos gerado pelo seu aplicativo para confirmar a configuração.
                    </p>
                    
                    <div className="space-y-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-6 py-4 text-2xl font-mono text-center tracking-widest bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 outline-none"
                          disabled={isVerifying}
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center">
                          <div className="text-sm text-slate-400 dark:text-slate-500">
                            {verificationCode.length}/6
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleVerify}
                        disabled={verificationCode.length !== 6 || isVerifying}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                      >
                        {isVerifying ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Verificando...</span>
                          </div>
                        ) : (
                          'Verificar e Ativar 2FA'
                        )}
                      </button>
                    </div>

                    {verificationResult && (
                      <div className={`mt-6 p-4 rounded-xl border-2 ${
                        verificationResult.includes('✅') 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      }`}>
                        <div className={`font-medium ${
                          verificationResult.includes('✅') 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-orange-800 dark:text-orange-200'
                        }`}>
                          <pre className="whitespace-pre-wrap font-sans">
                            {verificationResult}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Dica importante</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            O código muda a cada 30 segundos. Certifique-se de usar sempre o código mais recente exibido no seu aplicativo.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isLoading && !qrCodeData && (
                <div className="p-12 text-center">
                  <div className="text-red-500 dark:text-red-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-red-600 dark:text-red-400 font-medium">{verificationResult}</p>
                </div>
              )}
            </>
          )}

          {/* Modo Generate - Gerar Códigos */}
          {mode === 'generate' && (
            <div className="p-8 sm:p-12">
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-4">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Insira sua Chave Secreta</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Cole ou digite a chave secreta (base32) do seu 2FA para gerar códigos em tempo real.
                </p>
                
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={inputSecret}
                      onChange={(e) => {
                        setInputSecret(e.target.value);
                        setError('');
                      }}
                      placeholder="Cole sua chave secreta aqui... (ex: JBSWY3DPEHPK3PXP)"
                      className="w-full px-4 py-3 text-sm font-mono bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <button
                    onClick={generateCodes}
                    disabled={!inputSecret.trim() || isGenerating}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Gerando...</span>
                      </div>
                    ) : (
                      'Gerar Códigos'
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-red-800 dark:text-red-200 font-medium">❌ {error}</p>
                  </div>
                )}
              </div>

              {/* Display dos Códigos */}
              {codeData && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Códigos Gerados</h3>
                    
                    {/* Código Atual */}
                    <div className="mb-8">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border-2 border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">CÓDIGO ATUAL</span>
                        </div>
                        <div className="text-4xl font-mono font-bold text-green-800 dark:text-green-200 tracking-wider mb-4">
                          {codeData.currentCode}
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-green-700 dark:text-green-300">
                            Expira em {codeData.timeRemaining}s
                          </span>
                        </div>
                        <div className="mt-3 bg-green-200 dark:bg-green-800 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${(codeData.timeRemaining / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Informações Adicionais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Próximo Código</div>
                        <div className="text-xl font-mono font-bold text-slate-800 dark:text-slate-200">
                          {codeData.nextCode}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Atualização</div>
                        <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          A cada 30s
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">Nota de Segurança</p>
                          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                            Os códigos são gerados localmente em seu navegador. Sua chave secreta não é enviada para nossos servidores.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}