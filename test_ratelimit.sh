#!/bin/bash
for i in {1..7}
do
  curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'
  echo ""
done
