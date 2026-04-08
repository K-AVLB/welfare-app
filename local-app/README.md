# Local App

`local-app/` is a standalone offline-first version of the service.

## What It Includes

- automatic tag extraction from narrative input
- recommendation scoring with tag match and text match
- all programs view
- organization view
- local static data file

## Generate Data

Run:

```bash
node scripts/export-local-app-data.js
```

This writes:

`local-app/data/local-app-data.js`

## Run

### Easiest

Open [`local-app/index.html`](/Users/minsnail/Desktop/welfare-app/local-app/index.html) directly.

### Safer

Serve the folder locally:

```bash
cd local-app
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Notes

- This version does not use Supabase at runtime.
- Admin functions are intentionally removed.
- Data must be regenerated when `programs`, `organizations`, or `tags` change.
- Use this tool as an internal pilot aid, not as a final decision system.
- Avoid entering personally identifiable information in free-text fields.
- Always re-check the latest eligibility with the linked program detail page or the responsible organization.
