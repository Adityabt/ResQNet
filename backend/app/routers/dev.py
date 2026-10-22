from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(include_in_schema=False)

LIVE_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ResQNet Live Test</title>
<style>
  body { margin: 0; padding: 1rem; background: #020617; color: #e2e8f0; font-family: system-ui, sans-serif; }
  h1 { font-size: 1.4rem; margin: 0 0 .75rem; }
  .row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
  .pill { padding: .3rem .8rem; border-radius: 999px; font-weight: 600; font-size: .85rem; background: #7f1d1d; color: #fca5a5; }
  .pill.ok { background: #14532d; color: #86efac; }
  button { padding: .6rem 1rem; border: 0; border-radius: .5rem; background: #dc2626; color: white; font-weight: 600; font-size: 1rem; }
  #last { color: #94a3b8; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: .6rem .8rem; margin-bottom: .5rem; background: #0f172a; border-radius: .5rem; display: flex; justify-content: space-between; gap: .5rem; }
</style>
</head>
<body>
<h1>ResQNet live test</h1>
<div class="row">
  <span id="conn" class="pill">Connecting...</span>
  <span id="devices" class="pill ok">0 devices</span>
  <button id="send">Send test SOS</button>
</div>
<p id="last">Waiting for events...</p>
<ul id="list"></ul>
<script>
  const conn = document.getElementById("conn");
  const devices = document.getElementById("devices");
  const list = document.getElementById("list");
  const last = document.getElementById("last");
  const zones = ["Main Gate", "Academic Block", "Hostel Block A", "Library", "Mess Hall"];
  let lastEventId = null;

  function render(data, clients) {
    devices.textContent = clients + (clients === 1 ? " device" : " devices");
    list.replaceChildren();
    data.incidents.forEach((incident) => {
      const item = document.createElement("li");
      const left = document.createElement("span");
      left.textContent = "#" + incident.id + " " + incident.citizen_name + " - " + incident.zone;
      const right = document.createElement("span");
      right.textContent = incident.status + " | score " + incident.score.total;
      item.append(left, right);
      list.appendChild(item);
    });
    const newest = data.events[0];
    if (newest && newest.id !== lastEventId) {
      if (lastEventId !== null) {
        last.textContent = "New event: " + newest.event_type + " - " + newest.details;
      }
      lastEventId = newest.id;
    }
  }

  function connect() {
    const scheme = location.protocol === "https:" ? "wss://" : "ws://";
    const socket = new WebSocket(scheme + location.host + "/ws");
    socket.onopen = () => {
      conn.textContent = "Live";
      conn.className = "pill ok";
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "snapshot") {
        render(message.data, message.clients);
      }
    };
    socket.onclose = () => {
      conn.textContent = "Reconnecting...";
      conn.className = "pill";
      setTimeout(connect, 1000);
    };
  }

  document.getElementById("send").addEventListener("click", () => {
    fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizen_name: "Test " + Math.floor(Math.random() * 100),
        type: "MEDICAL",
        urgency: 1 + Math.floor(Math.random() * 5),
        zone: zones[Math.floor(Math.random() * zones.length)],
        people_count: 1,
        resources: [],
      }),
    });
  });

  connect();
</script>
</body>
</html>"""


@router.get("/live", response_class=HTMLResponse)
def live_test_page():
    return LIVE_PAGE