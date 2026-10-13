/** "mesh-drift" to "MeshDrift". Kept apart from the generator so UI code can use it cheaply. */
export function componentName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
