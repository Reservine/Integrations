import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';

import { ReservineSdkStack } from './reservine-sdk-stack';

function synthesize(githubOidcProviderArn?: string): Template {
  const app = new App();
  const stack = new ReservineSdkStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    githubOidcProviderArn
  });
  return Template.fromStack(stack);
}

describe('Reservine SDK infrastructure', () => {
  it('keeps artifacts private and serves them through CloudFront OAC', () => {
    const template = synthesize();

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } })
        ])
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      },
      VersioningConfiguration: { Status: 'Enabled' }
    });
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['cdn.reservine.io'],
        Enabled: true,
        HttpVersion: 'http2and3'
      })
    });
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        CustomHeadersConfig: {
          Items: Match.arrayWith([
            {
              Header: 'Cross-Origin-Resource-Policy',
              Override: true,
              Value: 'cross-origin'
            }
          ])
        },
        SecurityHeadersConfig: Match.objectLike({
          ContentTypeOptions: { Override: true }
        })
      })
    });
  });

  it('exposes resource timing to every embedding origin next to the CORS headers', () => {
    synthesize().hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: Match.objectLike({
        CorsConfig: Match.objectLike({
          AccessControlAllowOrigins: { Items: ['*'] },
          AccessControlExposeHeaders: { Items: ['ETag'] }
        }),
        CustomHeadersConfig: {
          Items: Match.arrayWith([{ Header: 'Timing-Allow-Origin', Override: true, Value: '*' }])
        }
      })
    });
  });

  it('scopes the optional release role to the protected GitHub environment', () => {
    const providerArn = 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com';
    const template = synthesize(providerArn);

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: {
              StringEquals: Match.objectLike({
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub':
                  'repo:Reservine/Integrations:environment:sdk-production'
              })
            },
            Effect: 'Allow',
            Principal: { Federated: providerArn }
          })
        ])
      }
    });

    const policies = template.findResources('AWS::IAM::Policy');
    const statements = Object.values(policies).flatMap((policy) =>
      policy.Properties.PolicyDocument.Statement as Array<{ Action: string | string[] }>
    );
    expect(statements.flatMap(({ Action }) => Action)).not.toContain('s3:DeleteObject*');
  });

  it('creates the GitHub provider when the account does not already have one', () => {
    const template = synthesize();
    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
      ClientIDList: ['sts.amazonaws.com'],
      Url: 'https://token.actions.githubusercontent.com'
    });
  });
});
