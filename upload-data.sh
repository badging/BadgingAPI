#!/bin/bash

curl -X POST \
  http://localhost:4040/api/import-events \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./uploads/event-sheet.xlsx"
