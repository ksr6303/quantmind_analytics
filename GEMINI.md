# Project Context: QuantMind Analytics

## Project Overview
**QuantMind Analytics** is a professional quantitative stock analysis dashboard designed to generate trading recommendations using mathematical models and real-time market data. It leverages the Gemini API for AI-driven insights and Recharts for data visualization.

## Key Technologies
- **Frontend Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Visualization:** Recharts
- **AI Integration:** Google GenAI SDK (`@google/genai`)

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)

### Installation
```bash
npm install
```

### Configuration
1.  Create or verify the presence of `.env.local` in the project root.
2.  Add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

### Running the Application
*   **Development Server:**
    ```bash
    npm run dev
    ```
*   **Build for Production:**
    ```bash
    npm run build
    ```
*   **Preview Build:**
    ```bash
    npm run preview
    ```

## Project Structure
The project follows a flattened structure where source files are located directly in the project root rather than a `src/` directory.

-   `App.tsx`: Main application component.
-   `index.tsx`: Application entry point.
-   `components/`: Reusable UI components.
-   `services/`: Business logic and API integration services.
-   `types.ts`: Shared TypeScript type definitions.
-   `constants.ts`: Application constants.

## Development Conventions
-   **Path Aliases:** The project uses `@/*` mapped to `./*` (root) for imports.
-   **TypeScript:** Targeted for `ES2022` with `react-jsx` support.
-   **Styling:** (Note: Specific CSS framework not explicitly identified in top-level files, likely CSS modules or standard CSS based on imports in files).
