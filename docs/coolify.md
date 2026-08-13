# Coolify Deployment

Use `docker-compose.coolify.yml` as the Docker Compose file.

## Services

- Assign the public domain only to the `web` service.
- Domain: `https://kebomon.store`
- Container port: `80`

The `web` nginx container proxies:

- `/api/` to the `api` service
- `/socket.io/` to the `api` service
- `/admin/` to the `admin` service

## Environment Variables

Copy the values from `.env.coolify.example` into Coolify's environment variables.

Required values:

```env
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=
JWT_SECRET=
VITE_API_BASE_URL=https://kebomon.store
CORS_ORIGINS=https://kebomon.store
```

Optional integrations:

```env
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_IDS=
RESEND_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
```

## Notes

- The Coolify compose file does not publish host ports. Let Coolify's proxy route traffic to the `web` service.
- MySQL data is stored in the named Docker volume `mysql-data`.
- The Coolify admin nginx config does not use `deploy/admin.htpasswd`; admin access is protected by the app's own admin login.

## CI/CD

Coolify is the production deployment owner.

Recommended setup:

1. Create the resource from the GitHub repository using the GitHub App integration.
2. Set the tracked branch to `main`.
3. Set the build pack to Docker Compose.
4. Set the compose file to `docker-compose.coolify.yml`.
5. Open the application `Advanced` settings and enable `Auto Deploy`.
6. Keep the public domain assigned only to the `web` service.

After this, every push to `main` triggers a Coolify deployment.

The GitHub Actions workflow `.github/workflows/deploy.yml` is now manual-only and should be treated as a legacy EC2 fallback. Do not re-enable its `push` trigger while Coolify owns production deployment.

The GitHub Actions workflow `.github/workflows/ci.yml` remains the PR validation workflow.
