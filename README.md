# ResQNet

ResQNet is an emergency coordination web app for public help requests, volunteers, incident updates, and a coordinator dashboard.

## Deploy from GitHub with a permanent URL

The project is configured for Render's free web service. Render supplies a stable `onrender.com` address, so you do not need to buy a domain. The included Blueprint builds the Docker image, enables remote coordinator sign-in, and deploys again when changes are pushed to the connected GitHub branch.

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository.
3. When prompted, set `RESQNET_PIN` to a unique password of at least 12 characters. Render generates the application secret.
4. Keep the service on the **Free** plan. Do not add a payment method if you want to avoid charges; free usage limits may suspend the service instead of charging when no payment method is attached.
5. After deployment, open the `onrender.com` address shown by Render. Sign in at `/dashboard`; the dashboard QR image is also available at `/api/access/qr.png`.

The free service has a stable QR destination, but it sleeps after 15 minutes without traffic and may take about a minute to wake. Its filesystem is temporary, so incident data can disappear after a restart, spin-down, or redeploy. This free setup is suitable for a public demo, not for guaranteed 24/7 availability or permanent incident records. See Render's [free service limits](https://render.com/docs/free).

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
