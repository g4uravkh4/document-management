# CA Firm Document Management

A document management application for CA firms, with a NestJS API, Next.js web client, PostgreSQL database, email verification, and persistent file storage.

## Stack

- API: NestJS, Prisma, PostgreSQL
- Web: Next.js, React
- Storage: local disk in development or S3-compatible storage in production
- Mail: SMTP provider such as Brevo or Resend

## Local setup

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Generate Prisma Client and apply local migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the API and web client:

   ```bash
   npm run dev
   ```

The web client runs at `http://localhost:3001`, the API at `http://localhost:3000/api`, and Swagger at `http://localhost:3000/api/docs`.

## Checks

```bash
npm test -- --passWithNoTests
npm run build
npm run build:web
```

GitHub Actions runs these checks for pull requests and pushes.

## Free deployment architecture

The recommended free-tier setup is:

- GitHub for source control and Actions
- Supabase for PostgreSQL and S3-compatible Storage
- Render for the NestJS API
- Vercel for the Next.js client
- Brevo for SMTP email

Free tiers can sleep, have quotas, and are not a guarantee of zero cost. Check each provider's current limits before using the application with real client documents.

## Step-by-step deployment

### 1. Push to GitHub

Create an empty GitHub repository, then run:

```powershell
git add .
git commit -m "Prepare application for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Do not commit `.env` files or provider credentials.

### 2. Create the Supabase database

1. Create a Supabase project.
2. Open **Project Settings > Database**.
3. Copy the connection string appropriate for your deployment. For pooled connections, use the transaction pooler URL and replace its password.
4. Save it for Render as `DATABASE_URL`.

### 3. Create persistent file storage

1. In Supabase Storage, create a private bucket named `ca-firm-files`.
2. Open the Storage S3 connection settings.
3. Save the endpoint, region, bucket name, access key, and secret key.
4. Render will use:

   ```env
   STORAGE_DRIVER=s3
   S3_ENDPOINT=your-s3-endpoint
   S3_REGION=auto
   S3_BUCKET=ca-firm-files
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_FORCE_PATH_STYLE=false
   ```

The bucket stays private. Authenticated API endpoints stream files to users.

### 4. Configure SMTP email

Create and verify a sender with Brevo or another transactional email provider. Use the provider's SMTP credentials, not your normal account password:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-provider-login
SMTP_PASS=your-smtp-key
MAIL_FROM=your-verified-sender@example.com
```

Without `SMTP_HOST`, the API only logs verification codes and is not suitable for production.

### 5. Deploy the API to Render

Create a Render **Web Service** connected to the GitHub repository:

```text
Root Directory: leave empty
Runtime: Node
Build Command: npm install && npm run build
Start Command: npx prisma migrate deploy && npm run start:prod
Instance Type: Free
```

Add all production values from `.env.example` in Render's environment settings. Initially set `CORS_ORIGIN` to a temporary value; update it after Vercel gives you the final client URL. The API URL will look like:

```text
https://your-api.onrender.com
```

Test `https://your-api.onrender.com/api/health` before deploying the client.

### 6. Deploy the client to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Select Next.js.
4. Add `API_BASE_URL=https://your-api.onrender.com` as an environment variable.
5. Deploy. The client URL will look like `https://your-client.vercel.app`.

### 7. Finish CORS configuration

In Render, set:

```env
CORS_ORIGIN=https://your-client.vercel.app
```

Save and redeploy the API. Use a comma-separated list if more than one trusted frontend origin is needed.

### 8. Create the first administrator

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in Render. Run the seed command once from a trusted environment using the production `DATABASE_URL`:

```bash
npm run db:seed
```

Never use the example password in production.

### 9. Verify the deployment

Test registration, email verification, login, password reset, client creation, avatar upload, logo upload, document upload, document download, deletion, and a full API redeploy. Files must still download after the redeploy.

### Client account access

A client user can only see documents belonging to the Client record linked to
that user. After a client registers and verifies their email, an administrator
must open **Users**, edit the user, set the role to `CLIENT`, and select the
matching client. Documents uploaded for a different client are intentionally
not visible to that account.

## GitHub Actions CI/CD

The workflow at `.github/workflows/ci-cd.yml` runs automatically on pull requests and pushes. It installs dependencies, generates Prisma Client, runs tests, builds the API, and builds the web client.

To let the workflow trigger production deployments after a successful `main` branch build:

1. Create a Render deploy hook for the API.
2. Create a Vercel deploy hook for the client.
3. In GitHub, open **Settings > Secrets and variables > Actions**.
4. Add repository secrets named `RENDER_DEPLOY_HOOK_URL` and `VERCEL_DEPLOY_HOOK_URL`.

The deployment job skips either provider when its secret is absent. CI works immediately, while CD can be enabled one provider at a time.

## Environment reference

See `.env.example` and `client/.env.example`. Secrets belong in local ignored `.env` files or the hosting provider's secret manager, never in Git.
