# ResQNet local network access

## Run the app

From the project folder, build the frontend once (and again after frontend changes), then start the backend:

```sh
cd frontend
npm install
npm run build
cd ../backend
source .venv/bin/activate
python -m app.main
```

The backend prints the phone access URL. Open `http://localhost:8000/dashboard` on the host computer to sign in as coordinator. After signing in, the dashboard shows a QR code and the same public access URL to share with other devices.

## Connect phones

The host computer and phones must be on the same local network, such as the same Wi-Fi router or a hotspot created by one of the devices. Scan the dashboard QR code or type the displayed URL into the phone's browser. The phone opens the public ResQNet app; the coordinator dashboard remains available on the host computer.

A QR code only carries the server address. It does not make a local server reachable across a 2 km distance or through the internet. For people on different networks, host ResQNet on a server reachable to them or set up a VPN; then use that server's reachable URL.

## Keep the local address stable

By default, ResQNet detects the host's current local IPv4 address and uses port `8000`. The address can change when the computer changes Wi-Fi/hotspot, the network adapter changes, or the router assigns a different DHCP lease. The displayed URL is regenerated from the current address while the app runs; restart the app after changing networks.

For a more stable local address, either:

- Create a DHCP reservation for the host computer in the router or hotspot settings, so it keeps the same local IP; or
- Configure a local hostname that phones on that network can resolve, then start the backend with `RESQNET_PUBLIC_URL` set to its full URL. For example, macOS devices on the same network may resolve the host's Bonjour name such as `http://my-mac.local:8000`:

  ```sh
  cd backend
  RESQNET_PUBLIC_URL=http://my-mac.local:8000 python -m app.main
  ```

Use the actual hostname for the host computer. `.local` resolution depends on Bonjour/mDNS support on the network and phone, so test it from a phone before relying on it. A DHCP reservation is generally more reliable on a private router. Changing networks may still make a hostname or reserved address unavailable.

If the phone cannot connect, confirm both devices are on the same Wi-Fi/hotspot, the displayed URL uses the host's current address, and the host firewall allows incoming connections on port `8000`.

## Host ResQNet at a permanent public address

The repository includes a Docker Compose deployment for one public server. It builds the frontend and backend together, puts Caddy in front for HTTPS, stores the SQLite database in a persistent Docker volume, and keeps the configured domain as the QR target. Incident updates continue to use the same domain; users do not need a new QR for each incident.

You need a server with Docker Compose, a domain name whose DNS `A` record points to that server, and inbound ports `80` and `443` open. From the project root:

```sh
cp .env.example .env
```

Edit `.env` and set:

- `RESQNET_DOMAIN` to your domain, such as `resqnet.example.org`;
- `RESQNET_PIN` to a unique coordinator password of at least 12 characters;
- `RESQNET_SECRET` to a fresh random value, for example the output of `openssl rand -hex 32`.

Then start the service:

```sh
docker compose up -d --build
```

Once DNS has propagated and the server can receive HTTPS traffic, visit `https://<your-domain>/dashboard` to sign in. The dashboard QR points to `https://<your-domain>` and can be printed once for that service. Anyone with the QR and internet access can open the public ResQNet app; only a person with the coordinator PIN can manage it. Keep `.env` private.

The `resqnet-data` Docker volume keeps incident data when the app container is rebuilt or restarted. This configuration runs one app instance with SQLite; do not scale it to multiple app containers. Back up the volume regularly. To stop the service, run `docker compose down`; this preserves the data volume. To remove all saved incident data too, remove that volume deliberately with `docker compose down -v`.

## Deploy from GitHub without buying a domain

The repository also includes a Render Blueprint (`render.yaml`). Render supplies a stable `onrender.com` address, so no custom domain is needed. Connect the GitHub repository to Render as a Blueprint; it will build the Dockerfile, prompt you for `RESQNET_PIN`, generate `RESQNET_SECRET`, and create a 1 GB disk mounted at `/data` for the SQLite database. The app reads Render's assigned public URL automatically for its QR code.

This uses a paid always-on web service and a persistent disk. Render's free service sleeps after inactivity and loses local database files, so it is suitable for a demo but not for preserving incidents behind a permanently printed QR. See the repository's root README and [Render's current pricing](https://render.com/pricing) before deploying.
