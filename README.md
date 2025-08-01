# Pins

Pins is a web application for marking and visualizing points of interest on a map. It utilizes `maplibre-gl` for interactive mapping, `Alpine.js` for reactive UI elements, and `Tailwind CSS` for styling, all bundled with `Vite`.

## Features

*   **Interactive Map:** Displays a global map powered by MapLibre GL.
*   **Geolocation:** Automatically centers the map on the user's current location.
*   **Mark Mode:** Toggle a "mark mode" to easily add new points (sightings) to the map by clicking.
*   **Heatmap and Circle Layers:** Visualizes marked points using both heatmap and individual circle representations, with dynamic styling based on "magnitude" and zoom level.
*   **Responsive UI:** Built with Tailwind CSS for a modern and adaptable design.

## Technologies Used

*   **MapLibre GL JS:** For interactive and customizable maps.
*   **Alpine.js:** A minimalist JavaScript framework for adding behavior to HTML.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **Vite:** A fast build tool for modern web projects.
*   **TypeScript:** For type-safe JavaScript development.
*   **GeoJSON:** Standard format for representing geographical features.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Node.js (version 20 or higher recommended)
*   npm (comes with Node.js)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mariomenjr/pins.git # Replace with your actual repo URL
    cd pins
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This will start a development server, and you can access the application in your browser, usually at `http://localhost:5173`.

### Building for Production

To build the application for production:

```bash
npm run build
```

This command will compile the TypeScript, bundle the assets, and optimize the code, placing the output in the `dist/` directory.

### Previewing the Production Build

You can preview the production build locally:

```bash
npm run preview
```

## Deployment

This project is configured for easy deployment to Netlify.

### 1. Configure Vite `base` Path

For deployment on Netlify (or most other static hosting services that serve from the root of a domain/subdomain), ensure your `vite.config.ts` has `base: '/'`. This tells Vite to resolve assets relative to the root of the deployed site.

```typescript
// pins/vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '/', // Set to '/' for Netlify deployment
    plugins: [
        tailwindcss(),
    ],
});
```

### 2. Deploy with Netlify

Netlify offers seamless continuous deployment directly from your Git repository:

1.  **Commit and Push:** Ensure all your latest changes, including the `vite.config.ts` update, are pushed to your GitHub repository's `main` branch.
    ```bash
    git add .
    git commit -m "Prepare for Netlify deployment"
    git push origin main
    ```
2.  **Connect to Netlify:**
    *   Go to [netlify.com](https://www.netlify.com/) and sign up or log in.
    *   Click "Add new site" -> "Import an existing project".
    *   Connect your Git provider (e.g., GitHub) and select your `pins` repository.
3.  **Configure Build Settings:** Netlify will usually auto-detect these for Vite, but confirm:
    *   **Branch to deploy:** `main` (or your primary branch)
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist/`
4.  **Deploy Site:** Click the "Deploy site" button. Netlify will then build and deploy your application.

Your site will be live at a Netlify subdomain (e.g., `your-site-name.netlify.app`), and you can later configure a custom domain through the Netlify dashboard.

### 3. Clean Up (Optional)

If you previously set up GitHub Pages, you might want to disable it and remove the GitHub Actions workflow file:

*   **Remove workflow file:** Delete `pins/.github/workflows/deploy.yml` from your repository.
*   **Disable GitHub Pages:** Go to your GitHub repository -> **Settings** -> **Pages** and disable the service.

## Usage

Once deployed (or running locally), the application will display a map.

*   **Locate Me:** The map will attempt to center on your current location.
*   **Toggle Mark Mode:** Click the "Location" icon (marker with a plus) in the top-left menu. When active, your cursor will change to a crosshair.
*   **Add a Sighting:** In mark mode, click anywhere on the map to add a new "sighting" (a point). These points will appear as part of the heatmap and individual circles.

## Contributing

Feel free to open issues or submit pull requests if you have suggestions or find bugs!
