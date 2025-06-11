#!/bin/bash

# スタック名
STACK_NAME="jpsonic-alexa-skill-stack"

# リージョン
REGION="us-east-1"

# パッケージングのためのS3バケット
S3_BUCKET="your-s3-bucket-name"

# S3キー
S3_KEY="jpsonic-alexa-skill/function.zip"

# 依存関係のインストール
echo "依存関係をインストールしています..."
cd ../lambda
npm install

# Lambda関数のデプロイ用にパッケージング
echo "Lambda関数をパッケージングしています..."
mkdir -p ../build
cd ../build
cp -r ../lambda/* .
zip -r function.zip *

# S3にアップロード
echo "S3にコードをアップロードしています..."
aws s3 cp function.zip s3://$S3_BUCKET/$S3_KEY

# CloudFormationテンプレートのデプロイ
echo "CloudFormationスタックをデプロイしています..."
aws cloudformation deploy \
  --template-file ../cloudformation/package.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --parameter-overrides \
    LambdaFunctionName="jpsonic-alexa-skill" \
    LambdaRuntime="nodejs16.x" \
    S3Bucket=$S3_BUCKET \
    S3Key=$S3_KEY

echo "デプロイが完了しました！"
echo "Lambda関数ARN:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
  --output text \
  --region $REGION
