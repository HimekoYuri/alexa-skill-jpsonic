#!/bin/bash

# スタック名
STACK_NAME="jpsonic-alexa-skill-stack"

# リージョン
REGION="us-east-1"

# パッケージングのためのS3バケット
S3_BUCKET="your-s3-bucket-name"

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

# CloudFormationテンプレートのデプロイ
echo "CloudFormationスタックをデプロイしています..."
aws cloudformation deploy \
  --template-file ../cloudformation/template.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --parameter-overrides \
    LambdaFunctionName="jpsonic-alexa-skill" \
    LambdaRuntime="nodejs16.x"

# Lambda関数のコードを更新
echo "Lambda関数のコードを更新しています..."
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
  --output text \
  --region $REGION)

aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region $REGION

echo "デプロイが完了しました！"
echo "Lambda関数ARN:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
  --output text \
  --region $REGION
