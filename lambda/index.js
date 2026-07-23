// JPsonic Alexa Skill
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const crypto = require('crypto');

// Subsonic API バージョン / クライアント識別子
const API_VERSION = '1.13.0';
const CLIENT_NAME = 'AlexaSkill';

// JPsonicサーバーの設定（環境変数から取得）
const JPSONIC_CONFIG = {
  baseUrl: process.env.JPSONIC_BASE_URL || 'https://your-jpsonic-server:4040',
  username: process.env.JPSONIC_USERNAME || '',
  password: process.env.JPSONIC_PASSWORD || ''
};

// Subsonic API の認証パラメータを生成する。
//
// 平文パスワードを p= で送る旧方式は、URLがサーバーのアクセスログ・中間
// プロキシ・Alexa側のログに残るためパスワードが恒久的に漏れる。API 1.13.0
// 以降がサポートするトークン認証 (t = md5(password + salt), s = salt) を
// 使い、リクエストごとにソルトを変えて平文を送らないようにする。
//
// 注: md5 は Subsonic API 仕様で固定されており選択の余地がない。ソルトが
// 毎回変わるためリプレイと総当たりの実用性は下がるが、通信路の秘匿は
// HTTPS に依存する（JPSONIC_BASE_URL は必ず https を指定すること）。
function buildAuthParams() {
  const salt = crypto.randomBytes(16).toString('hex');
  const token = crypto
    .createHash('md5')
    .update(JPSONIC_CONFIG.password + salt)
    .digest('hex');

  return {
    u: JPSONIC_CONFIG.username,
    t: token,
    s: salt,
    v: API_VERSION,
    c: CLIENT_NAME
  };
}

// JPsonicへの認証とAPIリクエスト用のヘルパー関数
const jpsonicApi = {
  // 認証トークンを取得
  async authenticate() {
    try {
      const response = await axios.get(`${JPSONIC_CONFIG.baseUrl}/rest/ping.view`, {
        params: {
          ...buildAuthParams(),
          f: 'json'
        }
      });

      if (response.data['subsonic-response'].status === 'ok') {
        return true;
      }
      return false;
    } catch (error) {
      console.error('認証エラー:', error);
      return false;
    }
  },
  
  // アルバムリストを取得
  async getAlbums(limit = 10) {
    try {
      const response = await axios.get(`${JPSONIC_CONFIG.baseUrl}/rest/getAlbumList2.view`, {
        params: {
          ...buildAuthParams(),
          f: 'json',
          type: 'random',
          size: limit
        }
      });
      
      return response.data['subsonic-response'].albumList2.album;
    } catch (error) {
      console.error('アルバム取得エラー:', error);
      return [];
    }
  },
  
  // アーティストリストを取得
  async getArtists() {
    try {
      const response = await axios.get(`${JPSONIC_CONFIG.baseUrl}/rest/getArtists.view`, {
        params: {
          ...buildAuthParams(),
          f: 'json'
        }
      });
      
      return response.data['subsonic-response'].artists.index;
    } catch (error) {
      console.error('アーティスト取得エラー:', error);
      return [];
    }
  },
  
  // アーティストの曲を取得
  async getArtistSongs(artistId) {
    try {
      const response = await axios.get(`${JPSONIC_CONFIG.baseUrl}/rest/getArtist.view`, {
        params: {
          ...buildAuthParams(),
          f: 'json',
          id: artistId
        }
      });
      
      return response.data['subsonic-response'].artist;
    } catch (error) {
      console.error('アーティスト曲取得エラー:', error);
      return null;
    }
  },
  
  // 曲の再生URLを取得
  //
  // このURLはAlexaデバイスへ返され再生に使われるため、平文パスワードを
  // 載せてはいけない。トークン認証のパラメータを使い、値は URLSearchParams
  // でエスケープする（songId をそのまま連結するとパラメータ注入になる）。
  getStreamUrl(songId) {
    const params = new URLSearchParams({
      ...buildAuthParams(),
      id: songId
    });

    return `${JPSONIC_CONFIG.baseUrl}/rest/stream.view?${params.toString()}`;
  }
};

// 起動時のハンドラー
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speakOutput = 'JPソニックへようこそ。アルバム再生、アーティスト検索などができます。何をしますか？';
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

// ランダムアルバム再生ハンドラー
const PlayRandomAlbumIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayRandomAlbumIntent';
  },
  async handle(handlerInput) {
    try {
      // 認証確認
      const isAuthenticated = await jpsonicApi.authenticate();
      if (!isAuthenticated) {
        return handlerInput.responseBuilder
          .speak('JPソニックサーバーに接続できませんでした。設定を確認してください。')
          .getResponse();
      }
      
      // ランダムアルバムを取得
      const albums = await jpsonicApi.getAlbums(1);
      if (!albums || albums.length === 0) {
        return handlerInput.responseBuilder
          .speak('アルバムが見つかりませんでした。')
          .getResponse();
      }
      
      const album = albums[0];
      const speakOutput = `${album.artist}の${album.name}を再生します。`;
      
      // TODO: 実際の再生機能を実装する
      // 注: Alexaでストリーミング再生するには、HTTPS URLが必要です
      
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    } catch (error) {
      console.error('エラー:', error);
      return handlerInput.responseBuilder
        .speak('エラーが発生しました。もう一度お試しください。')
        .getResponse();
    }
  }
};

// アーティスト検索ハンドラー
const SearchArtistIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SearchArtistIntent';
  },
  async handle(handlerInput) {
    try {
      const artistName = Alexa.getSlotValue(handlerInput.requestEnvelope, 'artist');
      
      if (!artistName) {
        return handlerInput.responseBuilder
          .speak('アーティスト名を教えてください。')
          .reprompt('検索したいアーティスト名は何ですか？')
          .getResponse();
      }
      
      // 認証確認
      const isAuthenticated = await jpsonicApi.authenticate();
      if (!isAuthenticated) {
        return handlerInput.responseBuilder
          .speak('JPソニックサーバーに接続できませんでした。設定を確認してください。')
          .getResponse();
      }
      
      // アーティスト一覧を取得して検索
      const artistIndexes = await jpsonicApi.getArtists();
      let foundArtist = null;
      
      // アーティスト名で検索
      for (const index of artistIndexes) {
        for (const artist of index.artist) {
          if (artist.name.toLowerCase().includes(artistName.toLowerCase())) {
            foundArtist = artist;
            break;
          }
        }
        if (foundArtist) break;
      }
      
      if (!foundArtist) {
        return handlerInput.responseBuilder
          .speak(`${artistName}というアーティストは見つかりませんでした。`)
          .getResponse();
      }
      
      const speakOutput = `${foundArtist.name}が見つかりました。アルバム数は${foundArtist.albumCount}です。`;
      
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('他に何かしますか？')
        .getResponse();
    } catch (error) {
      console.error('エラー:', error);
      return handlerInput.responseBuilder
        .speak('エラーが発生しました。もう一度お試しください。')
        .getResponse();
    }
  }
};

// ヘルプハンドラー
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'このスキルでは、JPソニックサーバーの音楽を再生できます。「ランダムアルバムを再生して」や「アーティスト検索」と言ってみてください。';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

// キャンセルと停止のハンドラー
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'さようなら！';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

// セッション終了ハンドラー
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`セッション終了理由: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

// エラーハンドラー
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`エラーが発生しました: ${error.message}`);
    const speakOutput = 'すみません、リクエストの処理中にエラーが発生しました。もう一度お試しください。';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

// スキルビルダー
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayRandomAlbumIntentHandler,
    SearchArtistIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
