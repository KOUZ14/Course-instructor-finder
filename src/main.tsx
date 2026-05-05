import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Expected root element with id 'root' to exist.");
}

// Placeholder entrypoint for the Task 1 scaffold. Task 6 replaces this with
// the real React application shell.
createRoot(rootElement).render(
  <main>
    <h1>Course Instructor Finder</h1>
  </main>,
);
