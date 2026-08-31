# SDK release and rollback

## Initial provisioning

1. Authenticate to the intended AWS account and confirm its account ID.
2. Check whether an IAM OIDC provider already exists for GitHub Actions.
3. Bootstrap CDK in `us-east-1` if the account is not already bootstrapped.
4. Deploy `ReservineSdkDistribution`. While ACM validation is pending, add its CNAME to GoDaddy and retain it permanently for renewal.
5. Add the stack's `DnsAlias` CNAME at GoDaddy.
6. Create the protected GitHub environment `sdk-production` and configure its non-secret variables from stack outputs:
   - `AWS_RELEASE_ROLE_ARN`
   - `AWS_ARTIFACT_BUCKET`
   - `AWS_DISTRIBUTION_ID`
7. Bootstrap `@reservine/sdk@1.0.0` interactively if npm requires the first package creation, then configure npm trusted publishers for both `@reservine/sdk` and `reservine-button` against `.github/workflows/release.yml`.
8. Deprecate the unscoped package after its `0.0.25` compatibility release, pointing new consumers to `@reservine/sdk`.

No AWS or npm write token belongs in GitHub. GitHub obtains short-lived AWS credentials through OIDC; npm's trusted publisher accepts the workflow identity directly.

## Release

1. Update the SDK version and changelog-compatible documentation.
2. Merge a green PR.
3. Create and push the matching `vX.Y.Z` tag.
4. The protected workflow builds once, uploads the immutable release, verifies canary bytes, publishes npm packages, promotes the compatible major channel, invalidates only that channel path, and verifies the promoted bytes.

Immutable object:

```text
sdk/releases/X.Y.Z/sdk.js
```

Compatible channel:

```text
sdk/vX.js
```

## Rollback

Run the `Roll back SDK channel` workflow with an existing exact version and channel. It copies the immutable object over the channel, invalidates that single CloudFront path, and compares the served bytes to the selected release.

Do not overwrite or delete immutable releases. They are the rollback source and distribution audit trail.
