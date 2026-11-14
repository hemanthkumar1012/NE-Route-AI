# Offline basemap packaging

The prototype uses OpenStreetMap's standard raster tile endpoint for an online demo. Do not bulk-download public tiles. For an offline deployment, provision a permitted regional extract and generate vector/raster tiles under the applicable OpenStreetMap attribution and tile-provider usage policy. Configure a local tile server and update the frontend TileLayer URL. Cache incident drafts and route snapshots separately in IndexedDB; do not treat cached overlays as current conditions.
