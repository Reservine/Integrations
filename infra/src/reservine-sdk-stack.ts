import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
  aws_s3 as s3
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';

export interface ReservineSdkStackProps extends StackProps {
  githubOidcProviderArn?: string;
}

const domainName = 'cdn.reservine.io';
const githubRepository = 'Reservine/Integrations';

export class ReservineSdkStack extends Stack {
  constructor(scope: Construct, id: string, props: ReservineSdkStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'Artifacts', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns()
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SdkResponseHeaders', {
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlAllowOrigins: ['*'],
        accessControlExposeHeaders: ['ETag'],
        originOverride: true
      },
      customHeadersBehavior: {
        customHeaders: [
          { header: 'Cross-Origin-Resource-Policy', value: 'cross-origin', override: true }
        ]
      },
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
          preload: true
        }
      }
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      certificate,
      comment: 'Reservine browser SDK',
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        responseHeadersPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      domainNames: [domainName],
      enableLogging: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100
    });

    const provider = props.githubOidcProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          'GitHubProvider',
          props.githubOidcProviderArn
        )
      : new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
          clientIds: ['sts.amazonaws.com'],
          url: 'https://token.actions.githubusercontent.com'
        });
    const releaseRole = new iam.Role(this, 'GitHubReleaseRole', {
        assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': `repo:${githubRepository}:environment:sdk-production`
          }
        }),
        description: 'Publishes immutable Reservine SDK releases and promotes compatible channels',
        maxSessionDuration: Duration.hours(1)
    });

    // Publishing never needs deletion. Exact releases additionally use S3's
    // conditional PutObject (`If-None-Match: *`) so an existing version cannot
    // be replaced by the release workflow; bucket versioning remains the final
    // recovery layer for mutable channels.
    bucket.grantPut(releaseRole, 'sdk/*');
    bucket.grantRead(releaseRole, 'sdk/releases/*');
    releaseRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
        resources: [
          `arn:${Stack.of(this).partition}:cloudfront::${Stack.of(this).account}:distribution/${distribution.distributionId}`
        ]
      })
    );

    new CfnOutput(this, 'GitHubReleaseRoleArn', { value: releaseRole.roleArn });

    new CfnOutput(this, 'ArtifactBucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'CertificateArn', { value: certificate.certificateArn });
    new CfnOutput(this, 'CloudFrontDomainName', { value: distribution.distributionDomainName });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'DnsAlias', {
      description: 'Create this CNAME in GoDaddy after ACM validation is complete',
      value: `${domainName} -> ${distribution.distributionDomainName}`
    });
  }
}
