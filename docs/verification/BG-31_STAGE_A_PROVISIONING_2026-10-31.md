# BG-31 stage-A resource creation — October 31, 2026

**Result:** The two explicitly authorized resources were created and read back
in account `a9482fbfb91ace26dee097cbd41293f9` using Wrangler 4.116.0.
OAuth login was verified first. Name-collision checks found neither target.

The owner explicitly authorized creating one D1 database and one private Standard
R2 bucket in the verified account, leaving existing resources untouched. The
prior decision accepted metered R2 risk for the reviewed deployment plan.
This record is not approval of migrations, Worker deployment or provider sends.

| Resource                  | Verified result                                           |
| ------------------------- | --------------------------------------------------------- |
| D1 name                   | `recollect-flow-prod-v2`                                  |
| D1 UUID                   | `76bd35c6-c833-4987-a47e-6aa8238bb832`                    |
| D1 creation region        | APAC (automatically selected; no location hint requested) |
| R2 name                   | `recollect-flow-attachments-prod-v2`                      |
| R2 default storage class  | Standard                                                  |
| R2 location               | APAC                                                      |
| R2 creation timestamp     | `2026-10-31T16:52:11.623Z`                                |
| R2 public development URL | Disabled, verified with `r2 bucket dev-url get`           |
| R2 custom domains         | None, verified with `r2 bucket domain list`               |
| R2 usage metadata         | Zero objects, zero bytes at inspection                    |

Commands executed with the account explicitly pinned:

```bash
CLOUDFLARE_ACCOUNT_ID=a9482fbfb91ace26dee097cbd41293f9 \
  ./node_modules/.bin/wrangler d1 create recollect-flow-prod-v2 --update-config=false

CLOUDFLARE_ACCOUNT_ID=a9482fbfb91ace26dee097cbd41293f9 \
  ./node_modules/.bin/wrangler r2 bucket create recollect-flow-attachments-prod-v2 \
  --storage-class Standard --update-config=false
```

Before/after D1 inventory matched the previous name/UUID set plus exactly the
new database. Before/after R2 inventory matched the previous bucket-name set
plus exactly the new bucket. No mutation command targeted the BG-29 database,
BG-29 Worker or `propertyos-media`. No subscription upgrade, object upload,
SQL execution, migrations, credential provisioning, binding/config change,
Worker upload, DNS operation, billing alert or external-provider action was
performed. Bucket usage was read from metadata; no object listing/read occurred.

Private raw command/readback evidence is ignored under
`.wrangler/bg31-stage-a-20261031/`. No credentials are included in this document.

**Next:** Prepare stage B of the
[Cloudflare review packet](../releases/BG-31_CLOUDFLARE_REVIEW_2026-10-31.md):
inspect the actual new D1 baseline read-only, reconcile disabled integrations
and required secrets, prepare canonical binding changes, review the migration
delta, freeze artifacts and obtain exact-candidate CI and release authorization.
The schema/ledger was not queried in stage A; do not infer its migration state
from creation success. The actual new Web origin/version has not been deployed
or verified. No canonical live/authorization gate is silently closed here.
