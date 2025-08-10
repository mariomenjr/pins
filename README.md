# Pins

Pins is a web application for marking and visualizing points of interest on a map. It utilizes `maplibre-gl` for interactive mapping, `Alpine.js` for reactive UI elements, and `Tailwind CSS` for styling, all bundled with `Vite`.

## Features

*   **Interactive Map:** Displays a global map powered by MapLibre GL with OpenFreeMap tiles.
*   **User Authentication:** Google OAuth integration with Supabase for secure user management.
*   **Geolocation:** Automatically centers the map on the user's current location.
*   **Mark Mode:** Toggle a "mark mode" to easily add new points by clicking on the map (requires authentication).
*   **Data Persistence:** Points are stored in Supabase database and associated with user accounts.
*   **Heatmap and Circle Layers:** Visualizes marked points using both heatmap and individual circle representations, with dynamic styling based on "magnitude" and zoom level.
*   **Time-based Decay:** Point magnitude decreases over 30 days for temporal relevance.
*   **Geocoding Search:** Location search powered by Nominatim (OpenStreetMap) with map bounds filtering.
*   **Security Features:** Built-in security measures including input sanitization and session validation.
*   **Responsive UI:** Built with Tailwind CSS for a modern and adaptable design.

## Technologies Used

*   **MapLibre GL JS:** For interactive and customizable maps.
*   **Supabase:** Backend-as-a-Service for authentication and data storage.
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
*   Supabase account and project
*   Google OAuth credentials

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

3.  **Environment Setup:**
    Create a `.env` file in the root directory with the following variables:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
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

This project builds to static files and can be deployed to any static hosting service.

### Build for Production

The build process creates optimized static files in the `dist/` directory:

```bash
npm run build
```

### Deployment Options

You can deploy the `dist/` folder to any static hosting service:

*   **Netlify:** Connect your Git repository for automatic deployments
*   **Vercel:** Import your GitHub repository
*   **GitHub Pages:** Use GitHub Actions to deploy from the `dist/` folder
*   **AWS S3 + CloudFront:** Upload the `dist/` folder to S3 and configure CloudFront
*   **Any other static hosting service**

### Configuration Notes

*   Ensure your hosting service serves from the root path (`/`)
*   Configure your hosting service to serve `index.html` for all routes (SPA routing)
*   Make sure HTTPS is enabled for secure authentication

## Usage

Once deployed (or running locally), the application will display a map.

*   **Authentication:** Click the account icon in the top-left to sign in with Google.
*   **Geolocation:** The map will automatically center on your current location.
*   **Search:** Use the search bar to find and navigate to specific locations.
*   **Mark Mode:** After signing in, click the marker icon to toggle mark mode. When active, your cursor will change to a crosshair.
*   **Add Points:** In mark mode, click anywhere on the map to add a new point. These points are saved to your account and will appear as part of the heatmap and individual circles.
*   **View Data:** Points are visualized with both heatmap density and individual markers, with intensity based on recency (newer points are more prominent).

## License

This project uses several third-party services and libraries. If you plan to deploy this application for public use, ensure compliance with the following:

### Required Attributions

*   **OpenFreeMap Tiles:** Map tiles are provided by [OpenFreeMap](https://openfreemap.org/). Please review their [usage policy](https://openfreemap.org/) for attribution requirements.
*   **OpenStreetMap Data:** Geocoding search uses [Nominatim](https://nominatim.openstreetmap.org/) which relies on OpenStreetMap data. You must include [OpenStreetMap attribution](https://www.openstreetmap.org/copyright): "© OpenStreetMap contributors"
*   **MapLibre GL JS:** Licensed under the [3-Clause BSD License](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)

### Service Requirements

*   **Google OAuth:** Ensure your application complies with [Google's OAuth policies](https://developers.google.com/identity/protocols/oauth2) and [Terms of Service](https://developers.google.com/terms/)
*   **Supabase:** Review [Supabase Terms of Service](https://supabase.com/terms) for your usage tier
*   **Nominatim:** Follow the [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) including rate limiting and proper attribution

### Privacy and Data Collection

**Important:** If you deploy this application publicly, you must inform users about data collection:

*   **Google Sign-In Data:** This app collects basic profile information (name, email, profile picture) when users sign in with Google
*   **Location Data:** User-marked points with coordinates are stored in the database
*   **Required Disclosures:** You must provide a Privacy Policy explaining what data is collected, how it's used, and user rights
*   **Google Requirements:** Comply with [Google's User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) for handling user information

### Recommendations

*   Add proper attribution in your application's footer or about section
*   Implement rate limiting for API calls to respect service limits
*   **Create a Privacy Policy and Terms of Service** before public deployment
*   Ensure HTTPS deployment for secure authentication
*   Consider adding a consent banner or privacy notice in your UI

## Contributing

Feel free to open issues or submit pull requests if you have suggestions or find bugs!
