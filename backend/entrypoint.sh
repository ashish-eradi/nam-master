#!/bin/sh
set -e

# Set PYTHONPATH explicitly
export PYTHONPATH=/:$PYTHONPATH

# Execute the main command
exec "$@"