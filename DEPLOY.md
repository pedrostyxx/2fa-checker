# 🚀 Deploy Instructions for Portainer

## Arquivo de Stack para Portainer

Use o arquivo `docker-compose.portainer.yml` para fazer o deploy da aplicação 2FA Checker no seu Portainer.

### 📋 Pré-requisitos

1. **Portainer** configurado e funcionando
2. **Traefik** como reverse proxy
3. **Rede externa** `network_public` configurada
4. **Let's Encrypt** configurado para certificados SSL

### 🔧 Configuração

#### 1. Domínio
- A aplicação será acessível em: `otp.styxx.cloud`
- Certifique-se de que o DNS aponta para seu servidor

#### 2. Recursos
- **Memória**: Mínimo 512MB, Limite 1GB
- **CPU**: Não limitado (pode ajustar conforme necessário)

#### 3. Health Check
- Endpoint: `/api/health`
- Intervalo: 30 segundos
- Timeout: 10 segundos

### 📝 Como fazer o Deploy

1. **Acesse o Portainer**
2. **Vá para Stacks**
3. **Crie nova Stack**
4. **Cole o conteúdo do arquivo** `docker-compose.portainer.yml`
5. **Defina o nome**: `2fa-checker-app`
6. **Deploy**

### ⚙️ Configurações da Stack

```yaml
# Configurações principais
Domain: otp.styxx.cloud
Port: 3000
Environment: production
Auto-sync: 5 minutos
Repository: https://github.com/pedrostyxx/2fa-checker.git
```

### 🔄 Funcionamento

#### Git Sync Service
- **Verifica atualizações** a cada 5 minutos
- **Clone inicial** quando não existe código
- **Pull automático** quando há novas versões
- **Logs detalhados** para debugging

#### App Service
- **Aguarda** o código fonte estar disponível
- **Instala dependências** automaticamente
- **Faz build** da aplicação Next.js
- **Inicia em modo produção**
- **Health checks** contínuos

### 📊 Monitoramento

#### Logs do Git Sync
```bash
[INFO] Verificando atualizações...
[INFO] Nova versão detectada, atualizando...
[INFO] Código atualizado com sucesso!
[INFO] Próxima verificação em 5 minutos...
```

#### Logs da Aplicação
```bash
Aguardando código fonte...
Instalando dependências...
Construindo aplicação...
Iniciando aplicação em modo produção...
> ready - started server on 0.0.0.0:3000
```

### 🛠️ Solução de Problemas

#### Se a aplicação não iniciar:
1. Verifique os logs do git_sync
2. Confirme se o repositório foi clonado
3. Verifique se o package.json existe
4. Confirme se o build foi bem-sucedido

#### Se o health check falhar:
1. Verifique se a porta 3000 está respondendo
2. Teste o endpoint `/api/health` manualmente
3. Verifique os logs da aplicação

#### Se o Traefik não rotear:
1. Confirme se o DNS está configurado
2. Verifique se a rede `network_public` existe
3. Confirme as labels do Traefik

### 🔄 Atualizações Automáticas

A stack está configurada para:
- **Detectar** automaticamente mudanças no GitHub
- **Baixar** novo código automaticamente
- **Reiniciar** a aplicação após atualizações
- **Manter** logs de todas as operações

### 📋 Comandos Úteis

```bash
# Ver logs do git sync
docker service logs stack_git_sync_2fa -f

# Ver logs da aplicação
docker service logs stack_app_2fa_checker -f

# Forçar restart da aplicação
docker service update --force stack_app_2fa_checker

# Ver status dos serviços
docker service ls | grep 2fa
```

### 🔐 Segurança

- **Sem credenciais** expostas nos logs
- **Health checks** sem informações sensíveis
- **Processamento local** das chaves 2FA
- **HTTPS obrigatório** via Traefik

### 🎯 Resultado Final

Após o deploy bem-sucedido:
- ✅ Aplicação disponível em `https://otp.styxx.cloud`
- ✅ Certificado SSL automático
- ✅ Atualizações automáticas do GitHub
- ✅ Health checks funcionando
- ✅ Logs estruturados e informativos