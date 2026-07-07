# Spec 00-infra — AWS Deployment

**Status:** `READY`
**Session:** Before Session 4 (frontend build requires infra running)
**Depends on:** Spec 01 (backend deployable), Spec 02 (at least `/api/doubt/solve` working)

---

## Goal

Deploy the VidyaAI backend and React web frontend on AWS so the product is accessible via browser before the mobile app is built. All subsequent sessions target this web deployment first; mobile is a later phase.

---

## Deployment Architecture

```
Browser / Mobile Web
       │
       ▼
  CloudFront CDN  ─────────────────────────────────┐
  (vidyaai.in)                                      │
       │                                             │
       ├─ /api/* → EC2 (Express backend)             │
       │            ap-south-1                       │
       │                                             │
       └─ /* → S3 (React static build)  ◄────────────┘
                (or served from EC2 in dev)

  EC2 ──────► RDS PostgreSQL (private subnet)
  EC2 ──────► S3 vidyaai-audio (audio files)
  EC2 ──────► Anthropic Claude API (external)
  EC2 ──────► Firebase Admin (external)
  EC2 ──────► AWS Transcribe / Polly (same region)
```

---

## AWS Services Used

| Service | Purpose | Config |
|---------|---------|--------|
| EC2 `t3.small` | Backend Node.js process | ap-south-1, Ubuntu 22.04 LTS |
| RDS `db.t3.micro` PostgreSQL 15 | Application database | Private subnet, no public access |
| S3 `vidyaai-audio` | Audio uploads + Polly responses | Private, CloudFront OAC |
| S3 `vidyaai-web` | React static build hosting | Public static website |
| CloudFront | CDN for web + audio, HTTPS | Origins: vidyaai-web S3 + EC2 ALB |
| ACM | TLS certificate for vidyaai.in | us-east-1 (required by CloudFront) |
| Route 53 | DNS for vidyaai.in | A record → CloudFront |
| ALB | Load balancer in front of EC2 | HTTPS termination, health check `/health` |
| Systems Manager Parameter Store | Secrets (no plaintext .env in EC2) | `SecureString` for all secrets |
| IAM | EC2 instance role | Polly, Transcribe, S3 access — no hardcoded keys |

---

## EC2 Setup

### OS & Runtime
```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### App Deployment
```bash
# Clone repo
git clone https://github.com/<org>/vidyaai.git /home/ubuntu/vidyaai
cd /home/ubuntu/vidyaai/backend

# Install deps
npm ci --omit=dev

# Fetch secrets from SSM Parameter Store into env
aws ssm get-parameters-by-path \
  --path "/vidyaai/prod/" \
  --with-decryption \
  --query "Parameters[*].[Name,Value]" \
  --output text | awk '{ sub("/vidyaai/prod/", "", $1); print $1"="$2 }' > .env

# Run DB migrations
npx prisma migrate deploy

# Start with PM2 (auto-restart on crash + on reboot)
pm2 start dist/index.js --name vidyaai-backend
pm2 save
pm2 startup
```

### PM2 Config (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'vidyaai-backend',
    script: 'dist/index.js',
    instances: 2,               // 2 processes on t3.small
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 },
    max_memory_restart: '400M',
    error_file: '/var/log/vidyaai/error.log',
    out_file:   '/var/log/vidyaai/out.log',
  }]
};
```

---

## Frontend Deployment (React Web)

Build is a static React app, deployed to S3 and served via CloudFront:

