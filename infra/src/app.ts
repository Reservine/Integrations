import { App } from 'aws-cdk-lib';

import { ReservineSdkStack } from './reservine-sdk-stack';

const app = new App();
const account = app.node.tryGetContext('account') as string | undefined;
const githubOidcProviderArn = app.node.tryGetContext('githubOidcProviderArn') as string | undefined;

new ReservineSdkStack(app, 'ReservineSdkDistribution', {
  env: {
    account: account ?? process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  githubOidcProviderArn
});
