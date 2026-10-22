# ResQNet

ResQNet is an emergency-coordination web application prototype for organizing help requests, volunteer responses, incident updates, and available supplies within a community or campus.

It brings request intake, triage, assignment, status tracking, and coordinator oversight into one shared interface. The project is intended to demonstrate how a local response group can keep work visible and organized; it is not an emergency dispatch service.

## Who uses ResQNet

### People requesting help

A guided SOS form collects the information responders need:

- The location or zone where help is needed
- The type of incident and its urgency
- The number of people involved
- A description of the situation
- Optional supplies that may be needed
- A name and phone number for follow-up

The form reviews the request before submission. After it is sent, the requester can follow its progress: received and waiting, assigned to a volunteer, en route, resolved, or cancelled. The tracker also shows queue position while the request is waiting. If there is immediate danger, call the local emergency number first; the interface highlights 112 for the current project context.

### Volunteers

Volunteers can join with their name, switch between on-duty and off-duty status, and review pending requests ordered by priority. Request cards show relevant details such as urgency, zone, waiting time, description, and requested supplies.

A volunteer can take an available request and then update its progress as they respond. Before setting off, a volunteer can release an assigned request back to the queue. Once a response is under way, the volunteer can mark it en route and resolve it. A volunteer who is off duty can still review the queue but cannot take a request, and a volunteer can have only one active task at a time.

### Coordinators

The coordinator workspace provides a broader view for managing an incident response:

- **Board:** View open and critical request counts, available volunteers, connected clients, and requests grouped by zone. Selecting a zone filters the queue.
- **Priority queue:** Review request details and priority scores, assign requests to volunteers, and manage their status.
- **Automatic allocation:** Process pending requests in priority order and assign them to available volunteers when the required stock is available. Requests that cannot be allocated remain pending and are reported as skipped.
- **Supplies:** Review inventory and update stock levels.
- **Announcements:** Publish notices marked as information, warning, or critical.
- **Insights:** Review totals and charts for requests by type and urgency, resolved and cancelled requests, and average resolution time.
- **Activity and data tools:** Review recent events, load or reset a demonstration scenario, and export incident records as a CSV file.
- **Access sharing:** Display a QR code that helps other users open the same ResQNet instance.

Coordinator actions are behind a sign-in gate. The command center is intended for the authorized coordinator, while the public request, volunteer, and updates views serve the wider group.

## How request priority works

ResQNet uses a transparent, project-defined score to order pending requests:

\[
P = 5U + 2W + 3R
\]

- **U (urgency):** The selected urgency level, from 1 to 5.
- **W (waiting):** One point for each completed five-minute interval, up to 5 points.
- **R (resource criticality):** The highest criticality among the requested supplies; it defaults to 1 when no supplies are requested.

Higher scores appear first. If scores tie, the earlier request is listed first, followed by the lower incident ID. The score is a queue aid only: it is a heuristic, has not been clinically or operationally validated, and does not replace human judgment or professional triage. It does not account for travel distance, volunteer qualifications, or a responder's on-scene assessment.

## Shared updates and information

ResQNet refreshes connected views when requests or coordinator-managed information changes. The updates page brings together coordinator announcements, current supply levels, emergency contacts, and topic-based safety guidance, including guidance for flooding, fire, injuries, and waiting for help.

Public request views hide the requester's name and phone number. The coordinator view contains the information needed to manage incidents, and contact details for an active request are available to its assigned volunteer through the task workflow. This describes the application's role-based views; it is not a claim of independent security certification.

## Request lifecycle and supply handling

A request begins in the pending queue. When a volunteer claims it or a coordinator assigns it, the incident and volunteer statuses are updated and requested supplies are reserved. The volunteer can mark the response en route and resolve the incident, or release an assignment so the request can return to the queue. Coordinators can also cancel eligible requests. Closing an assignment reconciles the volunteer's availability and the reserved stock.

Automatic allocation checks that the request is still pending, a volunteer is available, and the requested stock is sufficient before creating an assignment. If a check fails, the request stays pending rather than being marked as assigned.

## Technology

- **Web interface:** React, TypeScript, Vite, and Tailwind CSS
- **Backend:** Python and FastAPI
- **Data:** SQLite
- **Communication:** REST operations and WebSocket-based live updates
- **Interface features:** Responsive layouts, charts, and zone-based request summaries

## Project scope and safety

ResQNet is an academic software prototype. It has not been evaluated in a live emergency, validated by emergency-response professionals, or certified for dispatch. Its priority weights, safety guidance, and emergency-contact information require review by the organization using it. Availability depends on the running application and its network connection; this is not a mesh network and it does not continue operating if its host or network fails.

ResQNet does not replace emergency services. In an immediate emergency, contact your local emergency number.