```bash
cd frontend
VITE_API_URL=https://api.vidyaai.in npm run build
aws s3 sync dist/ s3://vidyaai-web/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

CloudFront behaviour:
- `/*` → S3 origin (SPA: all 404s rewrite to `index.html`)
- CloudFront function for SPA routing rewrite

---

## SSM Parameters (all `SecureString`)

```
/vidyaai/prod/ANTHROPIC_API_KEY
/vidyaai/prod/DATABASE_URL
/vidyaai/prod/JWT_SECRET
/vidyaai/prod/FIREBASE_PROJECT_ID
/vidyaai/prod/FIREBASE_SERVICE_ACCOUNT_KEY
/vidyaai/prod/TWILIO_ACCOUNT_SID
/vidyaai/prod/TWILIO_AUTH_TOKEN
/vidyaai/prod/TWILIO_WHATSAPP_FROM
/vidyaai/prod/RAZORPAY_KEY_ID
/vidyaai/prod/RAZORPAY_KEY_SECRET
```

EC2 instance role has `ssm:GetParametersByPath` on `/vidyaai/prod/*` only.

---

## Security Groups

| Group | Inbound | Outbound |
|-------|---------|----------|
| ALB SG | 443 from 0.0.0.0/0 | 3000 to EC2 SG |
| EC2 SG | 3000 from ALB SG, 22 from Bastion SG | All |
| RDS SG | 5432 from EC2 SG | None |

No direct public access to EC2 or RDS.

---

## CI/CD (GitHub Actions)

Two workflows:

### `deploy-backend.yml` — triggers on push to `main`
```yaml
jobs:
  deploy:
    steps:
      - Build TypeScript (npm run build)
      - Run tests (npm test)
      - rsync dist/ to EC2 via SSH (stored in GitHub Secrets)
      - SSH: pm2 reload vidyaai-backend
      - SSH: npx prisma migrate deploy
      - Smoke test: curl https://api.vidyaai.in/health
```

### `deploy-frontend.yml` — triggers on push to `main`
```yaml
jobs:
  deploy:
    steps:
      - npm run build (VITE_API_URL from GitHub Secrets)
      - aws s3 sync dist/ s3://vidyaai-web/
      - CloudFront invalidation
```

---

## Domain & DNS

| Record | Type | Value |
|--------|------|-------|
| vidyaai.in | A | CloudFront distribution |
| api.vidyaai.in | A | ALB DNS name |
| www.vidyaai.in | CNAME | vidyaai.in |

HTTPS enforced: CloudFront + ACM cert. HTTP → HTTPS redirect at CloudFront level.

---

## S3 Lifecycle Policies

```json
// vidyaai-audio bucket
{
  "Rules": [
    { "Prefix": "audio/uploads/", "Expiration": { "Days": 7 } },
    { "Prefix": "audio/responses/", "Expiration": { "Days": 7 } }
  ]
}
```

---

## Cost Estimate (Mumbai ap-south-1, ~100 DAU)

| Service | Monthly est. |
|---------|-------------|
| EC2 t3.small (1 instance) | ~₹1,500 |
| RDS db.t3.micro | ~₹1,200 |
| S3 + CloudFront | ~₹200 |
| ALB | ~₹700 |
| **Total** | **~₹3,600/mo** |

Scale to `t3.medium` + RDS `db.t3.small` when DAU > 500.

---

## Acceptance Criteria

- [ ] `GET https://api.vidyaai.in/health` returns `{ status: "ok", db: "connected" }`
- [ ] `https://vidyaai.in` loads the React app over HTTPS
- [ ] HTTP requests to vidyaai.in redirect to HTTPS
- [ ] Pushing to `main` triggers auto-deploy; app is live within 5 minutes
- [ ] RDS is not reachable from public internet (VPC private subnet)
- [ ] EC2 SSH accessible only via Bastion / SSM Session Manager — not port 22 from 0.0.0.0
- [ ] All secrets come from SSM Parameter Store — no `.env` file committed to repo
- [ ] PM2 restarts automatically after EC2 reboot (verify with `pm2 list`)

---

## Dependencies

- AWS account with billing set up in ap-south-1
- Domain `vidyaai.in` registered (Route 53 or transferred)
- GitHub Secrets: `EC2_SSH_KEY`, `EC2_HOST`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `VITE_API_URL`
- Spec 01 backend must build cleanly (`npm run build` passes)
