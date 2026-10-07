const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ffmpegPath = require('ffmpeg-static');

//vai pegar o qrcode pra conectar ewm alguma conta do zap

const client = new Client({
  authStrategy: new LocalAuth(),
  ffmpegPath: ffmpegPath,
});
// ffmpeg pra converter vídeos em stickers
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

//client.on faz algo quando recebe uma mensagem, ve se ela é foto ouvideo e depois faz algo e nesse caso faz figurinha

/*client.on('message', async (msg) => {
  console.log('De:', msg.from, '| Tipo:', msg.type, '| Texto:', msg.body);

  if (msg.body === 'eu te amo') {
    await msg.reply('to sem tempo, quero estudar');
  }
});

*/

client.on('message', async (msg) => {
  const ehGrupo = msg.from.endsWith('@g.us');
  const ehComando = msg.body.trim().toLowerCase() === '!fig';

  // Em grupo, só age se chamarem com !fig
  if (ehGrupo && !ehComando) return;

  // Se o comando veio respondendo outra mensagem, a mídia está nela
  let alvo = msg;
  if (ehComando && msg.hasQuotedMsg) {
    alvo = await msg.getQuotedMessage();
  }

  // Confere se é foto ou vídeo
  const ehMidia = alvo.type === 'image' || alvo.type === 'video';
  if (!ehMidia) {
    if (ehComando) {
      await msg.reply('Manda uma foto ou vídeo com a legenda !fig, ou responde uma mídia com !fig.');
    }
    return;
  }

  // Faz a figurinha
  try {
    const media = await alvo.downloadMedia();

    await client.sendMessage(msg.from, media, {
      sendMediaAsSticker: true,
      stickerName: 'Figs do Hugo',
      stickerAuthor: 'Bot',
    });
  } catch (erro) {
    console.log('Falha ao criar figurinha:', erro);
    await msg.reply('Não consegui fazer a figurinha, tenta de novo.');
  }
});

client.initialize();

