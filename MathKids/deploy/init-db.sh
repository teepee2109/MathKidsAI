#!/usr/bin/env bash
# Creates the MathKids schema on first run. Safe to run again: skips what already exists.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

sqlcmd() {
  docker exec -i mathkids-mssql /opt/mssql-tools18/bin/sqlcmd -C -b -f 65001 \
    -S localhost -U sa -P "$MSSQL_SA_PASSWORD" "$@"
}

echo "Waiting for SQL Server..."
until sqlcmd -Q "SELECT 1" -o /dev/null 2>/dev/null; do sleep 3; done

exists=$(sqlcmd -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'MathKids.mk.AppUser', N'U') IS NULL THEN 0 ELSE 1 END")
if [ "$(echo "$exists" | tr -d '[:space:]')" = "0" ]; then
  echo "Running MathKidsDB.sql..."
  sqlcmd -i /sql/MathKidsDB.sql
else
  echo "Base schema already exists, skipping MathKidsDB.sql."
fi

echo "Running MathKidsPremiumPayment.sql (idempotent)..."
sqlcmd -i /sql/MathKidsPremiumPayment.sql
echo "Database ready. Other tables are created by the backend on startup."
