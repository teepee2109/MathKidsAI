#!/usr/bin/env bash
# Full backup to deploy/backups/, keeps 14 days. Cron example:
#   0 2 * * * /var/www/mathkid/MathKids/deploy/backup-db.sh >> /var/log/mathkids-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

file="MathKids_$(date +%Y%m%d_%H%M).bak"
docker exec mathkids-mssql /opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE [MathKids] TO DISK = N'/var/opt/mssql/backups/$file' WITH COMPRESSION, INIT"
find backups -name 'MathKids_*.bak' -mtime +14 -delete
echo "$(date) backup ok: $file"
