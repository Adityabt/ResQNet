import type { Incident, Resource } from "./types";

export function stockProblems(incident: Incident, resources: Resource[]): string[] {
  const problems: string[] = [];
  for (const item of incident.resources) {
    const resource = resources.find((entry) => entry.id === item.resource_id);
    if (!resource || resource.available < item.quantity) {
      problems.push(item.name);
    }
  }
  return problems;
}