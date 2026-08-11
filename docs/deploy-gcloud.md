# Google Cloud Run deployment setup

This repository includes a GitHub Actions workflow ([`.github/workflows/deploy-cloud-run.yml`](.github/workflows/deploy-cloud-run.yml)) that builds the container image with **Google Cloud Build** and deploys it to **Cloud Run** on every push to `main`.

## Required GitHub secrets

Create these secrets in your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_REGION` | Cloud Run region, e.g. `us-central1` |
| `GCP_SERVICE_ACCOUNT` | Service account email for GitHub Actions (e.g. `myechoboard-deploy@my-project.iam.gserviceaccount.com`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Federation provider name (e.g. `projects/123/locations/global/workloadIdentityPools/github/providers/my-repo`) |
| `AI_PROVIDER` | `ollama`, `api`, `openai`, `anthropic`, `kimi-cli`, `codex-cli`, or `claude-cli` |
| `OLLAMA_HOST` | URL of the Ollama instance (e.g. `https://ollama.example.com`) |
| `OLLAMA_MODEL` | Model name (e.g. `kimi-k2.7-code:cloud`) |
| `OLLAMA_API_KEY` | Ollama API key, or a placeholder like `-` if none |
| `AI_API_KEY` | OpenAI/Anthropic key, or placeholder `-` |
| `AI_API_URL` | API base URL (e.g. `https://api.openai.com/v1`) |
| `AI_API_MODEL` | API model name (e.g. `gpt-4o`) |
| `AI_API_FORMAT` | `openai` or `anthropic` |

For providers you are **not** using, set unused env secrets to `-`. The app ignores them when the provider does not need them.

## GCP setup (one-time)

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1
export REPO=Chiazor-Daniel/myechoBoard

gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com iamcredentials.googleapis.com

# Create a service account for GitHub Actions
gcloud iam service-accounts create myechoboard-deploy \
  --display-name="myechoBoard GitHub deployer"

# Grant it Cloud Build and Cloud Run permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:myechoboard-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:myechoboard-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Allow Cloud Build to push to Container Registry / Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"

# Set up Workload Identity Federation for GitHub (using gcloud)
gcloud iam workload-identity-pools create github \
  --location=global \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --allowed-audiences="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'"

# Allow the service account to be impersonated from GitHub
gcloud iam service-accounts add-iam-policy-binding \
  myechoboard-deploy@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_ID/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

After running the commands, copy the Workload Identity Provider name from the output and save it as `GCP_WORKLOAD_IDENTITY_PROVIDER` in GitHub secrets.

## Deploy

Once the secrets are set, pushing to `main` will automatically trigger Cloud Build and deploy the updated container to Cloud Run.

You can also trigger it manually from the **Actions** tab in GitHub.
