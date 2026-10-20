const router = require('express').Router();
const axios = require('axios');
const { asyncHandler } = require('../middleware/errorHandler');

// Unshorten a Google Maps URL and return coordinates + embed URL
router.get('/resolve', asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false });

  try {
    // Follow redirects to get the final URL with coordinates
    const response = await axios.get(url, {
      maxRedirects: 10,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: () => true,
    });

    const finalUrl = response.request?.res?.responseUrl || response.config?.url || url;

    // Extract coordinates from final URL
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const zoomMatch = finalUrl.match(/,(\d+)z/);
      const zoom = zoomMatch ? parseInt(zoomMatch[1]) : 17;
      const bbox = 0.004;
      const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-bbox},${lat-bbox},${lng+bbox},${lat+bbox}&layer=mapnik&marker=${lat},${lng}`;
      return res.json({ success: true, lat, lng, zoom, osmEmbed, finalUrl });
    }

    // Extract place name from URL
    const placeMatch = finalUrl.match(/place\/([^/@?]+)/);
    if (placeMatch) {
      const place = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
      const osmEmbed = `https://www.openstreetmap.org/export/embed.html?query=${encodeURIComponent(place)}&layer=mapnik`;
      return res.json({ success: true, place, osmEmbed, finalUrl });
    }

    res.json({ success: false, finalUrl });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}));

module.exports = router;
