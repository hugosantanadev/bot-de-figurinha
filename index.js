/**
 * Bot de Figurinhas para WhatsApp
 *
 * Transforma fotos e vídeos em figurinhas quadradas (512x512).
 *
 * Regras de uso:
 *  - Privado: qualquer foto ou vídeo vira figurinha.
 *  - Grupo: só quando chamarem com "!fig" (na legenda da mídia
 *    ou respondendo uma mídia já enviada).
 */

// ---------------------------------------------------------------------------
// Importações
// ---------------------------------------------------------------------------

// Client: a conexão com o WhatsApp. LocalAuth: salva a sessão em disco.
// MessageMedia: representa um arquivo (foto, vídeo) pronto para envio.
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

// Desenha o QR code de login no terminal.
const qrcode = require('qrcode-terminal');

// Caminho do executável do ffmpeg baixado pelo npm (usado para vídeos).
const ffmpegPath = require('ffmpeg-static');

// Biblioteca de manipulação de imagens (usada para cortar as fotos).
const sharp = require('sharp');

// Módulos nativos do Node: rodar programas externos, arquivos e caminhos.
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Versão do execFile que funciona com await.
const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

const COMANDO = '!fig';          // Texto que ativa o bot em grupos
const TAMANHO = 512;             // Lado da figurinha, em pixels (padrão do WhatsApp)
const DURACAO_MAXIMA = 5;        // Segundos aproveitados de cada vídeo
const NOME_PACOTE = 'adm é top'; // Nome do pacote de figurinhas
const AUTOR = 'cabo danau';

// ---------------------------------------------------------------------------
// Cliente do WhatsApp
// ---------------------------------------------------------------------------

const client = new Client({
  // Guarda a sessão na pasta .wwebjs_auth, para não pedir o QR toda vez.
  authStrategy: new LocalAuth(),
  // Informa onde está o ffmpeg, necessário para figurinhas animadas.
  ffmpegPath: ffmpegPath,
});

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

/**
 * Corta a mídia em um quadrado central de 512x512.
 * Sem isso, a figurinha ficaria com faixas transparentes nas bordas.
 *
 * @param {MessageMedia} media - Foto ou vídeo baixado do WhatsApp.
 * @returns {Promise<MessageMedia>} A mesma mídia, já quadrada.
 */
async function deixarQuadrada(media) {
  // --- FOTO: corte feito com o sharp ---
  if (media.mimetype.startsWith('image')) {
    // media.data vem em base64 (texto); o sharp precisa dos bytes.
    const entrada = Buffer.from(media.data, 'base64');

    const saida = await sharp(entrada)
      // 'cover' preenche o quadrado inteiro e corta o que sobrar.
      .resize(TAMANHO, TAMANHO, { fit: 'cover' })
      .png()
      .toBuffer();

    // Converte os bytes de volta para base64 e monta a nova mídia.
    return new MessageMedia('image/png', saida.toString('base64'));
  }

  // --- VÍDEO: corte feito com o ffmpeg ---
  // O ffmpeg trabalha com arquivos, então usamos a pasta temporária do sistema.
  const id = Date.now(); // Evita conflito de nomes entre conversões
  const arqEntrada = path.join(os.tmpdir(), `fig-${id}-in.mp4`);
  const arqSaida = path.join(os.tmpdir(), `fig-${id}-out.mp4`);

  fs.writeFileSync(arqEntrada, Buffer.from(media.data, 'base64'));

  try {
    await execFileAsync(ffmpegPath, [
      '-y',                          // Sobrescreve a saída sem perguntar
      '-i', arqEntrada,              // Arquivo de entrada
      '-t', String(DURACAO_MAXIMA),  // Usa só os primeiros segundos
      // crop: recorta um quadrado central com o menor lado do vídeo
      // scale: reduz esse quadrado para 512x512
      '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${TAMANHO}:${TAMANHO}`,
      '-an',                         // Remove o áudio
      '-pix_fmt', 'yuv420p',         // Formato de cor mais compatível
      // Grava o índice do MP4 no começo do arquivo. Sem isso, a biblioteca
      // (que lê o vídeo em fluxo) não consegue interpretá-lo.
      '-movflags', '+faststart',
      arqSaida,
    ]);

    const dados = fs.readFileSync(arqSaida);
    return new MessageMedia('video/mp4', dados.toString('base64'));
  } finally {
    // Apaga os temporários, mesmo se a conversão der erro.
    fs.rmSync(arqEntrada, { force: true });
    fs.rmSync(arqSaida, { force: true });
  }
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Disparado quando é preciso fazer login: mostra o QR code no terminal.
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// Disparado quando a conexão com o WhatsApp está pronta.
client.on('ready', () => {
  console.log('Client is ready!');
});

// Disparado a cada mensagem recebida (privado ou grupo).
client.on('message', async (msg) => {
  // IDs de grupo terminam em @g.us; conversas privadas, não.
  const ehGrupo = msg.from.endsWith('@g.us');

  // msg.body é o texto da mensagem ou a legenda da mídia.
  const ehComando = msg.body.trim().toLowerCase() === COMANDO;

  // Em grupo, o bot só age quando for chamado com o comando.
  if (ehGrupo && !ehComando) return;

  // Por padrão a mídia está na própria mensagem. Se o comando veio como
  // resposta a outra mensagem, a mídia está na mensagem respondida.
  let alvo = msg;
  if (ehComando && msg.hasQuotedMsg) {
    alvo = await msg.getQuotedMessage();
  }

  // Só fotos e vídeos (GIFs chegam como vídeo) viram figurinha.
  const ehMidia = alvo.type === 'image' || alvo.type === 'video';
  if (!ehMidia) {
    // Explica o uso apenas se alguém mandou o comando sem mídia.
    if (ehComando) {
      await msg.reply(
        `Manda uma foto ou vídeo com a legenda ${COMANDO}, ou responde uma mídia com ${COMANDO}.`
      );
    }
    return;
  }

  try {
    // 1. Baixa a mídia dos servidores do WhatsApp.
    const media = await alvo.downloadMedia();

    // 2. Corta em formato quadrado.
    const quadrada = await deixarQuadrada(media);

    // 3. Envia de volta como figurinha, na mesma conversa.
    await client.sendMessage(msg.from, quadrada, {
      sendMediaAsSticker: true,
      stickerName: NOME_PACOTE,
      stickerAuthor: AUTOR,
    });
  } catch (erro) {
    // Um erro em uma figurinha não deve derrubar o bot inteiro.
    console.log('Falha ao criar figurinha:', erro);
    await msg.reply('Não consegui fazer a figurinha, tenta de novo.');
  }
});

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

// Abre o WhatsApp Web invisível e começa a escutar os eventos acima.
client.initialize();