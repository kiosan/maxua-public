#!/bin/bash
# Generate a single fly secrets command from .env file

echo -n "fly secrets set "

# Process each line
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and empty lines
  [[ "$line" =~ ^#.*$ ]] || [ -z "$line" ] && continue
  
  # Extract key and value
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  
  # Properly quote the value and append to command
  echo -n "$key=\"$value\" "
  
done < .env

echo ""  # Add final newline
