# Bot de Figurinhas para WhatsApp

Bot que transforma fotos e vídeos em figurinhas do WhatsApp. Feito em Node.js com a biblioteca [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js).

## Como funciona

O bot abre um WhatsApp Web invisível, faz login pelo QR code e fica esperando mensagens. Quando chega uma foto ou vídeo, ele baixa a mídia, converte para o formato de figurinha (WebP 512x512) e devolve na mesma conversa.

| Onde | O que mandar | Resultado |
|---|---|---|
| Privado | Foto ou vídeo | Figurinha |
| Grupo | Foto ou vídeo com a legenda `!fig` | Figurinha |
| Grupo | `!fig` respondendo uma foto ou vídeo | Figurinha |

Vídeos e GIFs viram figurinha animada. Use vídeos curtos (poucos segundos).

## Requisitos

- [Node.js](https://nodejs.org) (versão LTS)
- Um número de WhatsApp para ser o bot (de preferência um número secundário)

## Como rodar

1. Instale as dependências na pasta do projeto:

   ```bash
   npm install
   ```

   No PowerShell do Windows, se o `npm` for bloqueado, use `npm.cmd install`.

2. Inicie o bot:

   ```bash
   node index.js
   ```

3. Escaneie o QR code que aparece no terminal: WhatsApp > Aparelhos conectados > Conectar um aparelho.

4. Quando aparecer `Client is ready!`, o bot está funcionando.

A sessão fica salva na pasta `.wwebjs_auth`, então o QR só é pedido na primeira vez. Para parar o bot, use `Ctrl + C`.

## Dependências

- `whatsapp-web.js`: conexão com o WhatsApp e conversão em figurinha
- `qrcode-terminal`: mostra o QR code no terminal
- `ffmpeg-static`: converte vídeo em figurinha animada

## Problemas comuns

**Erro ao baixar a mídia (bot conecta, mas a figurinha falha).** O WhatsApp Web muda com frequência e pode quebrar a biblioteca. Atualize para a versão mais recente do GitHub:

```bash
npm install https://github.com/wwebjs/whatsapp-web.js/tarball/main
```

**O bot para quando fecho o terminal.** Ele só funciona enquanto o `node index.js` estiver rodando. Para manter em segundo plano, use o [pm2](https://pm2.keymetrics.io):

```bash
npm install -g pm2
pm2 start index.js --name bot-fig
```

## Aviso

A `whatsapp-web.js` não é uma biblioteca oficial do WhatsApp. Existe risco de o número ser banido, por isso evite usar seu número pessoal.

## Se for publicar no GitHub

Crie um arquivo `.gitignore` com o conteúdo abaixo, para não subir as dependências nem a sua sessão do WhatsApp:

```
node_modules/
.wwebjs_auth/
.wwebjs_cache/
```
