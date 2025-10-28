#!/bin/bash

# Load environment variables
export $(grep -v '^#' ../../.env | xargs)

# Run the seed script
node seedWidgets.js
