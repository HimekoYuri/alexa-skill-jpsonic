# JPsonic Alexa Skill

同じネットワーク上のJPsonicストリーミングサーバーに接続し、音楽を再生するためのAlexaスキルです。

## 機能

- ランダムアルバム再生
- アーティスト検索
- （将来的に）プレイリスト再生
- （将来的に）ジャンル別再生

## セットアップ方法

### 前提条件

- Amazon開発者アカウント
- AWS アカウント
- JPsonicサーバー（同一ネットワーク上で稼働していること）
- Node.js と npm
- AWS CLI（設定済みであること）

### インストール手順

1. **JPsonicサーバーの設定**

   - JPsonicサーバーがネットワーク上で稼働していることを確認
   - APIアクセス用のユーザーアカウントを作成（または既存のアカウントを使用）

2. **設定ファイルの編集**

   `lambda/index.js` ファイル内の `JPSONIC_CONFIG` オブジェクトを編集して、JPsonicサーバーの情報を設定します：

   ```javascript
   const JPSONIC_CONFIG = {
     baseUrl: 'http://your-jpsonic-server:4040',
     username: 'your-username',
     password: 'your-password'
   };
   ```

3. **CloudFormationを使用したAWS Lambdaへのデプロイ**

   `cloudformation/deploy-package.sh` スクリプトを編集して、S3バケット名を設定します：

   ```bash
   # パッケージングのためのS3バケット
   S3_BUCKET="your-s3-bucket-name"
   ```

   その後、デプロイスクリプトを実行します：

   ```bash
   # スクリプトに実行権限を付与
   chmod +x cloudformation/deploy-package.sh
   
   # デプロイを実行
   ./cloudformation/deploy-package.sh
   ```

   または、インラインコードを使用する場合は以下のスクリプトを使用します：

   ```bash
   chmod +x cloudformation/deploy.sh
   ./cloudformation/deploy.sh
   ```

4. **Alexaスキルの作成**

   - [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) にアクセス
   - 「スキルの作成」をクリック
   - スキル名に「JPソニック」と入力
   - モデルは「カスタム」を選択
   - 「スキルを作成」をクリック
   - 左側のメニューから「JSONエディタ」を選択
   - `models/ja-JP.json` の内容をコピー＆ペースト
   - 「モデルを保存」をクリック
   - 「モデルをビルド」をクリック
   - 「エンドポイント」セクションで、CloudFormationスタックの出力に表示されるLambda関数のARNを入力

5. **Alexaスキルの権限設定**

   CloudFormationテンプレートの `AlexaSkillPermission` リソースを編集して、実際のスキルIDを設定します：

   ```yaml
   EventSourceToken: amzn1.ask.skill.XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   ```

   この値は、Alexa Developer Consoleでスキルを作成した後に取得できます。

6. **テスト**

   - Alexa Developer Consoleの「テスト」タブに移動
   - 「スキルテストを有効にする」をオンに設定
   - マイクアイコンをクリックして「JPソニックを開いて」と話しかける

## 使い方

以下のような音声コマンドが使えます：

- 「アレクサ、JPソニックを開いて」
- 「ランダムアルバムを再生して」
- 「[アーティスト名]を検索して」

## 注意事項

- このスキルは同一ネットワーク上のJPsonicサーバーにのみ接続できます
- インターネット経由でのアクセスには、適切なネットワーク設定（VPNなど）が必要です
- Alexaでストリーミング再生するには、HTTPSが必要です（自己署名証明書では動作しない場合があります）

## トラブルシューティング

- **接続エラー**: JPsonicサーバーのURLとポート番号が正しいか確認してください
- **認証エラー**: ユーザー名とパスワードが正しいか確認してください
- **再生エラー**: JPsonicサーバーがHTTPSで公開されているか確認してください
- **CloudFormationエラー**: AWS CLIが正しく設定されているか、S3バケットが存在するか確認してください
