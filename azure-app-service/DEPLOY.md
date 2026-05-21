# Deploying to Azure App Service (Linux, Node) with Datadog APM

This guide deploys the Next.js app as a **Linux Web App** on Azure App Service,
instrumented by the **Datadog Azure App Service extension**.

## Prerequisites

- An Azure subscription and resource group
- A Datadog API key (from your dogfood org)
- The deployment zip: `dist/stock-summary-deploy.zip`
  - Already built — see "Rebuilding the zip" below to regenerate

## 1. Create the Linux Web App

In the Azure Portal → **Create a resource** → **Web App**:

| Setting              | Value                                          |
| -------------------- | ---------------------------------------------- |
| Publish              | **Code**                                       |
| Runtime stack        | **Node 20 LTS** (or newer)                     |
| Operating System     | **Linux**                                      |
| Region               | Your choice                                    |
| Pricing plan         | B1 or higher (F1 free tier works but is slow)  |

Or via CLI:

```bash
az group create -n stock-summary-rg -l eastus
az appservice plan create -g stock-summary-rg -n stock-summary-plan --is-linux --sku B1
az webapp create -g stock-summary-rg -p stock-summary-plan -n <your-app-name> --runtime "NODE:20-lts"
```

## 2. Configure the startup command

App Service → **Configuration** → **General settings** → **Startup Command**:

```
node server.js
```

The zip extracts `server.js` at the site root, which is the Next.js standalone
entrypoint. It binds to `process.env.PORT` automatically (App Service sets it).

## 3. Application Settings (env vars)

App Service → **Configuration** → **Application settings** → **+ New application setting**.

### Required for the app

| Name                                 | Value                       | Notes                                       |
| ------------------------------------ | --------------------------- | ------------------------------------------- |
| `WEBSITE_NODE_DEFAULT_VERSION`       | `~20`                       | Pin Node major                              |
| `SCM_DO_BUILD_DURING_DEPLOYMENT`     | `false`                     | Zip already contains a built bundle         |
| `ENABLE_ORYX_BUILD`                  | `false`                     | Same — skip Oryx's build step               |
| `WEBSITES_PORT`                      | `8080`                      | Only needed if you override `PORT`; usually skip |

### Required for the Datadog App Service Extension

| Name                          | Value                                | Notes                                                              |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `DD_API_KEY`                  | `<your-api-key>`                     | **Secret — use Key Vault reference in prod**                       |
| `DD_SITE`                     | `datadoghq.com`                      | Your dogfood site (US1)                                            |
| `DD_SERVICE`                  | `stock-summary`                      | Service name shown in Datadog APM                                  |
| `DD_ENV`                      | `azure`                              | Or `prod`, `staging`, etc.                                         |
| `DD_VERSION`                  | `0.1.0`                              | Bump on each release for deployment tracking                       |
| `DD_TRACE_ENABLED`            | `true`                               | Master switch for APM                                              |
| `DD_LOGS_INJECTION`           | `true`                               | Adds trace_id/span_id to logs                                      |
| `DD_RUNTIME_METRICS_ENABLED`  | `true`                               | Node event-loop, GC, heap metrics                                  |
| `DD_PROFILING_ENABLED`        | `false`                              | Set `true` only if you want continuous profiling                   |
| `DD_AAS_INSTANCE_LOGGING_ENABLED` | `true`                           | App Service instance logs to Datadog                               |

### Activating the Datadog App Service Extension

After the app is created and settings above are in place:

1. App Service → **Extensions** (or **Site Extensions** on the legacy Kudu portal)
2. Add **Datadog APM** extension (for Linux: it's installed via App Settings rather
   than the Extensions blade; setting `DD_API_KEY` + `DD_SITE` is the trigger).
3. Restart the Web App so the extension picks up the new env vars.
4. Trigger traffic by visiting the site and searching a ticker.
5. In Datadog → **APM → Services**, look for `stock-summary` with env tag `azure`.

> **Linux Note:** On Linux App Service, the Datadog "extension" is delivered as an
> injection layer activated by the `DD_*` App Settings — there's no separate
> extension to install from the Extensions blade. Just set the vars and restart.
> See the [Datadog Azure App Service docs](https://docs.datadoghq.com/serverless/azure_app_services/)
> for the current mechanism for your runtime.

## 4. Upload the zip

### Option A — Azure Portal (manual)
1. App Service → **Deployment Center** → **Manual Deployment** → **Zip Deploy**
2. Or: `https://<your-app-name>.scm.azurewebsites.net/ZipDeployUI`
3. Drag `dist/stock-summary-deploy.zip` into the page

### Option B — `az` CLI
```bash
az webapp deploy \
  --resource-group stock-summary-rg \
  --name <your-app-name> \
  --src-path dist/stock-summary-deploy.zip \
  --type zip
```

### Option C — VS Code Azure extension
Right-click the zip → **Deploy to Web App** → pick the target.

## 5. Verify

```bash
# Replace <your-app-name>
curl https://<your-app-name>.azurewebsites.net/api/stock?symbol=AAPL
```

Open the site in a browser and try a few tickers. Within ~1–2 minutes, traces
should appear in Datadog APM under service `stock-summary`.

## Rebuilding the zip

```bash
bash scripts/build-deploy-zip.sh
```

This cleans, runs `npm ci` + `npm run build`, copies static assets into the
standalone bundle, and produces `dist/stock-summary-deploy.zip`.

## What's in the zip

The Next.js **standalone** output (`output: "standalone"` in `next.config.ts`)
produces a minimal Node server:

```
server.js                    # Next.js entrypoint — what `node server.js` runs
package.json                 # Minimal runtime package.json
node_modules/                # Tree-shaken: only deps actually used by routes
.next/                       # Compiled server + static manifests
.next/static/                # Hashed CSS/JS bundles served at /_next/static
public/                      # Public assets (favicons, etc.)
```

Total: ~11 MB, ~1,800 files.

## Local dev vs production tracing

- **Local dev** (`npm run dev`): tracer initialized via `NODE_OPTIONS=--require dd-trace/init`
  in `package.json`. Sends to a local Datadog Agent on `127.0.0.1:8126`.
- **Production on App Service**: the Datadog App Service extension injects the
  tracer at process start using the `DD_*` App Settings. **Do not** set
  `NODE_OPTIONS` on App Service — it conflicts with the extension's injection.
  The `start` script in `package.json` is `node server.js` for this reason.
