# ResQNet

ResQNet is an emergency coordination web app for public help requests, volunteers, incident updates, and a coordinator dashboard.

## Deploy from GitHub with a permanent URL

The project is configured for Render. Render supplies a stable `onrender.com` address, so you do not need to buy a domain. The included Blueprint builds the Docker image, attaches persistent storage for incident data, enables remote coordinator sign-in, and deploys again when changes are pushed to the connected GitHub branch.

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository.
3. When prompted, set `RESQNET_PIN` to a unique password of at least 12 characters. Render generates the application secret.
4. Review the plan and disk charges, then create the service.
5. After deployment, open the `onrender.com` address shown by Render. Sign in at `/dashboard`; the dashboard QR image is also available at `/api/access/qr.png`.

The Blueprint uses a paid always-on web service and a 1 GB persistent disk. Render's free web services sleep when idle and do not preserve local SQLite files, so the free plan is not suitable for a permanent QR with retained incident data. Review the current [Render pricing](https://render.com/pricing) before creating the service.

## Run locally

Build the frontend, then run the FastAPI backend:

```sh
cd frontend
npm install
npm run build
cd ../backend
source .venv/bin/activate
python -m app.main
```

See [backend deployment notes](backend/README.md) for local-network and Docker Compose setup.
