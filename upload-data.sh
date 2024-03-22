#!/bin/bash

# Check if IMPORT_EVENTS_URL is set, if not, use default URL
if [ -z "$IMPORT_EVENTS_URL" ]; then
  IMPORT_EVENTS_URL="http://localhost:4040/api/import-events"
fi

# Use curl to upload the file
curl -X POST \
  "$IMPORT_EVENTS_URL" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./uploads/event_sheet.xlsx"