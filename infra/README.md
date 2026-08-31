# Reservine SDK AWS infrastructure

The `ReservineSdkDistribution` CDK stack creates:

- a private, encrypted, versioned S3 artifact bucket retained on stack deletion;
- a CloudFront distribution with Origin Access Control, compression, CORS, TLS, and access logs;
- an ACM certificate for `cdn.reservine.io` in `us-east-1`;
- a least-privilege GitHub OIDC role restricted to the protected `sdk-production` environment.

`reservine.io` remains authoritative at GoDaddy. During the initial deployment, ACM exposes a validation CNAME that must be added there. After deployment, add the emitted `DnsAlias` CNAME as well.

If the AWS account already has the GitHub Actions OIDC provider, pass its ARN:

```text
bun run infra -- deploy -c account=<account-id> -c githubOidcProviderArn=<provider-arn>
```

If it does not exist, omit the provider context and the stack creates it.

Always inspect `bun run infra -- diff` before deployment. Never destroy this stack to repair a failure: its artifact and logging buckets are retained production data.
