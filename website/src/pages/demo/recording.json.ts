import recording from "../../demo/recording.json";

// The recorded run, served as a static file the player fetches when the demo or terminal scrolls into view.
export const GET = () => new Response(JSON.stringify(recording), { headers: { "content-type": "application/json" } });
